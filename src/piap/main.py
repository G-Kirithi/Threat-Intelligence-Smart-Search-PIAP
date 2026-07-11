"""
Main FastAPI application entry point, mounting sub-routers and bootstrapping pipelines.
"""

import asyncio
from datetime import datetime, timezone
import sys
from typing import List, Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from piap.config import SQLITE_DB_PATH, CHROMA_DIR, GRAPH_PATH, GEMINI_API_KEY
from piap.database import get_db
from piap.storage.sqlite_store import init_db, DBArticle, DBJob
from piap.ingestion.live_rss_feed import RSSFeedConsumer, DEFAULT_FEEDS
from piap.schemas.request import FeedRequest, DocUploadRequest, FeedbackRequest
from piap.schemas.response import HealthResponse
from piap.utils.logging import logger

# Import instantiated singletons and sub-routers
from piap.main_services import (
    sqlite_store,
    chroma_store,
    graph_store,
    graph_service,
    report_service,
    pipeline_manager
)
from piap.api.v3 import rag
from piap.api.v5 import agents

app = FastAPI(
    title="Personalized Intelligence Aggregation Platform (PIAP)",
    description="Enterprise-grade Threat Intelligence, Hybrid RAG, and Cooperative Multi-Agent Reasoning platform.",
    version="1.0.0"
)

# Enable CORS for Vite visual frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active feeds configuration state (starts pre-seeded with real OSINT feeds)
active_rss_feeds = dict(DEFAULT_FEEDS)

# Ingestion task loop reference
background_ingestion_task: Optional[asyncio.Task] = None

async def continuous_feed_ingest_loop():
    """
    Background worker loop that automatically polls RSS feeds every 5 minutes.
    """
    consumer = RSSFeedConsumer()
    logger.info("Background RSS Feed poll worker started.")
    
    while True:
        try:
            logger.info("Periodic background polling initiated across configured RSS feeds.")
            for name, url in list(active_rss_feeds.items()):
                articles = await consumer.fetch_feed_articles(name, url)
                for art in articles:
                    # Check if already ingested in SQLite
                    exists = await sqlite_store.get_article(art["id"])
                    if not exists:
                        # Process through the 3-step coordinated pipeline in background
                        try:
                            await pipeline_manager.process_article(art)
                        except Exception as e:
                            logger.error(f"Failed to process auto-ingested article '{art['title']}': {e}")
            
            logger.info("Periodic background poll cycle completed successfully.")
        except Exception as e:
            logger.error(f"Error in continuous background RSS poll worker: {e}")
            
        # Sleep for 5 minutes
        await asyncio.sleep(300)

@app.on_event("startup")
async def startup_event():
    """
    Pre-start system diagnostics, DB initialization, and background worker start.
    """
    logger.info("Initializing PIAP Platform Services...")
    
    # 1. Initialize DB schema and FTS5 triggers
    await init_db()
    
    # 2. Boot continuous ingestion background worker
    global background_ingestion_task
    background_ingestion_task = asyncio.create_task(continuous_feed_ingest_loop())
    
    logger.info("PIAP Platform Services successfully booted. Standing by for queries.")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Graceful shutdown tasks and resource cleanups.
    """
    logger.info("Shutting down background workers and flushing states...")
    if background_ingestion_task:
        background_ingestion_task.cancel()
        try:
            await background_ingestion_task
        except asyncio.CancelledError:
            pass
    logger.info("PIAP Platform successfully stopped.")


# Mount modular sub-routers
app.include_router(rag.router)
app.include_router(agents.router)


# --- GENERAL PLATFORM API ENDPOINTS ---

@app.get("/api/health", response_model=HealthResponse, tags=["Diagnostics"])
async def platform_health_diagnostics():
    """
    Exposes platform health telemetry and database inventory counts.
    """
    try:
        articles_count = len(await sqlite_store.list_articles(limit=1000))
        reports_count = len(await sqlite_store.list_saved_reports(limit=1000))
        
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database diagnostic check failed: {e}")
        db_status = f"unhealthy: {str(e)}"

    nodes_count = graph_store.graph.number_of_nodes()
    edges_count = graph_store.graph.number_of_edges()

    try:
        collections = [chroma_store.collection.name]
    except Exception:
        collections = []

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "python_version": sys.version,
        "database_status": db_status,
        "knowledge_graph_nodes": nodes_count,
        "knowledge_graph_edges": edges_count,
        "vector_collections": collections
    }

@app.get("/api/feeds", tags=["Ingestion Pipeline"])
async def list_active_feeds():
    """
    Lists the active threat intelligence RSS feeds.
    """
    return [{"name": name, "url": url} for name, url in active_rss_feeds.items()]

@app.post("/api/feeds", tags=["Ingestion Pipeline"])
async def register_new_feed(feed: FeedRequest):
    """
    Registers a new threat intelligence RSS feed.
    """
    if feed.name in active_rss_feeds:
        raise HTTPException(status_code=400, detail="A feed with this name is already registered.")
    
    active_rss_feeds[feed.name] = str(feed.url)
    await sqlite_store.add_audit_log(
        action="register_feed",
        detail=f"Registered custom feed '{feed.name}' to: {feed.url}"
    )
    return {"status": "success", "message": f"Feed '{feed.name}' registered."}

@app.post("/api/feeds/ingest", tags=["Ingestion Pipeline"])
async def trigger_manual_ingest(background_tasks: BackgroundTasks):
    """
    Triggers an immediate manual polling run across all active RSS feeds.
    """
    job_id = f"job-manual-{int(datetime.now(timezone.utc).timestamp())}"
    
    # Store Job record
    db_job = DBJob(
        id=job_id,
        type="rss_ingest",
        status="running",
        progress=10.0,
        log_message="Manual ingestion poll triggered by user."
    )
    await sqlite_store.create_job(db_job)

    # background pipeline function
    async def run_ingestion_pipeline():
        consumer = RSSFeedConsumer()
        total_ingested = 0
        try:
            for i, (name, url) in enumerate(active_rss_feeds.items(), start=1):
                progress = round((i / len(active_rss_feeds)) * 90, 1)
                await sqlite_store.update_job(job_id, "running", progress, f"Polling feed: {name}")
                
                articles = await consumer.fetch_feed_articles(name, url)
                for art in articles:
                    exists = await sqlite_store.get_article(art["id"])
                    if not exists:
                        await pipeline_manager.process_article(art)
                        total_ingested += 1
                        
            await sqlite_store.update_job(
                job_id, "success", 100.0,
                f"Ingestion complete. Processed {len(active_rss_feeds)} feeds, added {total_ingested} articles."
            )
        except Exception as e:
            logger.error(f"Manual ingestion job failed: {e}")
            await sqlite_store.update_job(job_id, "failed", 100.0, f"Failed: {str(e)}")

    background_tasks.add_task(run_ingestion_pipeline)
    return {"job_id": job_id, "status": "running", "message": "Manual ingestion scheduled in the background."}

@app.post("/api/documents/upload", tags=["Ingestion Pipeline"])
async def upload_custom_document(document: DocUploadRequest):
    """
    Allows direct document/report injection into the platform, running it through the coordinated 3-step pipeline.
    """
    import hashlib
    content_hash = hashlib.sha256(document.content.encode("utf-8")).hexdigest()
    article_id = f"doc-{content_hash[:16]}"

    # Verify duplicate
    exists = await sqlite_store.get_article(article_id)
    if exists:
        raise HTTPException(status_code=400, detail="This document content is already fully indexed.")

    article_data = {
        "id": article_id,
        "title": document.title,
        "content": document.content,
        "feed_url": None,
        "source_domain": "manual_upload",
        "published_date": datetime.now(timezone.utc),
        "tags": ["manually_uploaded", "intelligence_doc"]
    }

    try:
        # Run pipeline
        await pipeline_manager.process_article(article_data, clearance=document.clearance_level)
        return {
            "status": "success",
            "document_id": article_id,
            "message": f"Document '{document.title}' fully preprocessed, vector embedded, and relationships extracted."
        }
    except Exception as e:
        logger.error(f"Document manual ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")

@app.get("/api/articles", tags=["Analytical Browser"])
async def browse_ingested_articles(limit: int = 50, offset: int = 0):
    """
    Lists ingested raw articles and threat documents.
    """
    articles = await sqlite_store.list_articles(limit=limit, offset=offset)
    return [{
        "id": a.id,
        "title": a.title,
        "feed_url": a.feed_url,
        "source_domain": a.source_domain,
        "published_date": a.published_date.isoformat() if a.published_date else None,
        "ingestion_status": a.ingestion_status,
        "clearance_level": a.clearance_level,
        "tags": a.tags.split(",") if a.tags else [],
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in articles]

@app.get("/api/reports", tags=["Analytical Browser"])
async def browse_synthesis_reports(limit: int = 50, offset: int = 0):
    """
    Lists synthesized intelligence reports.
    """
    return await report_service.list_saved_reports(limit=limit, offset=offset)

@app.get("/api/reports/{report_id}", tags=["Analytical Browser"])
async def get_report_details(report_id: str):
    """
    Retrieves full details of a specific intelligence report, including findings and contradictions.
    """
    report = await report_service.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report

@app.post("/api/reports/{report_id}/feedback", tags=["Analytical Browser"])
async def submit_analyst_evaluation(report_id: str, request_payload: FeedbackRequest):
    """
    Submits user/analyst review, rating, and feedback regarding the quality of a generated report.
    """
    try:
        feedback_id = await report_service.submit_feedback(
            report_id=report_id,
            rating=request_payload.rating,
            comments=request_payload.comments
        )
        return {"status": "success", "feedback_id": feedback_id, "message": "Analyst evaluation submitted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {str(e)}")

@app.get("/api/graph", tags=["Knowledge Graph Browser"])
async def get_interactive_graph_data():
    """
    Returns the complete NetworkX graph formatted for visual frontend graphing canvases.
    """
    return graph_service.get_full_graph_data()

@app.get("/api/jobs", tags=["Diagnostics"])
async def list_recent_jobs(limit: int = 20):
    """
    Exposes a trace log of current/completed pipeline background jobs.
    """
    jobs = await sqlite_store.list_jobs(limit=limit)
    return [{
        "id": j.id,
        "type": j.type,
        "status": j.status,
        "progress": j.progress,
        "log_message": j.log_message,
        "started_at": j.started_at.isoformat() if j.started_at else None,
        "completed_at": j.completed_at.isoformat() if j.completed_at else None
    } for j in jobs]

@app.get("/api/audit-logs", tags=["Diagnostics"])
async def list_platform_audit_logs(limit: int = 50):
    """
    Lists system security and operational action audit records.
    """
    logs = await sqlite_store.list_audit_logs(limit=limit)
    return [{
        "id": l.id,
        "action": l.action,
        "user_id": l.user_id,
        "detail": l.detail,
        "timestamp": l.timestamp.isoformat() if l.timestamp else None
    } for l in logs]

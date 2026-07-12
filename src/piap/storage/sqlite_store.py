"""
SQLite storage repository for PIAP, managing relational data and FTS5 search.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    select,
    update,
    delete,
    text
)
from sqlalchemy.orm import declarative_base, relationship
from piap.database import AsyncSessionLocal, init_fts
from piap.utils.logging import logger

Base = declarative_base()

class DBArticle(Base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    feed_url = Column(String, nullable=True)
    source_domain = Column(String, nullable=True)
    published_date = Column(DateTime, nullable=True)
    ingestion_status = Column(String, default="processing")  # processing, ready, failed
    clearance_level = Column(String, default="unclassified")
    tags = Column(String, default="")  # Comma separated
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    chunks = relationship("DBChunk", back_populates="article", cascade="all, delete-orphan")

class DBChunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True)  # generated ID (e.g., "doc_id-chunk_idx")
    article_id = Column(String, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    overlap_tokens = Column(Integer, nullable=False)
    clearance_level = Column(String, default="unclassified")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    article = relationship("DBArticle", back_populates="chunks")

class DBReport(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    findings = Column(Text, nullable=False)  # JSON-serialized list/dict
    contradictions = Column(Text, nullable=True)  # JSON-serialized list/dict
    confidence = Column(Float, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String, default="pending")  # pending, reviewed
    reviewer_feedback = Column(Text, nullable=True)

    feedbacks = relationship("DBFeedback", back_populates="report", cascade="all, delete-orphan")

class DBFeedback(Base):
    __tablename__ = "feedbacks"

    id = Column(String, primary_key=True)
    report_id = Column(String, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)  # e.g., 1 to 5
    comments = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    report = relationship("DBReport", back_populates="feedbacks")

class DBJob(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)  # e.g., "rss_ingest", "agent_run"
    status = Column(String, default="running")  # running, success, failed
    progress = Column(Float, default=0.0)  # 0.0 to 100.0
    log_message = Column(Text, default="")
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

class DBAuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String, nullable=False)
    user_id = Column(String, default="system")
    detail = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


async def init_db() -> None:
    """
    Initializes the database schema and triggers.
    """
    from piap.database import engine
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async with AsyncSessionLocal() as session:
            await init_fts(session)
            
        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database tables: {e}", exc_info=True)


class SQLiteStore:
    """
    Repository class providing transactional access to SQLite.
    """
    def __init__(self):
        pass

    async def add_article(self, article: DBArticle) -> None:
        async with AsyncSessionLocal() as session:
            try:
                session.add(article)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error adding article: {e}")
                raise e

    async def get_article(self, article_id: str) -> Optional[DBArticle]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBArticle).where(DBArticle.id == article_id)
            )
            return result.scalar_one_or_none()

    async def list_articles(self, limit: int = 50, offset: int = 0) -> List[DBArticle]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBArticle).order_by(DBArticle.created_at.desc()).limit(limit).offset(offset)
            )
            return list(result.scalars().all())

    async def update_article_status(self, article_id: str, status: str) -> None:
        async with AsyncSessionLocal() as session:
            try:
                await session.execute(
                    update(DBArticle)
                    .where(DBArticle.id == article_id)
                    .values(ingestion_status=status)
                )
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error updating article status: {e}")
                raise e

    async def add_chunks(self, chunks: List[DBChunk]) -> None:
        async with AsyncSessionLocal() as session:
            try:
                session.add_all(chunks)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error adding chunks: {e}")
                raise e

    async def get_chunks_for_article(self, article_id: str) -> List[DBChunk]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBChunk).where(DBChunk.article_id == article_id).order_by(DBChunk.chunk_index.asc())
            )
            return list(result.scalars().all())

    async def add_report(self, report: DBReport) -> None:
        async with AsyncSessionLocal() as session:
            try:
                session.add(report)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error adding report: {e}")
                raise e

    async def list_reports(self, limit: int = 50, offset: int = 0) -> List[DBReport]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBReport).order_by(DBReport.created_at.desc()).limit(limit).offset(offset)
            )
            return list(result.scalars().all())

    async def get_report(self, report_id: str) -> Optional[DBReport]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBReport).where(DBReport.id == report_id)
            )
            return result.scalar_one_or_none()

    async def update_report_feedback(self, report_id: str, status: str, feedback_text: str) -> None:
        async with AsyncSessionLocal() as session:
            try:
                await session.execute(
                    update(DBReport)
                    .where(DBReport.id == report_id)
                    .values(status=status, reviewer_feedback=feedback_text)
                )
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error updating report feedback: {e}")
                raise e

    async def add_feedback(self, feedback: DBFeedback) -> None:
        async with AsyncSessionLocal() as session:
            try:
                session.add(feedback)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error adding feedback: {e}")
                raise e

    async def create_job(self, job: DBJob) -> None:
        async with AsyncSessionLocal() as session:
            try:
                session.add(job)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error creating job: {e}")
                raise e

    async def update_job(self, job_id: str, status: str, progress: float, log_message: str) -> None:
        async with AsyncSessionLocal() as session:
            try:
                await session.execute(
                    update(DBJob)
                    .where(DBJob.id == job_id)
                    .values(
                        status=status,
                        progress=progress,
                        log_message=log_message,
                        completed_at=datetime.now(timezone.utc) if status in ["success", "failed"] else None
                    )
                )
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error updating job: {e}")
                raise e

    async def list_jobs(self, limit: int = 50) -> List[DBJob]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBJob).order_by(DBJob.started_at.desc()).limit(limit)
            )
            return list(result.scalars().all())

    async def add_audit_log(self, action: str, detail: str, user_id: str = "system") -> None:
        async with AsyncSessionLocal() as session:
            try:
                audit = DBAuditLog(action=action, detail=detail, user_id=user_id)
                session.add(audit)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Error creating audit log: {e}")

    async def list_audit_logs(self, limit: int = 100) -> List[DBAuditLog]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(DBAuditLog).order_by(DBAuditLog.timestamp.desc()).limit(limit)
            )
            return list(result.scalars().all())

    async def fts_lexical_search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Executes a BM25 lexical search using SQLite FTS5 on the chunks_fts virtual table,
        joining against the source chunks and articles tables to get rich metadata.
        """
        async with AsyncSessionLocal() as session:
            # SQL injection safe query parameterization
            sql = text(
                "SELECT c.id, c.article_id, c.chunk_index, c.content, c.clearance_level, "
                "       a.title as article_title, a.source_domain as article_source "
                "FROM chunks_fts f "
                "JOIN chunks c ON c.id = f.chunk_id "
                "JOIN articles a ON a.id = c.article_id "
                "WHERE chunks_fts MATCH :query_str "
                "LIMIT :limit_count;"
            )
            try:
                # SQLite FTS syntax escaping
                sanitized_query = query.replace('"', '').replace("'", "")
                # Simple boolean match if multiple words
                words = [w for w in sanitized_query.split() if w.isalnum()]
                if not words:
                    return []
                match_query = " OR ".join(words)

                result = await session.execute(
                    sql,
                    {"query_str": match_query, "limit_count": limit}
                )
                rows = result.fetchall()
                
                results = []
                for row in rows:
                    results.append({
                        "chunk_id": row[0],
                        "document_id": row[1],
                        "index": row[2],
                        "content": row[3],
                        "clearance": row[4],
                        "source": row[6],
                        "title": row[5]
                    })
                return results
            except Exception as e:
                logger.error(f"SQLite FTS search failed: {e}")
                return []

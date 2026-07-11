"""
FastAPI Router for v3 Hybrid RAG operations, supporting streaming and structured report responses.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from piap.schemas.request import QueryRequest
from piap.schemas.response import QueryResponse
from piap.utils.security import sanitize_search_query, detect_prompt_injection
from piap.utils.logging import logger

# We will import the singleton services initialized in main
from piap.main_services import (
    sqlite_store,
    retrieval_service,
    synthesis_service,
    report_service
)

router = APIRouter(prefix="/v3", tags=["Hybrid RAG"])

@router.post("/query", response_model=QueryResponse, summary="Execute a hybrid semantic/lexical analytical query")
async def query_intelligence(request_payload: QueryRequest, stream: bool = False):
    """
    Submits a query to search local threat intelligence.
    Supports either standard structured JSON response or a Server-Sent Events (SSE) token stream.
    """
    query_str = request_payload.query
    clearance = request_payload.clearance_level

    # 1. Security Gate: Input validation and Sanitization
    if detect_prompt_injection(query_str):
        raise HTTPException(status_code=400, detail="Security assertion: Potential prompt injection attempt blocked.")
    
    sanitized_query = sanitize_search_query(query_str)
    if not sanitized_query:
        raise HTTPException(status_code=400, detail="Invalid search query content.")

    logger.info(f"API [v3/query] Received analytical task. Query: '{sanitized_query}' (Stream={stream}, Clearance={clearance})")

    # 2. Audit log register
    await sqlite_store.add_audit_log(
        action="api_rag_query",
        detail=f"User ran RAG search (Stream={stream}, Clearance={clearance}): '{sanitized_query[:100]}'"
    )

    try:
        # Retrieve context chunks from Hybrid Search (Dense Chroma + Lexical SQLite FTS5 + RRF)
        retrieved_chunks = await retrieval_service.hybrid_retrieve(
            query=sanitized_query,
            clearance_level=clearance,
            limit=5
        )

        if stream:
            # Server-Sent Events Token Streaming
            generator = synthesis_service.stream_rag_response(
                query=sanitized_query,
                chunks=retrieved_chunks
            )
            return StreamingResponse(generator, media_type="text/event-stream")
        else:
            # Structured Intelligence Report JSON Response
            report_data = await synthesis_service.generate_structured_report(
                query=sanitized_query,
                chunks=retrieved_chunks
            )
            
            # Save synthesized report in SQLite database
            await report_service.save_report(report_data)

            # Reformat to match the exact QueryResponse Pydantic schema
            response_chunks = []
            for c in retrieved_chunks:
                response_chunks.append({
                    "chunk_id": c["chunk_id"],
                    "document_id": c["document_id"],
                    "content": c["content"],
                    "clearance": c["clearance"],
                    "source": c["source"],
                    "title": c["title"],
                    "rrf_score": c["rrf_score"]
                })

            return {
                "id": report_data["id"],
                "title": report_data["title"],
                "summary": report_data["summary"],
                "findings": report_data["findings"],
                "contradictions": report_data["contradictions"],
                "confidence": report_data["confidence"],
                "latency_ms": report_data["latency_ms"],
                "sources": report_data["sources"],
                "chunks": response_chunks
            }

    except Exception as e:
        logger.error(f"API query_intelligence endpoint failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal pipeline synthesis failed: {str(e)}")

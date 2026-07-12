"""
Hybrid Retrieval service combining dense semantic search and lexical FTS5 search with RRF.
"""

from typing import Any, Dict, List, Optional
from piap.storage.sqlite_store import SQLiteStore
from piap.storage.chroma_store import ChromaStore
from piap.services.embedding_service import EmbeddingService
from piap.utils.logging import logger
import asyncio

class RetrievalService:
    """
    Orchestrates dense semantic search and SQLite FTS5 lexical search,
    combining results using Reciprocal Rank Fusion (RRF).
    """
    def __init__(
        self,
        sqlite_store: SQLiteStore,
        chroma_store: ChromaStore,
        embedding_service: EmbeddingService
    ):
        self.sqlite = sqlite_store
        self.chroma = chroma_store
        self.embedding = embedding_service

    async def hybrid_retrieve(
        self,
        query: str,
        clearance_level: str = "unclassified",
        limit: int = 10,
        rrf_k: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Retrieves the most relevant document chunks using Reciprocal Rank Fusion (RRF).
        """
        if not query or not query.strip():
            return []

        logger.info(f"Executing hybrid retrieval for query: '{query}' (Clearance: {clearance_level})")

        # 1. Dense Semantic Search
        dense_results = []
        lexical_results = []
        try:
            lexical_task = asyncio.create_task(self.sqlite.fts_lexical_search(
                query=query,
                limit=limit * 2
            ))
            embedding_task = asyncio.create_task(self.embedding.get_embedding(query))

            lexical_results = await lexical_task
            logger.info(f"Lexical FTS5 retrieval fetched {len(lexical_results)} candidate chunks.")

            try:
                query_vector = await embedding_task
                dense_results = self.chroma.similarity_search(
                    query_vector=query_vector,
                    limit=limit * 2,  # Fetch more to allow clean merging
                    clearance_level=clearance_level
                )
                logger.info(f"Dense semantic retrieval fetched {len(dense_results)} candidate chunks.")
            except Exception as e:
                logger.error(f"Dense semantic search failed during hybrid retrieve: {e}")
        except Exception as e:
            logger.error(f"Hybrid retrieval failed: {e}")

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF Score = Sum(1 / (k + rank))
        rrf_scores: Dict[str, float] = {}
        chunk_lookup: Dict[str, Dict[str, Any]] = {}

        # Parse Dense Results
        for rank, item in enumerate(dense_results, start=1):
            chunk_id = item["chunk_id"]
            if chunk_id not in chunk_lookup:
                # Format to match FTS schema format
                chunk_lookup[chunk_id] = {
                    "chunk_id": chunk_id,
                    "document_id": item["metadata"].get("document_id"),
                    "content": item["content"],
                    "clearance": item["metadata"].get("clearance", "unclassified"),
                    "source": item["metadata"].get("source", "unknown"),
                    "title": item["metadata"].get("title", "Reference"),
                    "dense_rank": rank,
                    "lexical_rank": None
                }
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + (1.0 / (rrf_k + rank))

        # Parse Lexical Results
        for rank, item in enumerate(lexical_results, start=1):
            chunk_id = item["chunk_id"]
            if chunk_id not in chunk_lookup:
                chunk_lookup[chunk_id] = {
                    "chunk_id": chunk_id,
                    "document_id": item["document_id"],
                    "content": item["content"],
                    "clearance": item["clearance"],
                    "source": item["source"],
                    "title": item["title"],
                    "dense_rank": None,
                    "lexical_rank": rank
                }
            else:
                chunk_lookup[chunk_id]["lexical_rank"] = rank
            rrf_scores[chunk_id] = rrf_scores.get(chunk_id, 0.0) + (1.0 / (rrf_k + rank))

        # Sort based on highest RRF score
        sorted_chunk_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

        # Build final unified compressed context
        fused_results = []
        for cid in sorted_chunk_ids[:limit]:
            chunk_data = chunk_lookup[cid]
            chunk_data["rrf_score"] = rrf_scores[cid]
            # Verify clearance level access as a secondary security assertion
            if self._verify_clearance(chunk_data["clearance"], clearance_level):
                fused_results.append(chunk_data)

        logger.info(f"Reciprocal Rank Fusion successfully merged and compressed candidates to top {len(fused_results)} chunks.")
        return fused_results

    def _verify_clearance(self, doc_clearance: str, user_clearance: str) -> bool:
        """
        Helper method to assert hierarchical security clearance permissions.
        """
        levels = {"unclassified": 0, "confidential": 1, "secret": 2}
        doc_val = levels.get(doc_clearance.lower(), 0)
        user_val = levels.get(user_clearance.lower(), 0)
        return user_val >= doc_val

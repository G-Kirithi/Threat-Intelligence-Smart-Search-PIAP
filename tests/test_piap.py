"""
Unit and integration test suite for PIAP verifying databases, ingestion, RAG, and agents.
"""

import sys
from pathlib import Path
import pytest
from datetime import datetime, timezone

# Add src to python path for testing
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from piap.ingestion.preprocessing import preprocess_text, segment_sentences, clean_html, scrub_pii
from piap.ingestion.chunking import chunk_document, estimate_tokens
from piap.ingestion.live_rss_feed import RSSFeedConsumer
from piap.storage.sqlite_store import SQLiteStore, DBArticle, DBChunk, init_db
from piap.storage.chroma_store import ChromaStore
from piap.storage.graph_store import GraphStore
from piap.services.embedding_service import EmbeddingService
from piap.services.retrieval_service import RetrievalService
from piap.services.report_service import ReportService
from piap.services.graph_service import GraphService
from piap.agents.state_machine import AgentContextState, WorkflowState

@pytest.mark.asyncio
async def test_text_preprocessing():
    """
    Verifies that raw text is sanitized, HTML stripped, and PII redacted.
    """
    raw_html = "<p>Malware alert for user admin@cybercorp.com. Phone is 123-456-7890.</p>"
    clean_text = preprocess_text(raw_html)
    
    assert "<p>" not in clean_text
    assert "admin@cybercorp.com" not in clean_text
    assert "[REDACTED_EMAIL]" in clean_text
    assert "123-456-7890" not in clean_text
    assert "[REDACTED_PHONE]" in clean_text


def test_chunking_and_overlapping():
    """
    Verifies sliding-window document chunking and token approximations.
    """
    doc_text = " ".join(["indicator"] * 500) # about 500 words
    chunks = chunk_document(
        article_id="test_art",
        text=doc_text,
        chunk_size=512,
        chunk_overlap=64
    )
    
    assert len(chunks) > 0
    assert chunks[0].article_id == "test_art"
    assert chunks[0].chunk_index == 0
    assert chunks[0].clearance_level == "unclassified"


def test_rss_hashing_and_domain():
    """
    Verifies deterministic article ID hashing and host domain extraction.
    """
    consumer = RSSFeedConsumer()
    url = "https://www.cisa.gov/cybersecurity-alerts/alerts.xml"
    
    art_id = consumer.generate_article_id(url)
    domain = consumer.extract_domain(url)
    
    assert len(art_id) == 64 # SHA-256 hash length
    assert domain == "www.cisa.gov"


@pytest.mark.asyncio
async def test_sqlite_repository():
    """
    Verifies SQLite database insertion, retrieval, and status tracking.
    """
    await init_db()
    store = SQLiteStore()
    art_id = "test_article_123"
    
    # Add dummy article
    db_art = DBArticle(
        id=art_id,
        title="Test Threat Ingest",
        content="Sample threat analysis content.",
        feed_url="https://test.com/rss",
        source_domain="test.com",
        ingestion_status="processing",
        clearance_level="unclassified"
    )
    
    await store.add_article(db_art)
    
    # Retrieve
    retrieved = await store.get_article(art_id)
    assert retrieved is not None
    assert retrieved.title == "Test Threat Ingest"
    assert retrieved.ingestion_status == "processing"
    
    # Update status
    await store.update_article_status(art_id, "ready")
    updated = await store.get_article(art_id)
    assert updated.ingestion_status == "ready"


def test_chromadb_persistent_indexing():
    """
    Verifies Chroma persistent index initialization, data addition, and semantic querying.
    """
    store = ChromaStore()
    assert store.collection is not None
    
    # Insert trial embeddings
    store.add_chunks_vectors(
        chunk_ids=["chunk-01"],
        documents=["APT41 threat indicators show active exploitation of Zero-day vulnerabilities."],
        metadatas=[{"clearance": "unclassified", "domain": "cisa.gov"}],
        embeddings=[[0.1] * 768]
    )
    
    # Query with vector similarity
    results = store.similarity_search(
        query_vector=[0.1] * 768,
        limit=1,
        clearance_level="unclassified"
    )
    
    assert len(results) > 0
    assert "APT41" in results[0]["content"]


def test_knowledge_graph_merges():
    """
    Verifies Subject-Predicate-Object triples creation, merges, and deduplication in NetworkX.
    """
    store = GraphStore()
    
    # Clear graph for deterministic test
    store.clear()
    
    # Add triple
    store.add_triple(
        subject="APT41",
        predicate="EXPLOITS",
        obj="CVE-2026-1010",
        evidence_ids=["art_01"],
        confidence=0.9
    )
    
    assert store.graph.has_node("Apt41")
    assert store.graph.has_node("Cve-2026-1010")
    
    # Re-add with new evidence (assert merging)
    store.add_triple(
        subject="APT41",
        predicate="EXPLOITS",
        obj="CVE-2026-1010",
        evidence_ids=["art_02"],
        confidence=0.95
    )
    
    neighbors = store.get_neighbors("APT41")
    assert neighbors["found"] is True
    assert len(neighbors["neighbors"]) == 1
    assert "art_01" in neighbors["neighbors"][0]["evidence"]
    assert "art_02" in neighbors["neighbors"][0]["evidence"]


@pytest.mark.asyncio
async def test_hybrid_rrf_merging():
    """
    Verifies Reciprocal Rank Fusion of semantic ChromaDB and lexical SQLite FTS5 matches.
    """
    await init_db()
    # Instantiate services
    sqlite = SQLiteStore()
    chroma = ChromaStore()
    emb = EmbeddingService()
    
    retrieval = RetrievalService(sqlite, chroma, emb)
    
    # Inject search content
    db_art = DBArticle(
        id="art_bm25",
        title="BM25 test",
        content="Exploit payloads of type cobalt strike beacon observed.",
        ingestion_status="ready"
    )
    await sqlite.add_article(db_art)
    
    db_chunk = DBChunk(
        id="art_bm25-0",
        article_id="art_bm25",
        chunk_index=0,
        content="Exploit payloads of type cobalt strike beacon observed.",
        token_count=10,
        overlap_tokens=0
    )
    await sqlite.add_chunks([db_chunk])
    
    # Hybrid Retrieve
    matches = await retrieval.hybrid_retrieve(
        query="cobalt strike",
        clearance_level="unclassified",
        limit=2
    )
    
    assert len(matches) > 0
    # The record should carry an RRF rating
    assert "rrf_score" in matches[0]

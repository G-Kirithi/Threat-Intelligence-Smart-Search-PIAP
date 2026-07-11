"""
Instantiates global singletons of repositories, services, and multi-agent systems for PIAP.
"""

from piap.storage.sqlite_store import SQLiteStore
from piap.storage.chroma_store import ChromaStore
from piap.storage.graph_store import GraphStore
from piap.services.embedding_service import EmbeddingService
from piap.services.retrieval_service import RetrievalService
from piap.services.graph_service import GraphService
from piap.services.synthesis_service import SynthesisService
from piap.services.report_service import ReportService
from piap.storage.pipeline_manager import PipelineManager
from piap.agents.coordinator import CoordinatorAgent

# Core Storage Repositories
sqlite_store = SQLiteStore()
chroma_store = ChromaStore()
graph_store = GraphStore()

# Core Services
embedding_service = EmbeddingService()
retrieval_service = RetrievalService(
    sqlite_store=sqlite_store,
    chroma_store=chroma_store,
    embedding_service=embedding_service
)
graph_service = GraphService(graph_store=graph_store)
synthesis_service = SynthesisService()
report_service = ReportService(sqlite_store=sqlite_store)

# Orchestrated pipelines
pipeline_manager = PipelineManager(
    sqlite_store=sqlite_store,
    chroma_store=chroma_store,
    graph_store=graph_store,
    embedding_service=embedding_service
)

# Multi-Agent Systems
coordinator_agent = CoordinatorAgent(
    sqlite_store=sqlite_store,
    retrieval_service=retrieval_service,
    graph_service=graph_service,
    synthesis_service=synthesis_service,
    report_service=report_service
)

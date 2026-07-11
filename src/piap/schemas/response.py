"""
Pydantic schemas for API Responses, implementing strict typing and JSON formatting.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class ChunkMatch(BaseModel):
    chunk_id: str
    document_id: str
    content: str
    clearance: str
    source: str
    title: str
    rrf_score: float

class QueryResponse(BaseModel):
    """
    Structured response for standard non-streaming Hybrid RAG queries.
    """
    id: str = Field(..., description="Unique ID generated for this analytical session")
    title: str = Field(..., description="Synthesized title of the analytical report")
    summary: str = Field(..., description="High-level executive answer/synthesis")
    findings: List[Dict[str, Any]] = Field(default_factory=list, description="Extracted factual claims with citation lists")
    contradictions: List[Dict[str, Any]] = Field(default_factory=list, description="Identified factual disagreements")
    confidence: float = Field(..., description="Assembled confidence score, 0.0 to 1.0")
    latency_ms: float = Field(..., description="Total execution latency in milliseconds")
    sources: List[str] = Field(default_factory=list, description="List of unique source URLs/domains retrieved")
    chunks: List[ChunkMatch] = Field(default_factory=list, description="List of citation document chunks")

class AgentLogItem(BaseModel):
    timestamp: str
    agent_name: str
    message: str
    state_reached: str

class WorkflowResponse(BaseModel):
    """
    Unified response detailing the full multi-agent task execution results.
    """
    task_id: str
    query: str
    clearance_level: str
    status: str
    logs: List[AgentLogItem]
    final_report: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    """
    Standard system health check telemetry format.
    """
    status: str = "ok"
    timestamp: str
    python_version: str
    database_status: str
    knowledge_graph_nodes: int
    knowledge_graph_edges: int
    vector_collections: List[str]

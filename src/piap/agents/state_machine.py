"""
State machine representation and execution state for the PIAP multi-agent framework.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class WorkflowState(str, Enum):
    IDLE = "idle"
    COORDINATING = "coordinating"
    RESEARCHING = "researching"
    RED_TEAM_AUDITING = "red_team_auditing"
    REPORT_GENERATION = "report_generation"
    HUMAN_REVIEW = "human_review"
    COMPLETED = "completed"
    FAILED = "failed"

class AgentLog(BaseModel):
    """
    Unified log structure for monitoring step-by-step multi-agent work.
    """
    timestamp: str
    agent_name: str
    message: str
    state_reached: str

class AgentContextState(BaseModel):
    """
    Encapsulates all transient state carried across our Multi-Agent Workflow.
    """
    task_id: str
    query: str
    clearance_level: str = "unclassified"
    current_state: WorkflowState = WorkflowState.IDLE
    
    # Accumulated context
    retrieved_chunks: List[Dict[str, Any]] = Field(default_factory=list)
    graph_context: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Agent outputs
    research_summary: Optional[str] = None
    red_team_critique: Optional[str] = None
    red_team_contradictions: List[Dict[str, Any]] = Field(default_factory=list)
    hallucination_risks: List[str] = Field(default_factory=list)
    additional_retrieval_needed: bool = False
    
    final_report: Optional[Dict[str, Any]] = None
    
    logs: List[AgentLog] = Field(default_factory=list)

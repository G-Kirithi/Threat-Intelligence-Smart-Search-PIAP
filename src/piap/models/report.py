"""
Pydantic domain models for Intelligence Reports and Feedback.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class Finding(BaseModel):
    claim: str = Field(..., description="The synthesized intelligence claim or statement")
    evidence: List[str] = Field(..., description="List of source chunk/citation IDs supporting this claim")

class Contradiction(BaseModel):
    conflict: str = Field(..., description="Description of the conflicting intelligence")
    sources: List[str] = Field(..., description="Sources or chunk IDs involved in the contradiction")

class Report(BaseModel):
    """
    Standard domain model representing a completed structured intelligence report.
    """
    id: str = Field(..., description="Unique report ID")
    title: str = Field(..., description="Descriptive title of the intelligence report")
    summary: str = Field(..., description="High-level executive summary of the synthesized intelligence")
    findings: List[Finding] = Field(..., description="List of claims and evidence references")
    contradictions: List[Contradiction] = Field(default_factory=list, description="Contradictions or conflicts identified")
    confidence: float = Field(..., description="Confidence score from 0.0 to 1.0 based on evidence")
    created_at: Optional[datetime] = Field(None, description="Report generation timestamp")
    status: str = Field("pending", description="Report review status (pending, reviewed)")
    reviewer_feedback: Optional[str] = Field(None, description="Feedback from an analyst review")

class Feedback(BaseModel):
    """
    Domain model representing analyst feedback on an intelligence report.
    """
    id: str = Field(..., description="Unique feedback ID")
    report_id: str = Field(..., description="ID of the report being evaluated")
    rating: int = Field(..., description="Utility rating of the report, 1 to 5")
    comments: Optional[str] = Field(None, description="Constructive comments from the reviewer")
    timestamp: Optional[datetime] = Field(None, description="Feedback submission time")

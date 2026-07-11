"""
Pydantic schemas for API Requests, implementing strict validation.
"""

from typing import Optional
from pydantic import BaseModel, Field, HttpUrl, field_validator

class QueryRequest(BaseModel):
    """
    Validation schema for Hybrid RAG queries.
    """
    query: str = Field(..., min_length=3, max_length=500, description="The search or analytical intelligence query")
    clearance_level: str = Field("unclassified", description="Security clearance: unclassified, confidential, secret")

    @field_validator("clearance_level")
    @classmethod
    def validate_clearance(cls, value: str) -> str:
        allowed = ["unclassified", "confidential", "secret"]
        if value.lower() not in allowed:
            raise ValueError(f"Clearance level must be one of: {', '.join(allowed)}")
        return value.lower()

class FeedRequest(BaseModel):
    """
    Validation schema for registering a custom RSS feed.
    """
    name: str = Field(..., min_length=2, max_length=100, description="Name or identifier of the RSS feed")
    url: str = Field(..., description="HTTPS URL of the RSS feed")

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        if not value.startswith("http://") and not value.startswith("https://"):
            raise ValueError("Feed URL must use HTTP or HTTPS protocol")
        return value

class DocUploadRequest(BaseModel):
    """
    Validation schema for direct document injections.
    """
    title: str = Field(..., min_length=3, max_length=200, description="Title of the uploaded report or document")
    content: str = Field(..., min_length=10, max_length=50000, description="Full text content of the document")
    clearance_level: str = Field("unclassified", description="Security clearance: unclassified, confidential, secret")

    @field_validator("clearance_level")
    @classmethod
    def validate_clearance(cls, value: str) -> str:
        allowed = ["unclassified", "confidential", "secret"]
        if value.lower() not in allowed:
            raise ValueError(f"Clearance level must be one of: {', '.join(allowed)}")
        return value.lower()

class FeedbackRequest(BaseModel):
    """
    Validation schema for user/analyst report evaluations.
    """
    rating: int = Field(..., ge=1, le=5, description="Utility rating of the report, from 1 to 5")
    comments: Optional[str] = Field(None, max_length=2000, description="Detailed critique comments from the analyst")

"""
Pydantic domain model for an Ingested Article.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class Article(BaseModel):
    """
    Standard domain model representing an article within the PIAP ecosystem.
    """
    id: str = Field(..., description="Unique hash or ID of the article")
    title: str = Field(..., description="Title of the article")
    content: str = Field(..., description="Full text/content of the article")
    feed_url: Optional[str] = Field(None, description="Source RSS feed URL")
    source_domain: Optional[str] = Field(None, description="Extracted domain of the source")
    published_date: Optional[datetime] = Field(None, description="Publication timestamp")
    ingestion_status: str = Field("processing", description="Processing, ready, or failed")
    clearance_level: str = Field("unclassified", description="Security clearance level of the article")
    tags: List[str] = Field(default_factory=list, description="Extracted topic tags")
    created_at: Optional[datetime] = Field(None, description="System creation timestamp")

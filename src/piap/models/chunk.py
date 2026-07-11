"""
Pydantic domain model for a Document Chunk.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class Chunk(BaseModel):
    """
    Standard domain model representing a segmented text chunk from an article.
    """
    id: str = Field(..., description="Unique generated chunk ID (e.g., article_id-index)")
    article_id: str = Field(..., description="Foreign key reference to parent article")
    chunk_index: int = Field(..., description="Order position of chunk in the parent article")
    content: str = Field(..., description="Granular text content of the chunk")
    token_count: int = Field(..., description="Number of tokens in the chunk content")
    overlap_tokens: int = Field(..., description="Number of overlapping tokens with neighboring chunks")
    clearance_level: str = Field("unclassified", description="Security clearance level")
    created_at: Optional[datetime] = Field(None, description="System creation timestamp")

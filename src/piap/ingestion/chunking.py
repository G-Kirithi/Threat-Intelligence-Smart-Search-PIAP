"""
Document chunking utilities supporting sliding-window overlapping segments.
"""

import math
from typing import List, Dict, Any
from piap.models.chunk import Chunk
from piap.utils.logging import logger

def estimate_tokens(text: str) -> int:
    """
    Heuristically estimates token count. On average, English text averages 4 characters per word,
    and 1 word is roughly 1.3 to 1.4 tokens. A reliable heuristic is splitting by whitespace and
    multiplying words by 1.35, or counting characters / 4. 
    """
    if not text:
        return 0
    words = text.split()
    return math.ceil(len(words) * 1.35)

def chunk_document(
    article_id: str,
    text: str,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
    clearance_level: str = "unclassified"
) -> List[Chunk]:
    """
    Splits text into sliding-window overlapping chunks.
    Target chunk size: 512 tokens. Overlap size: 64 tokens.
    """
    if not text or not text.strip():
        return []

    words = text.split()
    total_words = len(words)
    
    # Translate token constraints back to approximate word counts
    # chunk_size of 512 tokens is approx 380 words
    # chunk_overlap of 64 tokens is approx 48 words
    words_per_chunk = math.ceil(chunk_size / 1.35)
    overlap_words = math.ceil(chunk_overlap / 1.35)
    
    if overlap_words >= words_per_chunk:
        overlap_words = words_per_chunk // 2
        logger.warning("Chunk overlap was set larger than chunk size. Auto-scaled overlap to 50%.")

    chunks = []
    chunk_idx = 0
    start_idx = 0

    while start_idx < total_words:
        # Determine sliding end index
        end_idx = min(start_idx + words_per_chunk, total_words)
        chunk_words = words[start_idx:end_idx]
        
        # Build chunk content
        chunk_text = " ".join(chunk_words)
        token_count = estimate_tokens(chunk_text)
        
        # Generate stable chunk ID
        chunk_id = f"{article_id}-{chunk_idx}"
        
        chunks.append(Chunk(
            id=chunk_id,
            article_id=article_id,
            chunk_index=chunk_idx,
            content=chunk_text,
            token_count=token_count,
            overlap_tokens=chunk_overlap if start_idx > 0 else 0,
            clearance_level=clearance_level
        ))
        
        # If we reached the end of the article, break
        if end_idx == total_words:
            break
            
        # Shift start index by (chunk_size - overlap) words
        start_idx += (words_per_chunk - overlap_words)
        chunk_idx += 1

    logger.info(f"Segmented article {article_id} into {len(chunks)} chunks using sliding window (size={chunk_size} tokens, overlap={chunk_overlap} tokens).")
    return chunks

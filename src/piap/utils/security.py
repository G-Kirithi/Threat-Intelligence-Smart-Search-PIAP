"""
Security utilities for sanitizing inputs and mitigating prompt injection risks.
"""

import re
from piap.utils.logging import logger

def sanitize_search_query(query: str) -> str:
    """
    Sanitizes user search queries to prevent malicious formatting, escape characters,
    or attempts to inject SQL syntax or FTS5 control characters.
    """
    if not query:
        return ""
        
    # Strip SQLite special characters to avoid syntax errors in match queries
    sanitized = re.sub(r'[^\w\s\-\.\,\?\!\@]', '', query)
    
    # Squash excessive white spaces
    sanitized = " ".join(sanitized.split())
    
    return sanitized[:400]  # Hard character ceiling to limit buffer/injection risks

def detect_prompt_injection(text: str) -> bool:
    """
    Checks for common prompt injection patterns (e.g., "ignore previous instructions",
    "system overrides", "you are now an unrestricted model").
    """
    if not text:
        return False
        
    patterns = [
        r"ignore\s+(?:all\s+)?previous\s+instructions",
        r"system\s+(?:override|reset|bypass)",
        r"you\s+are\s+now\s+an?\s+(?:unrestricted|jailbroken)\s+model",
        r"forget\s+(?:everything|what\s+you\s+know|your\s+role)",
        r"as\s+an\s+unrestricted\s+ai",
        r"dan\s+mode",
        r"acting\s+as\s+a\s+villain"
    ]
    
    text_lower = text.lower()
    for pattern in patterns:
        if re.search(pattern, text_lower):
            logger.warning(f"Potential prompt injection pattern detected and blocked: {pattern}")
            return True
            
    return False

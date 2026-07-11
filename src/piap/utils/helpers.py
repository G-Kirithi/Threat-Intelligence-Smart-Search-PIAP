"""
General purpose helper functions and utility converters.
"""

from datetime import datetime, timezone
import re
from typing import Any, Dict

def parse_iso_datetime(date_str: str) -> datetime:
    """
    Parses ISO 8601 datetime strings safely, defaulting to current time on failure.
    """
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        # standard ISO parsing
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        try:
            # Fallback simple parser
            clean_str = re.sub(r"\.\d+", "", date_str) # strip milliseconds
            return datetime.strptime(clean_str, "%Y-%m-%dT%H:%M:%S")
        except Exception:
            return datetime.now(timezone.utc)

def format_datetime(dt: Optional[datetime]) -> str:
    """
    Formats a datetime object to standard ISO 8601 format with timezone offset.
    """
    if dt is None:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()

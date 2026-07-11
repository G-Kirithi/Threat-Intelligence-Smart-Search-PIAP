"""
RSS consumer for fetching, parsing, and deduplicating OSINT and cybersecurity feeds.
"""

import asyncio
from datetime import datetime
import hashlib
from typing import Any, Dict, List, Optional
import urllib.parse
import feedparser
from piap.utils.logging import logger

# Default list of real, high-quality Cybersecurity Threat Intel & OSINT feeds
DEFAULT_FEEDS = {
    "CISA Alerts": "https://www.cisa.gov/cybersecurity-alerts-alerts.xml",
    "Security Week": "https://feeds.feedburner.com/Securityweek",
    "HN Cyber Security": "https://hnfeed.com/cybersecurity.xml",
    "SANS Internet Storm Center": "https://isc.sans.edu/xml.html"
}

class RSSFeedConsumer:
    """
    Consumer class to fetch, parse, and validate RSS threat intelligence feeds.
    """
    def __init__(self):
        pass

    def generate_article_id(self, url: str) -> str:
        """
        Generates a unique deterministic ID for an article using a SHA-256 hash of its URL.
        """
        if not url:
            raise ValueError("URL is required to generate article ID")
        return hashlib.sha256(url.encode("utf-8")).hexdigest()

    def extract_domain(self, url: str) -> str:
        """
        Extracts the host domain from a URL for taxonomy and tagging.
        """
        try:
            parsed = urllib.parse.urlparse(url)
            return parsed.netloc or "unknown"
        except Exception:
            return "unknown"

    def parse_pub_date(self, entry: Any) -> Optional[datetime]:
        """
        Extracts and normalizes the publication date of an RSS entry.
        """
        for attr in ["published_parsed", "updated_parsed", "created_parsed"]:
            if hasattr(entry, attr) and getattr(entry, attr) is not None:
                struct_time = getattr(entry, attr)
                try:
                    return datetime(*struct_time[:6])
                except Exception:
                    pass
        return None

    async def fetch_feed_articles(self, feed_name: str, feed_url: str) -> List[Dict[str, Any]]:
        """
        Fetches an RSS feed asynchronously and parses its items into structured dictionaries.
        """
        logger.info(f"Fetching RSS feed '{feed_name}' from: {feed_url}")
        try:
            # Fetch feed content (run in executor since feedparser is synchronous)
            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, feedparser.parse, feed_url)
            
            if feed.bozo:
                logger.warning(f"Feed parsing warning/non-fatal exception for '{feed_name}': {feed.bozo_exception}")

            articles = []
            for entry in feed.entries:
                url = getattr(entry, "link", None)
                if not url:
                    continue

                title = getattr(entry, "title", "No Title")
                # Get the full text/summary
                content = ""
                if hasattr(entry, "content"):
                    content = entry.content[0].value
                elif hasattr(entry, "summary"):
                    content = entry.summary
                
                pub_date = self.parse_pub_date(entry)
                article_id = self.generate_article_id(url)
                domain = self.extract_domain(url)

                # Extract tags/categories if present
                tags = []
                if hasattr(entry, "tags"):
                    tags = [t.term for t in entry.tags if hasattr(t, "term") and t.term]

                articles.append({
                    "id": article_id,
                    "title": title,
                    "content": content or title,  # Fallback to title if empty
                    "feed_url": feed_url,
                    "source_domain": domain,
                    "published_date": pub_date,
                    "tags": tags
                })

            logger.info(f"Successfully parsed {len(articles)} articles from feed '{feed_name}'.")
            return articles
        except Exception as e:
            logger.error(f"Error fetching RSS feed '{feed_name}' ({feed_url}): {e}", exc_info=True)
            return []

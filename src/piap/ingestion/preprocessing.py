"""
Preprocessing utilities for cleaning and structuring raw article text.
"""

import re
import html
import unicodedata
from typing import Any, Dict, List, Tuple
from piap.utils.logging import logger

# Load spaCy if available
try:
    import spacy
    # Initialize English pipeline
    nlp = spacy.load("en_core_web_sm")
    logger.info("spaCy 'en_core_web_sm' model loaded successfully.")
except Exception as e:
    logger.warning(f"spaCy model not pre-loaded or missing: {e}. Utilizing native regex and heuristic fallbacks.")
    nlp = None

def clean_html(text: str) -> str:
    """
    Removes HTML tags and decodes character entities.
    """
    if not text:
        return ""
    # Remove HTML tags
    cleaned = re.sub(r"<[^>]+>", " ", text)
    # Decode XML/HTML entities
    return html.unescape(cleaned)

def normalize_unicode(text: str) -> str:
    """
    Normalizes unicode characters (NFKC format) to standard representation.
    """
    if not text:
        return ""
    return unicodedata.normalize("NFKC", text)

def remove_duplicate_whitespace(text: str) -> str:
    """
    Squashes consecutive tabs, spaces, and linebreaks into single spaces or clean newlines.
    """
    if not text:
        return ""
    # Normalize multiple spaces/tabs to a single space
    text = re.sub(r"[ \t]+", " ", text)
    # Normalize multiple newlines to double newlines
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()

def scrub_pii(text: str) -> str:
    """
    Lightweight, high-performance PII scrubbing for emails, phones, and social security numbers.
    """
    if not text:
        return ""
    
    # Redact Emails
    email_regex = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    text = re.sub(email_regex, "[REDACTED_EMAIL]", text)
    
    # Redact US Phone numbers (common formats)
    phone_regex = r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    text = re.sub(phone_regex, "[REDACTED_PHONE]", text)

    # Redact Social Security Numbers (SSN)
    ssn_regex = r"\b\d{3}-\d{2}-\d{4}\b"
    text = re.sub(ssn_regex, "[REDACTED_SSN]", text)
    
    return text

def segment_sentences(text: str) -> List[str]:
    """
    Splits text into list of sentences using spaCy, falling back to a regex-based sentence boundary detector if offline.
    """
    if not text:
        return []

    # Use spaCy if loaded
    if nlp is not None:
        try:
            doc = nlp(text)
            return [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        except Exception as e:
            logger.warning(f"spaCy sentence segmentation failed: {e}. Falling back to regex.")

    # Native Regex fallback: split on punctuation followed by whitespace and uppercase letter
    sentence_endings = re.compile(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s')
    sentences = sentence_endings.split(text)
    return [s.strip() for s in sentences if s.strip()]

def extract_entities(text: str) -> List[Dict[str, Any]]:
    """
    Performs named entity recognition on text using spaCy, falling back to heuristics if unavailable.
    Returns a list of dicts with entity text, start/end char offsets, and label.
    """
    if not text:
        return []

    if nlp is not None:
        try:
            doc = nlp(text)
            entities = []
            for ent in doc.ents:
                entities.append({
                    "text": ent.text,
                    "label": ent.label_,
                    "start": ent.start_char,
                    "end": ent.end_char
                })
            return entities
        except Exception as e:
            logger.warning(f"spaCy NER failed: {e}. Falling back to regex heuristics.")

    # Fallback heuristic: find capitalized phrases (representing organizations/people/locations)
    # Simple regex for capitalized words not at the very start of a paragraph
    entities = []
    matches = re.finditer(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b", text)
    for m in matches:
        ent_text = m.group(1)
        # Avoid common words at the start of sentences being falsely flagged as entities
        if ent_text.lower() in ["the", "this", "that", "there", "they", "we", "he", "she", "it", "but", "and"]:
            continue
        entities.append({
            "text": ent_text,
            "label": "ORG_OR_GPE_HEURISTIC",
            "start": m.start(),
            "end": m.end()
        })
    return entities

def preprocess_text(text: str) -> str:
    """
    Runs the full text sanitization pipeline: HTML clean, Unicode normalization,
    duplicate whitespace removal, and PII scrubbing.
    """
    cleaned = clean_html(text)
    normalized = normalize_unicode(cleaned)
    whitespace_cleared = remove_duplicate_whitespace(normalized)
    scrubbed = scrub_pii(whitespace_cleared)
    return scrubbed

"""
Structured logging configuration for PIAP.
"""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict
from piap.config import LOG_FILE

class StructuredFormatter(logging.Formatter):
    """
    Format logs as JSON objects for structured parsing in production.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        # Include custom fields passed in extra
        if hasattr(record, "extra_fields"):
            log_data.update(getattr(record, "extra_fields"))
        return json.dumps(log_data)

def setup_logger(name: str = "piap") -> logging.Logger:
    """
    Sets up a structured logger that writes to stdout and a persistent file.
    """
    logger = logging.getLogger(name)
    if logger.hasHandlers():
        return logger

    logger.setLevel(logging.INFO)

    # Console Handler (Human-readable structured logs)
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] - %(message)s"
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    # File Handler (JSON structured logs)
    try:
        file_handler = logging.FileHandler(LOG_FILE)
        file_handler.setFormatter(StructuredFormatter())
        logger.addHandler(file_handler)
    except Exception as e:
        logger.warning(f"Failed to initialize log file handler: {e}")

    return logger

logger = setup_logger()

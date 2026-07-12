"""
Configuration settings for the Personalized Intelligence Aggregation Platform (PIAP).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# Define project directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
CHROMA_DIR = DATA_DIR / "chroma"
LOG_DIR = DATA_DIR / "logs"

# Ensure directories exist
for folder in [DATA_DIR, CHROMA_DIR, LOG_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

# File paths
SQLITE_DB_PATH = DATA_DIR / "piap.db"
DATABASE_URL = f"sqlite+aiosqlite:///{SQLITE_DB_PATH}"
GRAPH_PATH = DATA_DIR / "graph.gml"
LOG_FILE = LOG_DIR / "piap.log"

# API settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")

# Vector DB clearance settings
DEFAULT_CLEARANCE_LEVEL = "unclassified"

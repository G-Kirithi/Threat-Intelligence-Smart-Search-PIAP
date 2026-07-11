"""
Database engine and session management for PIAP.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)
from piap.config import DATABASE_URL
from piap.utils.logging import logger

# Create the async engine with connection pooling settings
engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=False
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get a database session for a single request.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()

async def init_fts(session: AsyncSession) -> None:
    """
    Initializes SQLite FTS5 for lexical search and creates the triggers
    to automatically keep the search index in sync with the chunks table.
    """
    try:
        # Create FTS5 virtual table
        await session.execute(text(
            "CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5("
            "   chunk_id, "
            "   content"
            ");"
        ))
        
        # Create trigger to sync insert
        await session.execute(text(
            "CREATE TRIGGER IF NOT EXISTS after_chunk_insert AFTER INSERT ON chunks "
            "BEGIN "
            "   INSERT INTO chunks_fts (chunk_id, content) VALUES (new.id, new.content); "
            "END;"
        ))
        
        # Create trigger to sync update
        await session.execute(text(
            "CREATE TRIGGER IF NOT EXISTS after_chunk_update AFTER UPDATE ON chunks "
            "BEGIN "
            "   UPDATE chunks_fts SET content = new.content WHERE chunk_id = old.id; "
            "END;"
        ))
        
        # Create trigger to sync delete
        await session.execute(text(
            "CREATE TRIGGER IF NOT EXISTS after_chunk_delete AFTER DELETE ON chunks "
            "BEGIN "
            "   DELETE FROM chunks_fts WHERE chunk_id = old.id; "
            "END;"
        ))
        
        await session.commit()
        logger.info("SQLite FTS5 virtual tables and synchronization triggers initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize SQLite FTS5: {e}")
        await session.rollback()

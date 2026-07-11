"""
Service for generating embeddings using the Google GenAI SDK.
"""

import asyncio
from typing import List, Optional
from piap.utils.ollama_client import genai
from piap.config import GEMINI_API_KEY, USE_MOCK
from piap.utils.logging import logger

class EmbeddingService:
    """
    Manages vector embedding requests using the Ollama-based client wrapper and 'nomic-embed-text'.
    """
    def __init__(self):
        self._client: Optional[genai.Client] = None

    def get_client(self) -> genai.Client:
        """
        Lazy-initializes the Ollama GenAI client wrapper.
        """
        if self._client is None:
            try:
                # Initialize client wrapper
                self._client = genai.Client()
            except Exception as e:
                logger.error("Failed to initialize Ollama Client.")
                raise RuntimeError(
                    "Ollama API is not accessible. Please check your OLLAMA_BASE_URL configuration."
                ) from e
        return self._client

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates a 768-dimensional dense vector for a given string of text.
        """
        if not text.strip():
            # Return an empty/dummy embedding if input is empty
            return [0.0] * 768

        if USE_MOCK:
            import random
            logger.warning("Generating mock embedding for local testing/offline environment.")
            return [random.uniform(-0.1, 0.1) for _ in range(768)]

        try:
            if USE_MOCK:
                # This path is short-circuited and intentionally lightweight.
                import random
                logger.warning("Generating mock embedding for local testing/offline environment.")
                return [random.uniform(-0.1, 0.1) for _ in range(768)]

            client = self.get_client()
            response = await asyncio.to_thread(
                lambda: client.models.embed_content(
                    model="text-embedding-004",
                    contents=text
                )
            )
            if response.embeddings:
                return response.embeddings[0].values
            raise ValueError("No embeddings returned from the API.")
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise e

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates dense vectors in a single high-performance batch call.
        """
        if not texts:
            return []

        if USE_MOCK:
            import random
            logger.warning("Generating mock batch embeddings for local testing/offline environment.")
            return [[random.uniform(-0.1, 0.1) for _ in range(768)] for _ in texts]

        try:
            client = self.get_client()
            response = await asyncio.to_thread(
                lambda: client.models.embed_content(
                    model="text-embedding-004",
                    contents=texts
                )
            )
            if response.embeddings:
                return [emb.values for emb in response.embeddings]
            raise ValueError("No embeddings returned in batch request.")
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            raise e

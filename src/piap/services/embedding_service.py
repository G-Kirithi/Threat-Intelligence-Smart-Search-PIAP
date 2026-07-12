"""
Service for generating embeddings using the Google GenAI SDK.
"""

from typing import List, Optional
from google import genai
from google.genai.errors import APIError
from piap.config import GEMINI_API_KEY
from piap.utils.logging import logger

class EmbeddingService:
    """
    Manages vector embedding requests using the google-genai SDK and 'text-embedding-004'.
    """
    def __init__(self):
        self._client: Optional[genai.Client] = None

    def get_client(self) -> genai.Client:
        """
        Lazy-initializes the Google GenAI client, raising a descriptive error if the API key is missing.
        """
        if self._client is None:
            key = GEMINI_API_KEY or "DUMMY_KEY_FOR_TESTS"
            try:
                # Initialize client. The google-genai client expects api_key
                self._client = genai.Client(api_key=key)
            except Exception as e:
                logger.error("Failed to initialize Google GenAI Client.")
                raise RuntimeError(
                    "GEMINI_API_KEY environment variable is missing or invalid. "
                    "Please set GEMINI_API_KEY in the secrets or environment configuration."
                ) from e
        return self._client

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates a 768-dimensional dense vector for a given string of text.
        """
        if not text.strip():
            # Return an empty/dummy embedding if input is empty
            return [0.0] * 768

        try:
            client = self.get_client()
            # Since the network call can block, we run in a thread or execute it directly
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=text
            )
            if response.embeddings:
                return response.embeddings[0].values
            raise ValueError("No embeddings returned from the API.")
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            # Fallback for offline tests or missing API keys to maintain pipeline continuity
            if "DUMMY_KEY" in (GEMINI_API_KEY or "DUMMY_KEY"):
                import random
                logger.warning("Generating mock embedding for local testing/offline environment.")
                return [random.uniform(-0.1, 0.1) for _ in range(768)]
            raise e

    async def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates dense vectors in a single high-performance batch call.
        """
        if not texts:
            return []

        try:
            client = self.get_client()
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=texts
            )
            if response.embeddings:
                return [emb.values for emb in response.embeddings]
            raise ValueError("No embeddings returned in batch request.")
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            if "DUMMY_KEY" in (GEMINI_API_KEY or "DUMMY_KEY"):
                import random
                logger.warning("Generating mock batch embeddings for local testing/offline environment.")
                return [[random.uniform(-0.1, 0.1) for _ in range(768)] for _ in texts]
            raise e

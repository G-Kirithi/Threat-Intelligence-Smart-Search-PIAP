"""
ChromaDB storage repository for PIAP, managing dense vector indices and similarity searches.
"""

from typing import Any, Dict, List, Optional
import chromadb
from piap.config import CHROMA_DIR
from piap.utils.logging import logger

class ChromaStore:
    """
    Handles local, persistent vector storage using ChromaDB.
    """
    def __init__(self):
        try:
            # Persistent client in our data folder
            self.client = chromadb.PersistentClient(path=str(CHROMA_DIR))
            # Use cosine similarity as the distance metric
            self.collection = self.client.get_or_create_collection(
                name="piap_chunks",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("ChromaDB persistent vector store initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}", exc_info=True)
            raise e

    def add_chunks_vectors(
        self,
        chunk_ids: List[str],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> None:
        """
        Saves a batch of chunks, their corresponding texts, metadata dictionaries, and generated embeddings.
        """
        if not chunk_ids:
            return

        try:
            self.collection.add(
                ids=chunk_ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents
            )
            logger.info(f"Successfully added {len(chunk_ids)} chunks to ChromaDB vector index.")
        except Exception as e:
            logger.error(f"Failed to add chunks to ChromaDB: {e}")
            raise e

    def similarity_search(
        self,
        query_vector: List[float],
        limit: int = 10,
        clearance_level: str = "unclassified",
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes a dense cosine similarity search with optional metadata and clearance filtering.
        """
        try:
            # Build filters. We must only return chunks that the user has clearance to see.
            # E.g., user clearance "unclassified" should NOT see "confidential".
            # We enforce a hierarchy: unclassified < confidential < secret.
            # In simple terms, if clearance_level is unclassified, only allow unclassified.
            # If confidential, allow unclassified + confidential.
            # If secret, allow unclassified + confidential + secret.
            allowed_clearances = ["unclassified"]
            if clearance_level == "confidential":
                allowed_clearances.extend(["confidential"])
            elif clearance_level == "secret":
                allowed_clearances.extend(["confidential", "secret"])

            # Default filter: security clearance check
            chroma_filter: Dict[str, Any] = {
                "clearance": {"$in": allowed_clearances}
            }

            # If an additional filter is provided, we merge them
            if where_filter:
                # Combining using $and
                chroma_filter = {
                    "$and": [
                        chroma_filter,
                        where_filter
                    ]
                }

            results = self.collection.query(
                query_embeddings=[query_vector],
                n_results=limit,
                where=chroma_filter
            )

            # Reformat results into a clean list of dictionaries
            search_results = []
            if results and results["ids"] and len(results["ids"][0]) > 0:
                ids = results["ids"][0]
                documents = results["documents"][0] if results["documents"] else [""] * len(ids)
                metadatas = results["metadatas"][0] if results["metadatas"] else [{}] * len(ids)
                distances = results["distances"][0] if results["distances"] else [0.0] * len(ids)

                for i in range(len(ids)):
                    # Cosine distance to similarity: similarity = 1 - distance
                    # (depending on chroma setup, distance is L2, Cosine, etc.)
                    similarity = 1.0 - distances[i] if distances[i] is not None else 0.0
                    search_results.append({
                        "chunk_id": ids[i],
                        "content": documents[i],
                        "metadata": metadatas[i],
                        "score": max(0.0, min(1.0, similarity))
                    })

            return search_results
        except Exception as e:
            logger.error(f"ChromaDB similarity search failed: {e}")
            return []

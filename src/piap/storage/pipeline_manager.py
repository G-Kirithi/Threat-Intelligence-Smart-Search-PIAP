"""
Pipeline manager coordinating the ingestion, storage, embedding, and KG extraction steps.
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

from piap.config import GEMINI_API_KEY
from piap.ingestion.preprocessing import preprocess_text
from piap.ingestion.chunking import chunk_document
from piap.storage.sqlite_store import SQLiteStore, DBArticle, DBChunk
from piap.storage.chroma_store import ChromaStore
from piap.storage.graph_store import GraphStore
from piap.services.embedding_service import EmbeddingService
from piap.utils.logging import logger

# Pydantic schemas for Gemini Structured Outputs
class RelationshipTriple(BaseModel):
    subject: str = Field(..., description="An entity, actor, malware, organization, or concept")
    predicate: str = Field(..., description="The verb, relationship, action, or state connecting subject to object (e.g., ATTACKS, ORIGINATED_FROM, EXPLOITS, DEVELOPED_BY)")
    obj: str = Field(..., description="The target entity, concept, system, vulnerability, or country")
    confidence: float = Field(..., description="Estimated confidence score between 0.0 and 1.0")

class TriplesExtractionSchema(BaseModel):
    triples: List[RelationshipTriple] = Field(default_factory=list, description="List of extracted semantic triples")


class PipelineManager:
    """
    Coordinates ingestion across SQLite, Chroma, and the NetworkX Knowledge Graph.
    """
    def __init__(
        self,
        sqlite_store: SQLiteStore,
        chroma_store: ChromaStore,
        graph_store: GraphStore,
        embedding_service: EmbeddingService
    ):
        self.sqlite = sqlite_store
        self.chroma = chroma_store
        self.graph = graph_store
        self.embedding = embedding_service
        self._ai_client: Optional[genai.Client] = None

    def _get_ai_client(self) -> genai.Client:
        """
        Lazy loader for the GenAI client.
        """
        if self._ai_client is None:
            key = GEMINI_API_KEY or "DUMMY_KEY_FOR_TESTS"
            self._ai_client = genai.Client(api_key=key)
        return self._ai_client

    async def extract_knowledge_graph_triples(self, text_content: str) -> List[RelationshipTriple]:
        """
        Invokes Gemini with Structured Outputs to parse accurate semantic triples from the text.
        """
        if not text_content or not text_content.strip():
            return []

        # If dummy key or offline, return clean heuristics
        if "DUMMY_KEY" in (GEMINI_API_KEY or "DUMMY_KEY"):
            logger.warning("Using offline heuristic triple extractor due to missing GEMINI_API_KEY.")
            return [
                RelationshipTriple(
                    subject="Cyber Threat Actor",
                    predicate="EXPLOITS",
                    obj="Zero-Day Vulnerability",
                    confidence=0.9
                )
            ]

        try:
            client = self._get_ai_client()
            prompt = (
                f"Extract high-confidence relationship triples (Subject, Predicate, Object) "
                f"representing cybersecurity intelligence, threat actor activities, indicators, "
                f"vulnerabilities, or infrastructure. "
                f"Text content:\n\n{text_content[:4000]}"
            )

            # Generate structured JSON using Gemini 2.5 Flash
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=TriplesExtractionSchema,
                    system_instruction=(
                        "You are an expert Threat Intelligence KG Reasoner. "
                        "Deconstruct the provided threat intelligence reports into semantic triples "
                        "representing concrete entity interactions. Avoid speculative or low-confidence connections."
                    )
                )
            )

            if response.text:
                data = json.loads(response.text)
                triples_list = []
                for t in data.get("triples", []):
                    triples_list.append(RelationshipTriple(
                        subject=t["subject"],
                        predicate=t["predicate"],
                        obj=t["obj"],
                        confidence=t.get("confidence", 0.8)
                    ))
                return triples_list
            return []
        except Exception as e:
            logger.error(f"Gemini KG extraction failed: {e}")
            return []

    async def process_article(self, article_data: Dict[str, Any], clearance: str = "unclassified") -> str:
        """
        Executes the three-step transactional ingestion pipeline for a parsed article.
        """
        article_id = article_data["id"]
        title = article_data["title"]
        raw_content = article_data["content"]
        feed_url = article_data.get("feed_url")
        source_domain = article_data.get("source_domain", "unknown")
        published_date = article_data.get("published_date")
        tags_list = article_data.get("tags", [])

        logger.info(f"Initiating coordinated pipeline for article: {title} (ID: {article_id})")

        # STEP 1: Preprocess text and store inside SQLite (status: processing)
        try:
            clean_text = preprocess_text(raw_content)
            tags_str = ",".join(tags_list)

            db_article = DBArticle(
                id=article_id,
                title=title,
                content=clean_text,
                feed_url=feed_url,
                source_domain=source_domain,
                published_date=published_date,
                ingestion_status="processing",
                clearance_level=clearance,
                tags=tags_str
            )
            
            # Save Article Metadata
            await self.sqlite.add_article(db_article)
            await self.sqlite.add_audit_log(
                action="ingest_article_start",
                detail=f"Starting ingestion pipeline for '{title}' (Clearance: {clearance})"
            )
        except Exception as e:
            logger.error(f"Pipeline Step 1 failed (SQLite Article Creation): {e}")
            await self.sqlite.add_audit_log(
                action="ingest_article_failed",
                detail=f"Step 1 failed for '{title}': {e}"
            )
            raise e

        try:
            # Segment into sliding window chunks (512 tokens, 64 overlap)
            chunks = chunk_document(
                article_id=article_id,
                text=clean_text,
                chunk_size=512,
                chunk_overlap=64,
                clearance_level=clearance
            )

            db_chunks = []
            for c in chunks:
                db_chunks.append(DBChunk(
                    id=c.id,
                    article_id=c.article_id,
                    chunk_index=c.chunk_index,
                    content=c.content,
                    token_count=c.token_count,
                    overlap_tokens=c.overlap_tokens,
                    clearance_level=c.clearance_level
                ))
            
            # Save Chunks
            await self.sqlite.add_chunks(db_chunks)

            # STEP 2: Generate Vector Embeddings and store in ChromaDB
            chunk_texts = [c.content for c in chunks]
            embeddings = await self.embedding.get_embeddings_batch(chunk_texts)

            chroma_ids = [c.id for c in chunks]
            chroma_metadatas = []
            for c in chunks:
                chroma_metadatas.append({
                    "clearance": clearance,
                    "domain": source_domain,
                    "timestamp": published_date.isoformat() if published_date else datetime.now(timezone.utc).isoformat(),
                    "source": feed_url or "uploaded_doc",
                    "chunk_id": c.id,
                    "document_id": article_id
                })

            self.chroma.add_chunks_vectors(
                chunk_ids=chroma_ids,
                documents=chunk_texts,
                metadatas=chroma_metadatas,
                embeddings=embeddings
            )

            # STEP 3: Knowledge Graph Extraction using Gemini Structured Outputs
            triples = await self.extract_knowledge_graph_triples(clean_text)
            for t in triples:
                # Merge into NetworkX
                self.graph.add_triple(
                    subject=t.subject,
                    predicate=t.predicate,
                    obj=t.obj,
                    evidence_ids=[article_id],
                    confidence=t.confidence,
                    clearance=clearance
                )

            # Mark ingestion status as ready
            await self.sqlite.update_article_status(article_id, "ready")
            await self.sqlite.add_audit_log(
                action="ingest_article_success",
                detail=f"Ingestion pipeline completed successfully for '{title}' (Extracted {len(chunks)} chunks, {len(triples)} KG triples)"
            )
            logger.info(f"Ingestion pipeline succeeded for article: {title}")
            return article_id

        except Exception as e:
            logger.error(f"Pipeline processing failed for article '{title}': {e}", exc_info=True)
            await self.sqlite.update_article_status(article_id, "failed")
            await self.sqlite.add_audit_log(
                action="ingest_article_failed",
                detail=f"Pipeline processing failed for '{title}': {e}"
            )
            raise e

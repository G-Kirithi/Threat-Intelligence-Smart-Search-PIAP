"""
Synthesis service utilizing Gemini 2.5 Flash for evidence-bounded intelligence report generation.
"""

import json
import time
from typing import Any, AsyncGenerator, Dict, List, Optional
from pydantic import BaseModel, Field

from google import genai
from google.genai import types

from piap.config import GEMINI_API_KEY
from piap.models.report import Report, Finding, Contradiction
from piap.utils.logging import logger

class SynthesisService:
    """
    Synthesizes multi-source context into structured, factual intelligence reports.
    """
    def __init__(self):
        self._ai_client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        """
        Lazy-initializes the GenAI client.
        """
        if self._ai_client is None:
            key = GEMINI_API_KEY or "DUMMY_KEY_FOR_TESTS"
            self._ai_client = genai.Client(api_key=key)
        return self._ai_client

    def _build_context_str(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Formats retrieved chunks into a clean, numbered context block with clear citation markers.
        """
        context_blocks = []
        for i, chunk in enumerate(chunks, start=1):
            source = chunk.get("source", "unknown")
            cid = chunk.get("chunk_id", f"unknown-{i}")
            title = chunk.get("title", "Reference")
            content = chunk.get("content", "")
            context_blocks.append(
                f"=== CITATION_ID: {cid} ===\n"
                f"Source: {source} ({title})\n"
                f"Content: {content}\n"
            )
        return "\n".join(context_blocks)

    def _calculate_confidence(self, chunks: List[Dict[str, Any]]) -> float:
        """
        Calculates a programmatic confidence score based on chunk count, source diversity,
        and average retrieval scores (RRF/Chroma similarities).
        """
        if not chunks:
            return 0.0
        
        # Heuristics:
        # - Core base confidence from number of independent documents retrieved (max 0.4)
        unique_docs = len({c.get("document_id") for c in chunks if c.get("document_id")})
        doc_score = min(0.4, unique_docs * 0.1)
        
        # - Contribution from average RRF score / retrieval match (max 0.6)
        scores = [c.get("rrf_score", 0.5) for c in chunks]
        avg_score = sum(scores) / len(scores) if scores else 0.5
        rrf_contrib = min(0.6, avg_score * 0.6)
        
        return round(doc_score + rrf_contrib, 2)

    async def generate_structured_report(
        self,
        query: str,
        chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates a Structured Intelligence Report utilizing Gemini Structured Outputs (response_schema).
        """
        start_time = time.time()
        
        if not chunks:
            return {
                "id": f"rep-{int(start_time)}",
                "title": f"Report: {query}",
                "summary": "Insufficient local evidence retrieved to synthesize a factual response.",
                "findings": [],
                "contradictions": [],
                "confidence": 0.0,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "sources": []
            }

        context_str = self._build_context_str(chunks)
        confidence = self._calculate_confidence(chunks)

        # Build strict system instruction bounded to evidence
        system_instruction = (
            "You are a Senior Intelligence Analyst. Synthesize the provided context to answer the user query. "
            "STRICT SECURITY DIRECTIVES:\n"
            "1. You MUST only answer based on the facts explicitly mentioned in the context. "
            "Never assume, extrapolate, or hallucinate.\n"
            "2. If the context does not contain the answer, explicitly state that there is insufficient local evidence.\n"
            "3. Every finding or claim you make MUST cite one or more exact citation IDs from the context in the 'evidence' list.\n"
            "4. Identify any contradictions, conflicts, or data gaps between the sources and document them in 'contradictions'."
        )

        prompt = (
            f"Query: {query}\n\n"
            f"Retrieved Source Evidence:\n"
            f"{context_str}"
        )

        # If dummy key or offline, return clean fallback
        if "DUMMY_KEY" in (GEMINI_API_KEY or "DUMMY_KEY"):
            logger.warning("Using offline mock synthesis generator due to missing GEMINI_API_KEY.")
            return {
                "id": f"rep-{int(time.time())}",
                "title": f"Synthesis: {query}",
                "summary": "Mock local synthesis summary. Please configure GEMINI_API_KEY for real Gemini RAG.",
                "findings": [
                    {
                        "claim": f"Mock intelligence claim for query '{query}'",
                        "evidence": [chunks[0]["chunk_id"]] if chunks else []
                    }
                ],
                "contradictions": [],
                "confidence": confidence,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "sources": list({c["source"] for c in chunks})
            }

        try:
            client = self._get_client()
            
            # Pydantic schema for structured synthesis
            class FindingsSchema(BaseModel):
                claim: str = Field(..., description="Concrete synthesized claim or statement of fact")
                evidence: List[str] = Field(..., description="List of exact CITATION_IDs supporting this claim")

            class ContradictionsSchema(BaseModel):
                conflict: str = Field(..., description="Description of contradicting facts or disagreements between sources")
                sources: List[str] = Field(..., description="CITATION_IDs involved in the disagreement")

            class ReportSchema(BaseModel):
                title: str = Field(..., description="A concise title describing the synthesized report")
                summary: str = Field(..., description="High-level executive summary of the intelligence findings")
                findings: List[FindingsSchema] = Field(default_factory=list, description="Extracted key findings")
                contradictions: List[ContradictionsSchema] = Field(default_factory=list, description="Contradictions or conflicts identified")

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ReportSchema,
                    system_instruction=system_instruction
                )
            )

            latency = round((time.time() - start_time) * 1000, 2)

            if response.text:
                report_data = json.loads(response.text)
                return {
                    "id": f"rep-{int(start_time)}",
                    "title": report_data.get("title", f"Report: {query}"),
                    "summary": report_data.get("summary", "No summary generated."),
                    "findings": report_data.get("findings", []),
                    "contradictions": report_data.get("contradictions", []),
                    "confidence": confidence,
                    "latency_ms": latency,
                    "sources": list({c["source"] for c in chunks})
                }
            raise ValueError("No text returned from synthesis model.")
        except Exception as e:
            logger.error(f"Structured synthesis failed: {e}")
            return {
                "id": f"rep-{int(start_time)}",
                "title": f"Report: {query}",
                "summary": f"Failed to synthesize report. Error: {str(e)}",
                "findings": [],
                "contradictions": [],
                "confidence": 0.0,
                "latency_ms": round((time.time() - start_time) * 1000, 2),
                "sources": list({c["source"] for c in chunks})
            }

    async def stream_rag_response(
        self,
        query: str,
        chunks: List[Dict[str, Any]]
    ) -> AsyncGenerator[str, None]:
        """
        Streams a unified synthesis response (SSE token format), followed by complete
        structured citation and confidence metadata.
        """
        start_time = time.time()
        confidence = self._calculate_confidence(chunks)
        sources_list = list({c["source"] for c in chunks})
        citation_ids = [c["chunk_id"] for c in chunks]

        # Form a prompt that produces standard text streaming
        context_str = self._build_context_str(chunks)
        system_instruction = (
            "You are an expert Cybersecurity Intelligence Analyst. Answer the user query based ONLY on the provided context. "
            "Be precise, factual, and list citations where applicable."
        )

        prompt = (
            f"Query: {query}\n\n"
            f"Retrieved Source Evidence:\n"
            f"{context_str}"
        )

        # 1. Yield initial event indicating search completed and chunks found
        yield f"event: search_metadata\ndata: {json.dumps({'chunks_found': len(chunks), 'confidence': confidence})}\n\n"

        if not chunks:
            yield f"event: token\ndata: {json.dumps({'text': 'No local evidence retrieved. Cannot generate report.'})}\n\n"
            yield f"event: complete\ndata: {json.dumps({'confidence': 0.0, 'sources': [], 'latency_ms': 0})}\n\n"
            return

        # Fallback offline streaming
        if "DUMMY_KEY" in (GEMINI_API_KEY or "DUMMY_KEY"):
            logger.warning("Using mock streaming generator due to missing GEMINI_API_KEY.")
            mock_text = f"Factual synthesis answer for query '{query}' based on retrieved evidence of {len(chunks)} chunks."
            for word in mock_text.split():
                yield f"event: token\ndata: {json.dumps({'text': word + ' '})}\n\n"
                await asyncio.sleep(0.05)
            
            yield f"event: complete\ndata: {json.dumps({'confidence': confidence, 'sources': sources_list, 'citation_ids': citation_ids, 'latency_ms': 150})}\n\n"
            return

        try:
            client = self._get_client()
            # Perform streaming RAG
            response_stream = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction
                )
            )

            for chunk in response_stream:
                if chunk.text:
                    yield f"event: token\ndata: {json.dumps({'text': chunk.text})}\n\n"

            latency = round((time.time() - start_time) * 1000, 2)
            # Yield final completion summary
            yield f"event: complete\ndata: {json.dumps({'confidence': confidence, 'sources': sources_list, 'citation_ids': citation_ids, 'latency_ms': latency})}\n\n"
        except Exception as e:
            logger.error(f"Stream synthesis failed: {e}")
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

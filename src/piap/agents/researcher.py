"""
Researcher Agent, Evidence Collector, and Graph Reasoner implementations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from google import genai
from google.genai import types

from piap.config import GEMINI_API_KEY
from piap.agents.state_machine import AgentContextState, AgentLog, WorkflowState
from piap.utils.logging import logger

class ResearcherAgent:
    """
    Handles dense vector retrieval, graph context lookup, and intelligence fact synthesis.
    """
    def __init__(self):
        self._ai_client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        if self._ai_client is None:
            key = GEMINI_API_KEY or "DUMMY_KEY_FOR_TESTS"
            self._ai_client = genai.Client(api_key=key)
        return self._ai_client

    def _log_action(self, state: AgentContextState, msg: str) -> None:
        log = AgentLog(
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_name="Researcher",
            message=msg,
            state_reached=state.current_state.value
        )
        state.logs.append(log)
        logger.info(f"[Researcher] {msg}")

    async def execute_research(
        self,
        state: AgentContextState,
        retrieval_service,
        graph_service
    ) -> AgentContextState:
        """
        Gathers evidence across vector indices and semantic relationships, generating a factual research summary.
        """
        state.current_state = WorkflowState.RESEARCHING
        self._log_action(state, f"Beginning investigative research for query: '{state.query}'")

        # 1. Evidence Collector Step: Pull dense/lexical merged context chunks
        try:
            self._log_action(state, "Step 1: Invoking Evidence Collector (Hybrid vector/lexical retrieval)...")
            chunks = await retrieval_service.hybrid_retrieve(
                query=state.query,
                clearance_level=state.clearance_level,
                limit=6
            )
            state.retrieved_chunks = chunks
            self._log_action(state, f"Successfully collected {len(chunks)} high-relevance factual chunks.")
        except Exception as e:
            self._log_action(state, f"Evidence collection failure: {e}")
            state.current_state = WorkflowState.FAILED
            return state

        # 2. Graph Reasoner Step: Query neighboring relationships from the Knowledge Graph
        try:
            self._log_action(state, "Step 2: Invoking Graph Reasoner (Entity-relationship lookup)...")
            # Query key terms in the query from NetworkX
            words = [w for w in state.query.replace('"', '').replace("'", "").split() if len(w) > 3]
            kg_triples = []
            
            # Retrieve neighbor nodes for any entity matches
            for word in words[:3]:
                neighbors = graph_service.store.get_neighbors(word)
                if neighbors.get("found"):
                    for neighbor in neighbors["neighbors"]:
                        kg_triples.append({
                            "subject": neighbors["node"],
                            "predicate": neighbor["relation"],
                            "object": neighbor["node"],
                            "confidence": neighbor["confidence"],
                            "timestamp": neighbor["timestamp"]
                        })
            
            state.graph_context = kg_triples[:10]  # Cap to top 10 triples
            self._log_action(state, f"Successfully mapped {len(state.graph_context)} related semantic triples from Knowledge Graph.")
        except Exception as e:
            self._log_action(state, f"Graph reasoning failure: {e}")
            # Non-blocking, continue with vector evidence

        # 3. Analyze and Summarize Step (Gemini-powered synthesis)
        try:
            self._log_action(state, "Step 3: Synthesizing findings and draft evidence summary...")
            
            # Format collected evidence for LLM input
            chunks_str = "\n".join([
                f"- [Citation: {c['chunk_id']}] (Source: {c['source']}) {c['content']}"
                for c in state.retrieved_chunks
            ])
            
            graph_str = "\n".join([
                f"- Semantic Link: ({t['subject']}) -[{t['predicate']}]-> ({t['object']}) [Confidence: {t['confidence']}]"
                for t in state.graph_context
            ])

            prompt = (
                f"You are a Lead Researcher Agent. Analyze the following evidence to construct a factual intelligence summary.\n\n"
                f"User Query:\n{state.query}\n\n"
                f"Factual Document Chunks:\n{chunks_str or 'None'}\n\n"
                f"Knowledge Graph Relationships:\n{graph_str or 'None'}\n\n"
                f"Construct a detailed draft research summary outlining your findings. "
                f"Tie every factual claim directly to its exact citation ID (e.g., article-hash-0) or relationship link. "
                f"Strictly avoid any claims that are not backed by the provided evidence."
            )

            # If dummy offline key, fallback
            if "DUMMY_KEY" in (GEMINI_API_KEY or "DUMMY_KEY"):
                state.research_summary = (
                    f"Draft Research Summary:\n"
                    f"- Investigative evidence collected for query '{state.query}' indicates threat indicators matches. "
                    f"Citations checked: {', '.join([c['chunk_id'] for c in state.retrieved_chunks]) if state.retrieved_chunks else 'None'}.\n"
                    f"- Knowledge Graph checks confirmed connectivity."
                )
            else:
                client = self._get_client()
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction="You are an expert Threat Intelligence Analyst. Create a detailed, cited draft summary."
                    )
                )
                state.research_summary = response.text or "Failed to generate research summary."

            self._log_action(state, "Research and draft summary completed successfully.")
        except Exception as e:
            self._log_action(state, f"Research synthesis failure: {e}")
            state.current_state = WorkflowState.FAILED

        return state

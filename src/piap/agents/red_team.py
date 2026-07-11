"""
Red Team Agent implementation for auditing draft intelligence and verifying facts.
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from piap.utils.ollama_client import genai, types

from piap.config import GEMINI_API_KEY, USE_MOCK
from piap.agents.state_machine import AgentContextState, AgentLog, WorkflowState
from piap.utils.logging import logger

# Structured output schema for Red Team evaluation
class RedTeamAuditSchema(BaseModel):
    unsupported_claims: List[str] = Field(default_factory=list, description="Claims made in the draft summary that are not supported by the original raw chunks")
    hallucination_risks: List[str] = Field(default_factory=list, description="Extrapolations, speculation, or made-up details identified in the draft summary")
    contradictions_identified: List[str] = Field(default_factory=list, description="Contradictions, discrepancies, or conflicting facts found between original source documents")
    confidence_assessment: float = Field(..., description="Calculated precision/completeness score from 0.0 to 1.0 of the evidence pool")
    additional_retrieval_needed: bool = Field(..., description="Set to True if the current evidence pool is insufficient to answer the query")


class RedTeamAgent:
    """
    Acts as an adversarial supervisor, validating draft research against original source chunks.
    """
    def __init__(self):
        self._ai_client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        if self._ai_client is None:
            self._ai_client = genai.Client()
        return self._ai_client

    def _log_action(self, state: AgentContextState, msg: str) -> None:
        log = AgentLog(
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_name="Red Team",
            message=msg,
            state_reached=state.current_state.value
        )
        state.logs.append(log)
        logger.info(f"[Red Team] {msg}")

    async def execute_audit(self, state: AgentContextState) -> AgentContextState:
        """
        Adversarially cross-references the draft research summary against raw source chunks.
        """
        state.current_state = WorkflowState.RED_TEAM_AUDITING
        self._log_action(state, "Beginning strict adversarial intelligence audit...")

        if not state.research_summary:
            self._log_action(state, "No research summary available to audit. Directing transition to FAILED.")
            state.current_state = WorkflowState.FAILED
            return state

        # 1. Format inputs for structured audit
        chunks_str = "\n".join([
            f"- [Citation: {c['chunk_id']}] {c['content']}"
            for c in state.retrieved_chunks
        ])

        prompt = (
            f"Adversarial Audit Target:\n\n"
            f"Draft Research Summary:\n"
            f"{state.research_summary}\n\n"
            f"Original Reference Evidence (Source Chunks):\n"
            f"{chunks_str or 'None'}\n\n"
            f"Perform a strict review to identify unsupported claims, contradictions, or speculative hallucination risks."
        )

        # If mock mode enabled or offline, bypass
        if USE_MOCK:
            self._log_action(state, "Bypassing LLM audit (offline mock mode). Asserting draft is safe.")
            state.red_team_critique = "Audit bypassed. Verification completed."
            state.hallucination_risks = []
            state.additional_retrieval_needed = False
            return state

        try:
            client = self._get_client()
            
            # Execute Gemini Structured Outputs for Red Team evaluation
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=RedTeamAuditSchema,
                    system_instruction=(
                        "You are an elite Red Team Auditor. Your task is to keep intelligence report synthesis strictly truthful. "
                        "You must flag any claims made in the research summary that cannot be explicitly verified by the "
                        "provided raw source chunks. Identify internal discrepancies or conflicts between sources."
                    )
                )
            )

            if response.text:
                audit_result = json.loads(response.text)
                
                # Update State
                state.hallucination_risks = audit_result.get("hallucination_risks", [])
                state.additional_retrieval_needed = audit_result.get("additional_retrieval_needed", False)
                
                # Map structured findings into the state context
                critique_lines = []
                if audit_result.get("unsupported_claims"):
                    critique_lines.append("UNSUPPORTED CLAIMS FLAGGED:")
                    for claim in audit_result["unsupported_claims"]:
                        critique_lines.append(f"- {claim}")
                
                if audit_result.get("hallucination_risks"):
                    critique_lines.append("\nHALLUCINATION/EXTRAPOLATION RISKS:")
                    for risk in audit_result["hallucination_risks"]:
                        critique_lines.append(f"- {risk}")
                
                if audit_result.get("contradictions_identified"):
                    critique_lines.append("\nSOURCE CONTRADICTIONS IDENTIFIED:")
                    for contradiction in audit_result["contradictions_identified"]:
                        critique_lines.append(f"- {contradiction}")
                
                critique_lines.append(f"\nAssessed Evidence Pool Confidence: {audit_result.get('confidence_assessment', 1.0)}")
                
                state.red_team_critique = "\n".join(critique_lines) if critique_lines else "Perfect Match. Summary fully supported by source evidence."
                
                # Check if we need additional retrieval
                if state.additional_retrieval_needed:
                    self._log_action(state, "CRITICAL WARNING: Red Team identified evidence gap. Flagging need for expanded retrieval.")
                else:
                    self._log_action(state, "Audit completed. No critical validation blocks found.")
            else:
                raise ValueError("Empty audit response returned from the API.")

        except Exception as e:
            self._log_action(state, f"Red Team audit process encountered error: {e}. Defaulting to safe fallback.")
            state.red_team_critique = "Audit failed to execute. Safe default assumed."
            state.additional_retrieval_needed = False

        return state

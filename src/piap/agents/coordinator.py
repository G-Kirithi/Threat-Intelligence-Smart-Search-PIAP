"""
Central Multi-Agent Coordinator and Orchestrator for driving state transitions.
"""

from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional

from piap.agents.state_machine import AgentContextState, AgentLog, WorkflowState
from piap.agents.researcher import ResearcherAgent
from piap.agents.red_team import RedTeamAgent
from piap.services.retrieval_service import RetrievalService
from piap.services.graph_service import GraphService
from piap.services.synthesis_service import SynthesisService
from piap.services.report_service import ReportService
from piap.storage.sqlite_store import SQLiteStore, DBJob
from piap.utils.logging import logger

class CoordinatorAgent:
    """
    Drives the execution of the multi-agent state machine.
    """
    def __init__(
        self,
        sqlite_store: SQLiteStore,
        retrieval_service: RetrievalService,
        graph_service: GraphService,
        synthesis_service: SynthesisService,
        report_service: ReportService
    ):
        self.sqlite = sqlite_store
        self.retrieval = retrieval_service
        self.graph = graph_service
        self.synthesis = synthesis_service
        self.reports = report_service
        
        self.researcher = ResearcherAgent()
        self.red_team = RedTeamAgent()

    def _log_action(self, state: AgentContextState, msg: str) -> None:
        log = AgentLog(
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_name="Coordinator",
            message=msg,
            state_reached=state.current_state.value
        )
        state.logs.append(log)
        logger.info(f"[Coordinator] {msg}")

    async def run_workflow(
        self,
        query: str,
        clearance_level: str = "unclassified"
    ) -> AgentContextState:
        """
        Coordinates the execution of the multi-agent pipeline.
        """
        task_id = f"job-{uuid.uuid4().hex[:8]}"
        state = AgentContextState(
            task_id=task_id,
            query=query,
            clearance_level=clearance_level,
            current_state=WorkflowState.COORDINATING
        )

        # Create persistent DB Job record
        db_job = DBJob(
            id=task_id,
            type="agent_run",
            status="running",
            progress=5.0,
            log_message="Initializing multi-agent workflow"
        )
        await self.sqlite.create_job(db_job)
        await self.sqlite.add_audit_log(
            action="start_agent_workflow",
            detail=f"Workflow '{task_id}' started for query: '{query}'"
        )

        self._log_action(state, f"Initialized Workflow Execution Job ID: {task_id}")

        # --- STATE 1: RESEARCHING ---
        self._log_action(state, "Transitioning State: COORDINATING -> RESEARCHING")
        await self.sqlite.update_job(task_id, "running", 25.0, "State: Researching Evidence")
        state = await self.researcher.execute_research(state, self.retrieval, self.graph)
        
        if state.current_state == WorkflowState.FAILED:
            self._log_action(state, "Workflow aborted during Research phase.")
            await self.sqlite.update_job(task_id, "failed", 100.0, "Aborted during research phase.")
            return state

        # --- STATE 2: RED TEAM AUDIT ---
        self._log_action(state, "Transitioning State: RESEARCHING -> RED_TEAM_AUDITING")
        await self.sqlite.update_job(task_id, "running", 50.0, "State: Red Team Fact-Checking Audit")
        state = await self.red_team.execute_audit(state)
        
        if state.current_state == WorkflowState.FAILED:
            self._log_action(state, "Workflow aborted during Red Team Audit phase.")
            await self.sqlite.update_job(task_id, "failed", 100.0, "Aborted during Red Team audit phase.")
            return state

        # Check for corrective loop (Additional Retrieval requested by Red Team)
        if state.additional_retrieval_needed:
            self._log_action(state, "Corrective Loop Triggered! Expanding evidence retrieval coverage...")
            await self.sqlite.update_job(task_id, "running", 60.0, "Expanding retrieval coverage...")
            
            # Execute secondary expanded retrieval
            extra_chunks = await self.retrieval.hybrid_retrieve(
                query=f"{state.query} threat analysis cyber indicators",
                clearance_level=state.clearance_level,
                limit=8
            )
            # Merge and deduplicate chunks
            existing_cids = {c["chunk_id"] for c in state.retrieved_chunks}
            for ec in extra_chunks:
                if ec["chunk_id"] not in existing_cids:
                    state.retrieved_chunks.append(ec)
            
            self._log_action(state, f"Expanded evidence pool. New total chunks count: {len(state.retrieved_chunks)}")
            
            # Re-run research summary with expanded pool
            state = await self.researcher.execute_research(state, self.retrieval, self.graph)

        # --- STATE 3: REPORT GENERATION ---
        self._log_action(state, "Transitioning State: RED_TEAM_AUDITING -> REPORT_GENERATION")
        await self.sqlite.update_job(task_id, "running", 80.0, "State: Generating Intelligence Report")
        
        try:
            # Call Synthesis Service to generate Structured Report
            report_data = await self.synthesis.generate_structured_report(
                query=state.query,
                chunks=state.retrieved_chunks
            )
            # Inject Red Team audit contradictions into report
            if state.hallucination_risks:
                report_data["contradictions"].append({
                    "conflict": f"Auditor concerns: {'; '.join(state.hallucination_risks)}",
                    "sources": ["Red_Team_Critique"]
                })
            
            state.final_report = report_data
            
            # Save report to SQLite
            await self.reports.save_report(report_data)
            self._log_action(state, f"Structured Report saved successfully (Report ID: {report_data['id']})")

        except Exception as e:
            self._log_action(state, f"Failed to generate structured report: {e}")
            state.current_state = WorkflowState.FAILED
            await self.sqlite.update_job(task_id, "failed", 100.0, f"Aborted during report generation: {e}")
            return state

        # --- STATE 4: HUMAN REVIEW (WAITING FOR ANALYST) ---
        self._log_action(state, "Transitioning State: REPORT_GENERATION -> HUMAN_REVIEW")
        await self.sqlite.update_job(task_id, "success", 100.0, "Multi-agent workflow completed. Report ready for human review.")
        await self.sqlite.add_audit_log(
            action="complete_agent_workflow",
            detail=f"Workflow '{task_id}' successfully generated Report '{report_data['id']}'"
        )
        
        state.current_state = WorkflowState.HUMAN_REVIEW
        self._log_action(state, "Multi-Agent Intelligence Cycle completed. Standing by for human analyst review.")
        
        return state

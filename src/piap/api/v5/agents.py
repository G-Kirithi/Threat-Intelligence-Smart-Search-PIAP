"""
FastAPI Router for v5 Multi-Agent analytical workflow execution.
"""

from typing import Any, Dict
from fastapi import APIRouter, HTTPException

from piap.schemas.request import QueryRequest
from piap.schemas.response import WorkflowResponse
from piap.utils.security import sanitize_search_query, detect_prompt_injection
from piap.utils.logging import logger

# Import instantiated singletons
from piap.main_services import sqlite_store, coordinator_agent

router = APIRouter(prefix="/v5", tags=["Multi-Agent Systems"])

@router.post("/query", response_model=WorkflowResponse, summary="Execute multi-agent analytical task")
async def run_analytical_agents(request_payload: QueryRequest):
    """
    Spawns a cooperative multi-agent team (Coordinator, Researcher, Red Team, Report Generator)
    to research, fact-check, audit, and compile an intelligence report on a query.
    """
    query_str = request_payload.query
    clearance = request_payload.clearance_level

    # 1. Security check
    if detect_prompt_injection(query_str):
        raise HTTPException(status_code=400, detail="Security assertion: Potential prompt injection attempt blocked.")

    sanitized_query = sanitize_search_query(query_str)
    if not sanitized_query:
        raise HTTPException(status_code=400, detail="Invalid analytical query content.")

    logger.info(f"API [v5/query] Spawning Cooperative Team for task: '{sanitized_query}' (Clearance={clearance})")

    try:
        # Execute Coordinator state machine workflow
        state_result = await coordinator_agent.run_workflow(
            query=sanitized_query,
            clearance_level=clearance
        )

        if state_result.current_state.value == "failed":
            raise HTTPException(
                status_code=500,
                detail=f"Multi-agent investigation failed. Audit logs: {state_result.logs[-1].message if state_result.logs else 'Unknown error'}"
            )

        # Map logs to standard Pydantic response items
        logs_response = []
        for log in state_result.logs:
            logs_response.append({
                "timestamp": log.timestamp,
                "agent_name": log.agent_name,
                "message": log.message,
                "state_reached": log.state_reached
            })

        return {
            "task_id": state_result.task_id,
            "query": state_result.query,
            "clearance_level": state_result.clearance_level,
            "status": state_result.current_state.value,
            "logs": logs_response,
            "final_report": state_result.final_report
        }

    except Exception as e:
        logger.error(f"Cooperative multi-agent session crashed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Multi-agent session failed: {str(e)}")

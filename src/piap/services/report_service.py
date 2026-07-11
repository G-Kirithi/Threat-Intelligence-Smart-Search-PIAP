"""
Service for saving, managing, and indexing synthesized reports and analyst feedback.
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from piap.storage.sqlite_store import SQLiteStore, DBReport, DBFeedback
from piap.models.report import Report, Finding, Contradiction, Feedback
from piap.utils.logging import logger

class ReportService:
    """
    Manages structured intelligence report lifecycles and quality feedback.
    """
    def __init__(self, sqlite_store: SQLiteStore):
        self.sqlite = sqlite_store

    async def save_report(self, report_data: Dict[str, Any]) -> str:
        """
        Saves a freshly generated report dictionary into SQLite.
        """
        rid = report_data["id"]
        title = report_data["title"]
        summary = report_data["summary"]
        findings = report_data.get("findings", [])
        contradictions = report_data.get("contradictions", [])
        confidence = report_data.get("confidence", 1.0)

        # Serialize findings and contradictions to JSON strings
        findings_json = json.dumps([f if isinstance(f, dict) else f.model_dump() for f in findings])
        contradictions_json = json.dumps([c if isinstance(c, dict) else c.model_dump() for c in contradictions])

        db_report = DBReport(
            id=rid,
            title=title,
            summary=summary,
            findings=findings_json,
            contradictions=contradictions_json,
            confidence=confidence,
            status="pending"
        )

        await self.sqlite.add_report(db_report)
        logger.info(f"Structured Report saved successfully: {title} (ID: {rid})")
        return rid

    async def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a report from SQLite, parsing serialized JSON structures back into list/dict.
        """
        db_report = await self.sqlite.get_report(report_id)
        if not db_report:
            return None

        # Parse findings and contradictions from JSON strings
        try:
            findings = json.loads(db_report.findings)
        except Exception:
            findings = []

        try:
            contradictions = json.loads(db_report.contradictions) if db_report.contradictions else []
        except Exception:
            contradictions = []

        return {
            "id": db_report.id,
            "title": db_report.title,
            "summary": db_report.summary,
            "findings": findings,
            "contradictions": contradictions,
            "confidence": db_report.confidence,
            "created_at": db_report.created_at.isoformat() if db_report.created_at else None,
            "status": db_report.status,
            "reviewer_feedback": db_report.reviewer_feedback
        }

    async def list_saved_reports(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Lists past reports.
        """
        db_reports = await self.sqlite.list_reports(limit=limit, offset=offset)
        reports = []
        for r in db_reports:
            try:
                findings = json.loads(r.findings)
            except Exception:
                findings = []
            
            try:
                contradictions = json.loads(r.contradictions) if r.contradictions else []
            except Exception:
                contradictions = []

            reports.append({
                "id": r.id,
                "title": r.title,
                "summary": r.summary,
                "findings": findings,
                "contradictions": contradictions,
                "confidence": r.confidence,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "status": r.status,
                "reviewer_feedback": r.reviewer_feedback
            })
        return reports

    async def submit_feedback(self, report_id: str, rating: int, comments: Optional[str] = None) -> str:
        """
        Appends quality feedback rating to a report and audits the review action.
        """
        fid = f"fb-{int(datetime.now(timezone.utc).timestamp())}"
        
        db_feedback = DBFeedback(
            id=fid,
            report_id=report_id,
            rating=rating,
            comments=comments
        )

        await self.sqlite.add_feedback(db_feedback)
        
        # Update report status to 'reviewed' and capture reviewer feedback comments
        await self.sqlite.update_report_feedback(
            report_id=report_id,
            status="reviewed",
            feedback_text=f"Rating: {rating}/5. Comments: {comments or 'None'}"
        )

        await self.sqlite.add_audit_log(
            action="submit_feedback",
            detail=f"Analyst submitted rating {rating}/5 for Report ID '{report_id}'"
        )
        
        logger.info(f"Feedback {fid} registered for report {report_id}.")
        return fid

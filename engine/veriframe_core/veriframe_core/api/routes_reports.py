from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from veriframe_core.api.auth import require_local_token
from veriframe_core.contracts.storage import StoredReportArtifact
from veriframe_core.errors import NotFoundError, ReportGenerationError
from veriframe_core.importing.hash_utils import compute_sha256
from veriframe_core.reports.html_exporter import HtmlReportExporter
from veriframe_core.reports.json_exporter import JsonReportExporter
from veriframe_core.reports.report_builder import ReportBuilder
from veriframe_core.storage.database import Database
from veriframe_core.storage.repositories.analysis_repository import AnalysisRepository
from veriframe_core.storage.repositories.report_artifact_repository import ReportArtifactRepository

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(require_local_token)],
)


class ReportExportRequest(BaseModel):
    format: str = Field(pattern=r"^(json|html|evidence_map|audit_receipt)$")


class ReportExportResponse(BaseModel):
    runId: str
    format: str
    path: str
    sha256: str
    sizeBytes: int


@router.get("")
async def list_reports(request: Request) -> dict[str, object]:
    db = Database(settings=request.app.state.settings)
    db.initialize()

    with db.connection() as connection:
        summaries = AnalysisRepository(connection).list_summaries(limit=100)

    return {
        "reports": [
            {
                "runId": summary.runId,
                "requestId": summary.requestId,
                "status": summary.status,
                "workflow": summary.workflow,
                "sourcePath": summary.sourcePath,
                "inputHash": summary.inputHash,
                "resultHash": summary.resultHash,
                "configHash": summary.configHash,
                "createdAt": summary.createdAt,
                "completedAt": summary.completedAt,
                "findingCount": summary.findingCount,
                "regionCount": summary.regionCount,
                "artifactCount": summary.artifactCount,
            }
            for summary in summaries
        ]
    }


@router.get("/{run_id}")
async def get_report(request: Request, run_id: str):
    result = await load_result(request, run_id)
    return ReportBuilder().build(result)


@router.post("/{run_id}/export")
async def export_report(
    request: Request,
    run_id: str,
    body: ReportExportRequest,
) -> ReportExportResponse:
    result = await load_result(request, run_id)
    report = ReportBuilder().build(result)

    settings = request.app.state.settings
    assert settings.reports_dir is not None

    export_dir = settings.reports_dir / run_id / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)

    file_name = {
        "json": "visual-report.json",
        "html": "visual-report.html",
        "evidence_map": "evidence-map.json",
        "audit_receipt": "audit-receipt.json",
    }[body.format]

    target = export_dir / file_name

    if body.format == "json":
        JsonReportExporter().export(report, target)
    elif body.format == "html":
        HtmlReportExporter().export(report, target)
    elif body.format == "evidence_map":
        target.write_text(report.evidenceMap.model_dump_json(indent=2), encoding="utf-8")
    elif body.format == "audit_receipt":
        target.write_text(report.auditReceipt.model_dump_json(indent=2), encoding="utf-8")
    else:
        raise ReportGenerationError(f"Unsupported export format: {body.format}")

    artifact = StoredReportArtifact(
        artifactId=f"report_{run_id}_{body.format}",
        runId=run_id,
        format=body.format,
        path=str(target),
        sha256=compute_sha256(target),
        sizeBytes=target.stat().st_size,
        createdAt=datetime.now(timezone.utc).isoformat(),
    )

    db = Database(settings=settings)
    db.initialize()
    with db.connection() as connection:
        ReportArtifactRepository(connection).upsert(artifact)

    return ReportExportResponse(
        runId=run_id,
        format=body.format,
        path=str(target),
        sha256=artifact.sha256,
        sizeBytes=artifact.sizeBytes,
    )


async def load_result(request: Request, run_id: str):
    result = request.app.state.analysis_results.get(run_id)

    if result is not None:
        return result

    settings = request.app.state.settings
    db = Database(settings=settings)
    db.initialize()

    with db.connection() as connection:
        result = AnalysisRepository(connection).get_result(run_id)

    if result is not None:
        request.app.state.analysis_results[run_id] = result
        return result

    assert settings.reports_dir is not None
    result_path = settings.reports_dir / run_id / "analysis-result.json"

    if result_path.exists():
        from veriframe_core.contracts.analysis import AnalysisResult

        result = AnalysisResult.model_validate_json(result_path.read_text(encoding="utf-8"))
        request.app.state.analysis_results[run_id] = result
        return result

    raise NotFoundError(f"Analysis result not found: {run_id}")

from __future__ import annotations

from veriframe_core.audit.audit_logger import AuditLogger
from veriframe_core.contracts.analysis import AnalysisResult
from veriframe_core.storage.database import Database
from veriframe_core.storage.repositories.analysis_repository import AnalysisRepository
from veriframe_core.storage.repositories.finding_repository import FindingRepository
from veriframe_core.storage.repositories.image_repository import ImageRepository
from veriframe_core.storage.repositories.model_run_repository import ModelRunRepository
from veriframe_core.storage.repositories.region_repository import RegionRepository


def persist_analysis_result(
    result: AnalysisResult,
    *,
    database: Database | None = None,
    workflow: str = "visual_audit",
    source_path: str = "",
) -> None:
    db = database or Database()
    db.initialize()

    with db.connection() as connection:
        analysis_repo = AnalysisRepository(connection)
        analysis_repo.delete_run_children(result.runId)
        analysis_repo.upsert_result(result, workflow=workflow, source_path=source_path)
        ImageRepository(connection).upsert(run_id=result.runId, image=result.image)
        RegionRepository(connection).insert_many(run_id=result.runId, regions=result.regions)
        FindingRepository(connection).insert_many(run_id=result.runId, findings=result.findings)
        ModelRunRepository(connection).insert_many(run_id=result.runId, models=result.modelInfo)

        audit = AuditLogger(connection)
        audit.info(
            event_type="analysis.persisted",
            message="Analysis result persisted to SQLite.",
            run_id=result.runId,
            context={
                "findingCount": len(result.findings),
                "regionCount": len(result.regions),
                "artifactHashCount": len(result.auditReceipt.artifactHashes),
            },
        )

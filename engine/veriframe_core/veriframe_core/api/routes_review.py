from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from veriframe_core.api.auth import require_local_token
from veriframe_core.errors import NotFoundError
from veriframe_core.review.correction_models import FindingReview, RegionCorrection
from veriframe_core.review.dataset_exporter import DatasetExporter
from veriframe_core.review.review_repository import ReviewRepository
from veriframe_core.storage.database import Database
from veriframe_core.storage.repositories.analysis_repository import AnalysisRepository

router = APIRouter(
    prefix="/review",
    tags=["review"],
    dependencies=[Depends(require_local_token)],
)


class ReviewSessionResponse(BaseModel):
    runId: str
    result: object
    session: object


class DatasetExportResponse(BaseModel):
    exportId: str
    runId: str
    datasetPath: str
    annotationPath: str
    imagePath: str | None
    correctionCount: int
    findingReviewCount: int
    sha256: str
    createdAt: str


@router.get("/{run_id}")
async def get_review_session(request: Request, run_id: str) -> ReviewSessionResponse:
    result = await load_result_for_review(request, run_id)

    db = Database(settings=request.app.state.settings)
    db.initialize()
    with db.connection() as connection:
        session = ReviewRepository(connection).get_session(run_id, total_findings=len(result.findings))

    return ReviewSessionResponse(
        runId=run_id,
        result=result.model_dump(),
        session=session.model_dump(),
    )


@router.post("/{run_id}/regions")
async def save_region_correction(
    request: Request,
    run_id: str,
    correction: RegionCorrection,
) -> dict[str, object]:
    if correction.runId != run_id:
        raise ValueError("Correction runId does not match URL run_id.")

    db = Database(settings=request.app.state.settings)
    db.initialize()
    with db.connection() as connection:
        ReviewRepository(connection).upsert_region_correction(correction)

    return {"ok": True, "runId": run_id, "correctionId": correction.correctionId}


@router.post("/{run_id}/findings")
async def save_finding_review(
    request: Request,
    run_id: str,
    review: FindingReview,
) -> dict[str, object]:
    if review.runId != run_id:
        raise ValueError("Finding review runId does not match URL run_id.")

    db = Database(settings=request.app.state.settings)
    db.initialize()
    with db.connection() as connection:
        ReviewRepository(connection).upsert_finding_review(review)

    return {"ok": True, "runId": run_id, "reviewId": review.reviewId}


@router.post("/{run_id}/export-dataset")
async def export_review_dataset(request: Request, run_id: str) -> DatasetExportResponse:
    result = await load_result_for_review(request, run_id)

    settings = request.app.state.settings
    assert settings.app_data_dir is not None

    db = Database(settings=settings)
    db.initialize()
    with db.connection() as connection:
        repository = ReviewRepository(connection)
        corrections = repository.list_region_corrections(run_id)
        finding_reviews = repository.list_finding_reviews(run_id)

        source_path = source_path_for_run(connection, run_id)
        export = DatasetExporter().export(
            result=result,
            corrections=corrections,
            finding_reviews=finding_reviews,
            output_dir=settings.app_data_dir / "review-datasets",
            source_image_path=source_path,
            repository=repository,
        )

    return DatasetExportResponse(
        exportId=export.exportId,
        runId=export.runId,
        datasetPath=export.datasetPath,
        annotationPath=export.annotationPath,
        imagePath=export.imagePath,
        correctionCount=export.correctionCount,
        findingReviewCount=export.findingReviewCount,
        sha256=export.sha256,
        createdAt=export.createdAt,
    )


async def load_result_for_review(request: Request, run_id: str):
    result = request.app.state.analysis_results.get(run_id)
    if result is not None:
        return result

    db = Database(settings=request.app.state.settings)
    db.initialize()
    with db.connection() as connection:
        result = AnalysisRepository(connection).get_result(run_id)

    if result is not None:
        request.app.state.analysis_results[run_id] = result
        return result

    settings = request.app.state.settings
    assert settings.reports_dir is not None
    result_path = settings.reports_dir / run_id / "analysis-result.json"

    if result_path.exists():
        from veriframe_core.contracts.analysis import AnalysisResult

        result = AnalysisResult.model_validate_json(result_path.read_text(encoding="utf-8"))
        request.app.state.analysis_results[run_id] = result
        return result

    raise NotFoundError(f"Analysis result not found for review: {run_id}")


def source_path_for_run(connection, run_id: str) -> str | None:
    row = connection.execute(
        "SELECT source_path FROM analysis_runs WHERE run_id = ?",
        (run_id,),
    ).fetchone()
    return row["source_path"] if row is not None else None

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, Request

from veriframe_core.api.auth import require_local_token
from veriframe_core.contracts.analysis import (
    AnalysisRequest,
    AnalysisResult,
    AuditReceipt,
    AuditSignature,
    BoundingBox,
    DetectedRegion,
    Finding,
    ImageMetadata,
    ImageQualityReport,
)
from veriframe_core.errors import AnalysisCancelledError, EngineError, NotFoundError
from veriframe_core.importing.metadata_extractor import extract_image_metadata
from veriframe_core.pipeline.analysis_pipeline import AnalysisPipeline
from veriframe_core.preprocessing.quality import compute_quality_signals
from veriframe_core.runtime.progress import ProgressSnapshot

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
    dependencies=[Depends(require_local_token)],
)


@router.post("")
async def submit_analysis(request: Request, analysis_request: AnalysisRequest) -> AnalysisResult:
    pipeline = AnalysisPipeline(
        settings=request.app.state.settings,
        model_registry=request.app.state.model_registry,
        model_cache=request.app.state.model_cache,
        progress_registry=request.app.state.progress_registry,
        cancellation_registry=request.app.state.cancellation_registry,
    )
    result = pipeline.run(analysis_request)
    request.app.state.analysis_results[result.runId] = result
    return result


@router.get("/{run_id}")
async def load_analysis(request: Request, run_id: str) -> AnalysisResult:
    result = request.app.state.analysis_results.get(run_id)

    if result is not None:
        return result

    settings = request.app.state.settings
    assert settings.reports_dir is not None
    result_path = settings.reports_dir / run_id / "analysis-result.json"

    if not result_path.exists():
        raise NotFoundError(f"Analysis result not found: {run_id}")

    payload = json.loads(result_path.read_text(encoding="utf-8"))
    result = AnalysisResult.model_validate(payload)
    request.app.state.analysis_results[run_id] = result
    return result


@router.get("/{run_id}/progress")
async def get_progress(request: Request, run_id: str) -> ProgressSnapshot:
    snapshot = request.app.state.progress_registry.get(run_id)

    if snapshot is None:
        raise NotFoundError(f"Analysis progress not found: {run_id}")

    return snapshot


@router.post("/{run_id}/cancel")
async def cancel_analysis(request: Request, run_id: str) -> ProgressSnapshot:
    cancelled = request.app.state.cancellation_registry.cancel(run_id)

    if not cancelled:
        raise NotFoundError(f"Analysis run not found or cannot be cancelled: {run_id}")

    snapshot = request.app.state.progress_registry.update(
        run_id,
        "cancelled",
        0,
        "Analysis cancellation requested.",
    )

    raise AnalysisCancelledError(
        f"Analysis run {run_id} was cancelled.",
        details=snapshot.model_dump(),
    )


# Backward-compatible helper used by CLI smoke tests from Module 4.
def build_placeholder_analysis_result(analysis_request: AnalysisRequest) -> AnalysisResult:
    source_path = Path(analysis_request.source.path)
    run_id = f"run_{uuid4().hex}"
    image, quality_report, import_warnings = build_image_and_quality_payload(analysis_request)

    region = DetectedRegion(
        regionId=f"reg_{uuid4().hex}",
        label="imported image canvas",
        category="unknown",
        confidence=0.0,
        bbox=BoundingBox(
            x=0,
            y=0,
            width=max(1, image.width),
            height=max(1, image.height),
        ),
        mask=None,
        sourceModelId="module-7-compatibility-scaffold",
        rationale="Compatibility helper for CLI smoke tests.",
        reviewStatus="unreviewed",
    )

    finding = Finding(
        findingId=f"find_{uuid4().hex}",
        title="Image import compatibility result",
        description="The engine produced a contract-valid compatibility result.",
        severity="info",
        confidence=1.0,
        regionIds=[region.regionId],
        evidenceRefs=["module7:compatibility"],
        recommendation="Use the /analysis API for the full Module 7 pipeline.",
    )

    result_hash = stable_hash(json.dumps(analysis_request.model_dump(), sort_keys=True))
    config_hash = stable_hash("module-7-compatibility-config")
    signature_value = stable_hash(f"{image.sha256}:{result_hash}:{config_hash}")

    receipt = AuditReceipt(
        schemaVersion="1.0.0",
        receiptId=f"receipt_{uuid4().hex}",
        runId=run_id,
        generatedAt=analysis_request.createdAt,
        inputHash=image.sha256,
        resultHash=result_hash,
        configHash=config_hash,
        modelRefs=[],
        artifactHashes=[],
        signature=AuditSignature(
            algorithm="sha256-local-integrity",
            value=signature_value,
        ),
    )

    return AnalysisResult(
        schemaVersion="1.0.0",
        runId=run_id,
        requestId=analysis_request.requestId,
        status="completed",
        createdAt=analysis_request.createdAt,
        completedAt=analysis_request.createdAt,
        image=image,
        modelInfo=[],
        qualityReport=quality_report,
        regions=[region],
        findings=[finding],
        auditReceipt=receipt,
        warnings=import_warnings,
    )


def build_image_and_quality_payload(
    analysis_request: AnalysisRequest,
) -> tuple[ImageMetadata, ImageQualityReport, list[str]]:
    source_path = Path(analysis_request.source.path)
    warnings: list[str] = []

    try:
        metadata = extract_image_metadata(
            source_path,
            include_exif=analysis_request.options.includeExif,
        )
        quality = compute_quality_signals(source_path)

        image = ImageMetadata(
            imageId=f"img_{metadata.sha256[:16]}",
            fileName=metadata.filename,
            sha256=metadata.sha256,
            mimeType=metadata.mimeType,
            width=metadata.width,
            height=metadata.height,
            sizeBytes=metadata.sizeBytes,
            exifPresent=metadata.exifPresent,
        )

        quality_report = ImageQualityReport(
            blurScore=quality.blurScore,
            brightness=quality.brightness,
            contrast=quality.contrast,
            glareRisk=quality.glareRisk,
            resolutionAdequate=quality.resolutionAdequate,
            warnings=quality.warnings,
        )

        return image, quality_report, warnings

    except EngineError as exc:
        warnings.append(f"Image import fallback used: {exc.message}")

    image_hash = analysis_request.source.sha256 or stable_hash(analysis_request.source.path)

    return (
        ImageMetadata(
            imageId=f"img_{uuid4().hex}",
            fileName=source_path.name or "unknown-image",
            sha256=image_hash,
            mimeType=guess_mime_type(source_path),
            width=1,
            height=1,
            sizeBytes=source_path.stat().st_size if source_path.exists() and source_path.is_file() else 0,
            exifPresent=False,
        ),
        ImageQualityReport(
            blurScore=0.0,
            brightness=0.0,
            contrast=0.0,
            glareRisk="none",
            resolutionAdequate=True,
            warnings=["Image quality analysis fallback was used."],
        ),
        warnings or ["Placeholder image metadata fallback used."],
    )


def stable_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def guess_mime_type(path: Path) -> str:
    extension = path.suffix.lower()
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
    }.get(extension, "application/octet-stream")

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import shutil
from uuid import uuid4

from veriframe_core.contracts.analysis import AnalysisResult
from veriframe_core.importing.hash_utils import compute_sha256
from veriframe_core.review.annotation_writer import AnnotationWriter
from veriframe_core.review.correction_models import FindingReview, RegionCorrection
from veriframe_core.review.review_repository import ReviewExportRecord, ReviewRepository


@dataclass(frozen=True, slots=True)
class DatasetExportResult:
    exportId: str
    runId: str
    datasetPath: str
    annotationPath: str
    imagePath: str | None
    correctionCount: int
    findingReviewCount: int
    sha256: str
    createdAt: str


class DatasetExporter:
    def __init__(self, writer: AnnotationWriter | None = None) -> None:
        self.writer = writer or AnnotationWriter()

    def export(
        self,
        *,
        result: AnalysisResult,
        corrections: list[RegionCorrection],
        finding_reviews: list[FindingReview],
        output_dir: str | Path,
        source_image_path: str | Path | None = None,
        repository: ReviewRepository | None = None,
    ) -> DatasetExportResult:
        dataset_dir = Path(output_dir) / result.runId
        images_dir = dataset_dir / "images"
        annotations_dir = dataset_dir / "annotations"
        images_dir.mkdir(parents=True, exist_ok=True)
        annotations_dir.mkdir(parents=True, exist_ok=True)

        copied_image_path: Path | None = None
        if source_image_path is not None and Path(source_image_path).exists():
            suffix = Path(source_image_path).suffix or ".jpg"
            copied_image_path = images_dir / f"{result.image.imageId}{suffix}"
            shutil.copy2(source_image_path, copied_image_path)

        annotation_path = annotations_dir / f"{result.runId}.json"
        self.writer.write(
            result=result,
            corrections=corrections,
            output_path=annotation_path,
            image_path=str(copied_image_path) if copied_image_path else result.image.fileName,
        )

        manifest_path = dataset_dir / "manifest.json"
        created_at = datetime.now(timezone.utc).isoformat()
        export_id = f"review_export_{uuid4().hex}"
        manifest_payload = {
            "schemaVersion": "1.0.0",
            "exportId": export_id,
            "runId": result.runId,
            "annotationPath": str(annotation_path),
            "imagePath": str(copied_image_path) if copied_image_path else None,
            "correctionCount": len(corrections),
            "findingReviewCount": len(finding_reviews),
            "createdAt": created_at,
            "findingReviews": [review.model_dump() for review in finding_reviews],
        }
        manifest_path.write_text(json.dumps(manifest_payload, indent=2), encoding="utf-8")
        digest = compute_sha256(annotation_path)

        export = DatasetExportResult(
            exportId=export_id,
            runId=result.runId,
            datasetPath=str(dataset_dir),
            annotationPath=str(annotation_path),
            imagePath=str(copied_image_path) if copied_image_path else None,
            correctionCount=len(corrections),
            findingReviewCount=len(finding_reviews),
            sha256=digest,
            createdAt=created_at,
        )

        if repository is not None:
            repository.insert_export_record(
                ReviewExportRecord(
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
            )

        return export

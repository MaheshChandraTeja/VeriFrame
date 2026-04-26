from __future__ import annotations

from pathlib import Path

from veriframe_core.contracts.analysis import AnalysisResult, DetectedRegion
from veriframe_core.datasets.annotation_schema import (
    AnnotationBox,
    AnnotationRegion,
    VisualAuditAnnotation,
)
from veriframe_core.review.correction_models import RegionCorrection


class AnnotationWriter:
    def build_annotation(
        self,
        *,
        result: AnalysisResult,
        corrections: list[RegionCorrection],
        image_path: str | None = None,
        split: str = "unassigned",
    ) -> VisualAuditAnnotation:
        regions = self.apply_corrections(result.regions, corrections)

        return VisualAuditAnnotation(
            schemaVersion="1.0.0",
            imagePath=image_path or result.image.fileName,
            imageSha256=result.image.sha256,
            width=result.image.width,
            height=result.image.height,
            split=split,  # type: ignore[arg-type]
            regions=[
                AnnotationRegion(
                    regionId=region.regionId,
                    label=region.label,
                    category=region.category,
                    bbox=AnnotationBox(
                        x=region.bbox.x,
                        y=region.bbox.y,
                        width=region.bbox.width,
                        height=region.bbox.height,
                    ),
                    mask=None,
                    metadata={
                        "sourceModelId": region.sourceModelId,
                        "confidence": region.confidence,
                        "reviewStatus": region.reviewStatus,
                    },
                )
                for region in regions
            ],
            metadata={
                "sourceRunId": result.runId,
                "sourceRequestId": result.requestId,
                "reviewed": True,
            },
        )

    def write(
        self,
        *,
        result: AnalysisResult,
        corrections: list[RegionCorrection],
        output_path: str | Path,
        image_path: str | None = None,
        split: str = "unassigned",
    ) -> Path:
        target = Path(output_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        annotation = self.build_annotation(
            result=result,
            corrections=corrections,
            image_path=image_path,
            split=split,
        )
        target.write_text(annotation.model_dump_json(indent=2), encoding="utf-8")
        return target

    def apply_corrections(
        self,
        regions: list[DetectedRegion],
        corrections: list[RegionCorrection],
    ) -> list[DetectedRegion]:
        by_id = {region.regionId: region for region in regions}

        for correction in corrections:
            if correction.action == "delete" and correction.regionId:
                by_id.pop(correction.regionId, None)
                continue

            by_id[correction.correctedRegion.regionId] = correction.correctedRegion

        return sorted(by_id.values(), key=lambda region: region.regionId)

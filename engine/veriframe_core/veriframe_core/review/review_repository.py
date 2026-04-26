from __future__ import annotations

import sqlite3
from dataclasses import dataclass

from veriframe_core.review.correction_models import FindingReview, RegionCorrection, ReviewSession


@dataclass(frozen=True, slots=True)
class ReviewExportRecord:
    exportId: str
    runId: str
    datasetPath: str
    annotationPath: str
    imagePath: str | None
    correctionCount: int
    findingReviewCount: int
    sha256: str
    createdAt: str


class ReviewRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def upsert_region_correction(self, correction: RegionCorrection) -> None:
        self.connection.execute(
            """
            INSERT INTO region_corrections (
                correction_id,
                run_id,
                region_id,
                action,
                original_region_json,
                corrected_region_json,
                label_before,
                label_after,
                box_before_json,
                box_after_json,
                notes,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(correction_id) DO UPDATE SET
                action = excluded.action,
                corrected_region_json = excluded.corrected_region_json,
                label_before = excluded.label_before,
                label_after = excluded.label_after,
                box_before_json = excluded.box_before_json,
                box_after_json = excluded.box_after_json,
                notes = excluded.notes,
                updated_at = excluded.updated_at
            """,
            (
                correction.correctionId,
                correction.runId,
                correction.regionId,
                correction.action,
                correction.originalRegion.model_dump_json() if correction.originalRegion else None,
                correction.correctedRegion.model_dump_json(),
                correction.labelCorrection.before if correction.labelCorrection else None,
                correction.labelCorrection.after if correction.labelCorrection else correction.correctedRegion.label,
                correction.boxCorrection.before.model_dump_json() if correction.boxCorrection and correction.boxCorrection.before else None,
                correction.boxCorrection.after.model_dump_json() if correction.boxCorrection else correction.correctedRegion.bbox.model_dump_json(),
                correction.notes,
                correction.createdAt,
                correction.updatedAt,
            ),
        )

    def upsert_finding_review(self, review: FindingReview) -> None:
        self.connection.execute(
            """
            INSERT INTO finding_reviews (
                review_id,
                run_id,
                finding_id,
                decision,
                notes,
                reviewer,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(review_id) DO UPDATE SET
                decision = excluded.decision,
                notes = excluded.notes,
                reviewer = excluded.reviewer,
                updated_at = excluded.updated_at
            """,
            (
                review.reviewId,
                review.runId,
                review.findingId,
                review.decision,
                review.notes,
                review.reviewer,
                review.createdAt,
                review.updatedAt,
            ),
        )

    def list_region_corrections(self, run_id: str) -> list[RegionCorrection]:
        rows = self.connection.execute(
            """
            SELECT
                correction_id,
                run_id,
                region_id,
                action,
                original_region_json,
                corrected_region_json,
                label_before,
                label_after,
                box_before_json,
                box_after_json,
                notes,
                created_at,
                updated_at
            FROM region_corrections
            WHERE run_id = ?
            ORDER BY created_at ASC
            """,
            (run_id,),
        ).fetchall()

        return [self._row_to_region_correction(row) for row in rows]

    def list_finding_reviews(self, run_id: str) -> list[FindingReview]:
        rows = self.connection.execute(
            """
            SELECT review_id, run_id, finding_id, decision, notes, reviewer, created_at, updated_at
            FROM finding_reviews
            WHERE run_id = ?
            ORDER BY created_at ASC
            """,
            (run_id,),
        ).fetchall()

        return [
            FindingReview(
                reviewId=row["review_id"],
                runId=row["run_id"],
                findingId=row["finding_id"],
                decision=row["decision"],
                notes=row["notes"],
                reviewer=row["reviewer"],
                createdAt=row["created_at"],
                updatedAt=row["updated_at"],
            )
            for row in rows
        ]

    def get_session(self, run_id: str, *, total_findings: int = 0) -> ReviewSession:
        corrections = self.list_region_corrections(run_id)
        finding_reviews = self.list_finding_reviews(run_id)
        reviewed_ids = {review.findingId for review in finding_reviews}
        unresolved = max(0, total_findings - len(reviewed_ids))

        return ReviewSession(
            runId=run_id,
            corrections=corrections,
            findingReviews=finding_reviews,
            correctionCount=len(corrections),
            findingReviewCount=len(finding_reviews),
            unresolvedFindingCount=unresolved,
        )

    def insert_export_record(self, record: ReviewExportRecord) -> None:
        self.connection.execute(
            """
            INSERT INTO review_exports (
                export_id,
                run_id,
                dataset_path,
                annotation_path,
                image_path,
                correction_count,
                finding_review_count,
                sha256,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(export_id) DO NOTHING
            """,
            (
                record.exportId,
                record.runId,
                record.datasetPath,
                record.annotationPath,
                record.imagePath,
                record.correctionCount,
                record.findingReviewCount,
                record.sha256,
                record.createdAt,
            ),
        )

    def _row_to_region_correction(self, row: sqlite3.Row) -> RegionCorrection:
        from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion
        from veriframe_core.review.correction_models import BoxCorrection, LabelCorrection

        original = (
            DetectedRegion.model_validate_json(row["original_region_json"])
            if row["original_region_json"]
            else None
        )
        corrected = DetectedRegion.model_validate_json(row["corrected_region_json"])

        label_correction = None
        if row["label_after"] is not None:
            label_correction = LabelCorrection(before=row["label_before"], after=row["label_after"])

        box_correction = None
        if row["box_after_json"] is not None:
            box_correction = BoxCorrection(
                before=BoundingBox.model_validate_json(row["box_before_json"]) if row["box_before_json"] else None,
                after=BoundingBox.model_validate_json(row["box_after_json"]),
            )

        return RegionCorrection(
            correctionId=row["correction_id"],
            runId=row["run_id"],
            regionId=row["region_id"],
            action=row["action"],
            originalRegion=original,
            correctedRegion=corrected,
            labelCorrection=label_correction,
            boxCorrection=box_correction,
            maskCorrection=None,
            notes=row["notes"],
            createdAt=row["created_at"],
            updatedAt=row["updated_at"],
        )

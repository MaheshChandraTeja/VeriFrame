from __future__ import annotations

import sqlite3

from veriframe_core.contracts.analysis import DetectedRegion
from veriframe_core.storage.json_utils import dumps_json


class RegionRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def insert_many(self, *, run_id: str, regions: list[DetectedRegion]) -> None:
        self.connection.executemany(
            """
            INSERT INTO regions (
                region_id,
                run_id,
                label,
                category,
                confidence,
                bbox_json,
                mask_json,
                source_model_id,
                rationale,
                review_status,
                region_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(region_id) DO UPDATE SET
                label = excluded.label,
                category = excluded.category,
                confidence = excluded.confidence,
                bbox_json = excluded.bbox_json,
                mask_json = excluded.mask_json,
                source_model_id = excluded.source_model_id,
                rationale = excluded.rationale,
                review_status = excluded.review_status,
                region_json = excluded.region_json
            """,
            [
                (
                    region.regionId,
                    run_id,
                    region.label,
                    region.category,
                    region.confidence,
                    region.bbox.model_dump_json(),
                    region.mask.model_dump_json() if region.mask is not None else None,
                    region.sourceModelId,
                    region.rationale,
                    region.reviewStatus,
                    region.model_dump_json(),
                )
                for region in regions
            ],
        )

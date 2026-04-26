from __future__ import annotations

import sqlite3

from veriframe_core.contracts.analysis import Finding
from veriframe_core.storage.json_utils import dumps_json


class FindingRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def insert_many(self, *, run_id: str, findings: list[Finding]) -> None:
        self.connection.executemany(
            """
            INSERT INTO findings (
                finding_id,
                run_id,
                title,
                description,
                severity,
                confidence,
                region_ids_json,
                evidence_refs_json,
                recommendation,
                finding_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(finding_id) DO UPDATE SET
                title = excluded.title,
                description = excluded.description,
                severity = excluded.severity,
                confidence = excluded.confidence,
                region_ids_json = excluded.region_ids_json,
                evidence_refs_json = excluded.evidence_refs_json,
                recommendation = excluded.recommendation,
                finding_json = excluded.finding_json
            """,
            [
                (
                    finding.findingId,
                    run_id,
                    finding.title,
                    finding.description,
                    finding.severity,
                    finding.confidence,
                    dumps_json(finding.regionIds),
                    dumps_json(finding.evidenceRefs),
                    finding.recommendation,
                    finding.model_dump_json(),
                )
                for finding in findings
            ],
        )

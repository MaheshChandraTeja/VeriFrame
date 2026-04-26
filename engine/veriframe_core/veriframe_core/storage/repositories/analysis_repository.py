from __future__ import annotations

from dataclasses import dataclass
import sqlite3
from typing import Any

from veriframe_core.contracts.analysis import AnalysisResult
from veriframe_core.storage.json_utils import dumps_json


@dataclass(slots=True)
class AnalysisSummary:
    runId: str
    requestId: str
    status: str
    workflow: str
    sourcePath: str
    inputHash: str | None
    resultHash: str | None
    configHash: str | None
    createdAt: str
    completedAt: str | None
    findingCount: int
    regionCount: int
    artifactCount: int


class AnalysisRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def upsert_result(self, result: AnalysisResult, *, workflow: str, source_path: str) -> None:
        self.connection.execute(
            """
            INSERT INTO analysis_runs (
                run_id,
                request_id,
                status,
                workflow,
                source_path,
                input_hash,
                result_hash,
                config_hash,
                created_at,
                completed_at,
                result_json,
                warnings_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(run_id) DO UPDATE SET
                status = excluded.status,
                completed_at = excluded.completed_at,
                result_json = excluded.result_json,
                warnings_json = excluded.warnings_json,
                result_hash = excluded.result_hash,
                config_hash = excluded.config_hash
            """,
            (
                result.runId,
                result.requestId,
                result.status,
                workflow,
                source_path,
                result.auditReceipt.inputHash,
                result.auditReceipt.resultHash,
                result.auditReceipt.configHash,
                result.createdAt,
                result.completedAt,
                result.model_dump_json(),
                dumps_json(result.warnings),
            ),
        )

    def get_result(self, run_id: str) -> AnalysisResult | None:
        row = self.connection.execute(
            "SELECT result_json FROM analysis_runs WHERE run_id = ?",
            (run_id,),
        ).fetchone()

        if row is None:
            return None

        return AnalysisResult.model_validate_json(row["result_json"])

    def list_summaries(self, *, limit: int = 50) -> list[AnalysisSummary]:
        rows = self.connection.execute(
            """
            SELECT
                ar.run_id,
                ar.request_id,
                ar.status,
                ar.workflow,
                ar.source_path,
                ar.input_hash,
                ar.result_hash,
                ar.config_hash,
                ar.created_at,
                ar.completed_at,
                (SELECT COUNT(*) FROM findings f WHERE f.run_id = ar.run_id) AS finding_count,
                (SELECT COUNT(*) FROM regions r WHERE r.run_id = ar.run_id) AS region_count,
                (SELECT COUNT(*) FROM report_artifacts ra WHERE ra.run_id = ar.run_id) AS artifact_count
            FROM analysis_runs ar
            ORDER BY ar.created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

        return [
            AnalysisSummary(
                runId=row["run_id"],
                requestId=row["request_id"],
                status=row["status"],
                workflow=row["workflow"],
                sourcePath=row["source_path"],
                inputHash=row["input_hash"],
                resultHash=row["result_hash"],
                configHash=row["config_hash"],
                createdAt=row["created_at"],
                completedAt=row["completed_at"],
                findingCount=int(row["finding_count"]),
                regionCount=int(row["region_count"]),
                artifactCount=int(row["artifact_count"]),
            )
            for row in rows
        ]

    def delete_run_children(self, run_id: str) -> None:
        for table in ["images", "findings", "regions", "model_runs", "report_artifacts"]:
            self.connection.execute(f"DELETE FROM {table} WHERE run_id = ?", (run_id,))

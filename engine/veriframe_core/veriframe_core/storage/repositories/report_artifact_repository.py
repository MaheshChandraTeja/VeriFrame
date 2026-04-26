from __future__ import annotations

import sqlite3

from veriframe_core.contracts.storage import StoredReportArtifact


class ReportArtifactRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def upsert(self, artifact: StoredReportArtifact) -> None:
        self.connection.execute(
            """
            INSERT INTO report_artifacts (
                artifact_id,
                run_id,
                format,
                path,
                sha256,
                size_bytes,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(artifact_id) DO UPDATE SET
                format = excluded.format,
                path = excluded.path,
                sha256 = excluded.sha256,
                size_bytes = excluded.size_bytes,
                created_at = excluded.created_at
            """,
            (
                artifact.artifactId,
                artifact.runId,
                artifact.format,
                artifact.path,
                artifact.sha256,
                artifact.sizeBytes,
                artifact.createdAt,
            ),
        )

    def list_for_run(self, run_id: str) -> list[StoredReportArtifact]:
        rows = self.connection.execute(
            """
            SELECT artifact_id, run_id, format, path, sha256, size_bytes, created_at
            FROM report_artifacts
            WHERE run_id = ?
            ORDER BY created_at ASC
            """,
            (run_id,),
        ).fetchall()

        return [
            StoredReportArtifact(
                artifactId=row["artifact_id"],
                runId=row["run_id"],
                format=row["format"],
                path=row["path"],
                sha256=row["sha256"],
                sizeBytes=row["size_bytes"],
                createdAt=row["created_at"],
            )
            for row in rows
        ]

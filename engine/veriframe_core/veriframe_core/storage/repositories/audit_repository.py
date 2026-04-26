from __future__ import annotations

import sqlite3

from veriframe_core.contracts.storage import AuditLogEntry
from veriframe_core.storage.json_utils import dumps_json


class AuditRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def insert(self, entry: AuditLogEntry) -> None:
        self.connection.execute(
            """
            INSERT INTO audit_logs (
                entry_id,
                run_id,
                level,
                event_type,
                message,
                context_json,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(entry_id) DO NOTHING
            """,
            (
                entry.entryId,
                entry.runId,
                entry.level,
                entry.eventType,
                entry.message,
                dumps_json(entry.context) if entry.context is not None else None,
                entry.createdAt,
            ),
        )

    def list_for_run(self, run_id: str) -> list[AuditLogEntry]:
        rows = self.connection.execute(
            """
            SELECT entry_id, run_id, level, event_type, message, context_json, created_at
            FROM audit_logs
            WHERE run_id = ?
            ORDER BY created_at ASC
            """,
            (run_id,),
        ).fetchall()

        return [
            AuditLogEntry(
                entryId=row["entry_id"],
                runId=row["run_id"],
                level=row["level"],
                eventType=row["event_type"],
                message=row["message"],
                context=None if row["context_json"] is None else __import__("json").loads(row["context_json"]),
                createdAt=row["created_at"],
            )
            for row in rows
        ]

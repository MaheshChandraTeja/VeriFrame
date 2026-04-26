from __future__ import annotations

from datetime import datetime, timezone
import sqlite3
from uuid import uuid4

from veriframe_core.contracts.storage import AuditLogEntry
from veriframe_core.storage.repositories.audit_repository import AuditRepository


class AuditLogger:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.repository = AuditRepository(connection)

    def event(
        self,
        *,
        level: str,
        event_type: str,
        message: str,
        run_id: str | None = None,
        context: dict[str, object] | None = None,
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            entryId=f"audit_{uuid4().hex}",
            level=level,
            eventType=event_type,
            message=message,
            runId=run_id,
            context=context,
            createdAt=datetime.now(timezone.utc).isoformat(),
        )
        self.repository.insert(entry)
        return entry

    def info(
        self,
        *,
        event_type: str,
        message: str,
        run_id: str | None = None,
        context: dict[str, object] | None = None,
    ) -> AuditLogEntry:
        return self.event(
            level="info",
            event_type=event_type,
            message=message,
            run_id=run_id,
            context=context,
        )

    def warn(
        self,
        *,
        event_type: str,
        message: str,
        run_id: str | None = None,
        context: dict[str, object] | None = None,
    ) -> AuditLogEntry:
        return self.event(
            level="warn",
            event_type=event_type,
            message=message,
            run_id=run_id,
            context=context,
        )

    def error(
        self,
        *,
        event_type: str,
        message: str,
        run_id: str | None = None,
        context: dict[str, object] | None = None,
    ) -> AuditLogEntry:
        return self.event(
            level="error",
            event_type=event_type,
            message=message,
            run_id=run_id,
            context=context,
        )

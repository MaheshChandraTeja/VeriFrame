from __future__ import annotations

from datetime import datetime, timezone
import json
import sqlite3
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class EngineSetting(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    key: str = Field(min_length=1)
    value: Any
    updatedAt: str


class SettingsRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def get(self, key: str, default: Any = None) -> Any:
        row = self.connection.execute(
            "SELECT value_json FROM settings WHERE key = ?",
            (key,),
        ).fetchone()

        if row is None:
            return default

        return json.loads(row["value_json"])

    def set(self, key: str, value: Any) -> EngineSetting:
        updated_at = now_iso()
        self.connection.execute(
            """
            INSERT INTO settings(key, value_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value_json = excluded.value_json,
                updated_at = excluded.updated_at
            """,
            (key, json.dumps(value, sort_keys=True, default=str), updated_at),
        )
        return EngineSetting(key=key, value=value, updatedAt=updated_at)

    def set_many(self, payload: dict[str, Any]) -> list[EngineSetting]:
        return [self.set(key, value) for key, value in payload.items()]

    def list_all(self) -> dict[str, Any]:
        rows = self.connection.execute(
            "SELECT key, value_json FROM settings ORDER BY key ASC"
        ).fetchall()
        return {row["key"]: json.loads(row["value_json"]) for row in rows}

    def ensure_defaults(self) -> dict[str, Any]:
        defaults = default_settings()

        for key, value in defaults.items():
            if self.get(key, None) is None:
                self.set(key, value)

        return self.list_all()


def default_settings() -> dict[str, Any]:
    return {
        "privacy.includeExifByDefault": False,
        "privacy.cleanupTempOnExit": True,
        "privacy.telemetryEnabled": False,
        "model.devicePreference": "auto",
        "model.defaultConfidenceThreshold": 0.5,
        "model.defaultProfiles": ["receipt_region_detector"],
        "storage.maxCacheSizeMb": 2048,
        "storage.autoCleanupReports": False,
        "storage.keepAuditReceiptsForever": True,
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

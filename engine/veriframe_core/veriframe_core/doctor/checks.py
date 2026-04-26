from __future__ import annotations

from pathlib import Path
import sqlite3
from typing import Literal

from pydantic import BaseModel, ConfigDict

from veriframe_core.config import EngineSettings
from veriframe_core.models.model_registry import ModelRegistry
from veriframe_core.storage.database import Database


CheckStatus = Literal["pass", "warn", "fail"]


class DiagnosticCheck(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    checkId: str
    title: str
    status: CheckStatus
    message: str
    details: dict[str, object] = {}


def check_engine(settings: EngineSettings) -> DiagnosticCheck:
    try:
        settings.ensure_directories()
        return DiagnosticCheck(
            checkId="engine",
            title="Engine configuration",
            status="pass",
            message="Engine settings and directories are valid.",
            details={
                "appDataDir": str(settings.app_data_dir),
                "devicePreference": settings.device_preference,
            },
        )
    except Exception as exc:
        return DiagnosticCheck(
            checkId="engine",
            title="Engine configuration",
            status="fail",
            message=str(exc),
        )


def check_database(settings: EngineSettings) -> DiagnosticCheck:
    try:
        db = Database(settings=settings)
        applied = db.initialize()
        with db.connection() as connection:
            connection.execute("SELECT 1").fetchone()
        return DiagnosticCheck(
            checkId="database",
            title="SQLite database",
            status="pass",
            message="SQLite database is reachable and migrations are applied.",
            details={
                "databasePath": str(settings.database_path),
                "newMigrationsApplied": applied,
            },
        )
    except sqlite3.Error as exc:
        return DiagnosticCheck(
            checkId="database",
            title="SQLite database",
            status="fail",
            message=f"SQLite error: {exc}",
        )
    except Exception as exc:
        return DiagnosticCheck(
            checkId="database",
            title="SQLite database",
            status="fail",
            message=str(exc),
        )


def check_model_paths(settings: EngineSettings, registry: ModelRegistry | None = None) -> DiagnosticCheck:
    registry = registry or ModelRegistry.default()
    profiles = registry.list_profiles()
    missing_required = [
        profile.modelId
        for profile in profiles
        if profile.checkpointRequired
        and profile.checkpointPath
        and not Path(profile.checkpointPath).expanduser().exists()
    ]

    if missing_required:
        return DiagnosticCheck(
            checkId="model_paths",
            title="Model paths",
            status="fail",
            message="One or more required checkpoints are missing.",
            details={"missingRequired": missing_required},
        )

    return DiagnosticCheck(
        checkId="model_paths",
        title="Model paths",
        status="pass",
        message=f"{len(profiles)} model profile(s) are registered.",
        details={
            "modelDir": str(settings.model_dir),
            "profileCount": len(profiles),
        },
    )


def check_storage_permissions(settings: EngineSettings) -> DiagnosticCheck:
    paths = [
        settings.app_data_dir,
        settings.temp_dir,
        settings.reports_dir,
        settings.model_dir,
    ]
    failures: list[str] = []

    for path in paths:
        if path is None:
            continue

        try:
            path.mkdir(parents=True, exist_ok=True)
            probe = path / ".veriframe_write_probe"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
        except Exception as exc:
            failures.append(f"{path}: {exc}")

    if failures:
        return DiagnosticCheck(
            checkId="storage_permissions",
            title="Storage permissions",
            status="fail",
            message="One or more app directories are not writable.",
            details={"failures": failures},
        )

    return DiagnosticCheck(
        checkId="storage_permissions",
        title="Storage permissions",
        status="pass",
        message="App storage directories are writable.",
        details={"checkedPaths": [str(path) for path in paths if path is not None]},
    )


def run_all_checks(settings: EngineSettings) -> list[DiagnosticCheck]:
    return [
        check_engine(settings),
        check_database(settings),
        check_model_paths(settings),
        check_storage_permissions(settings),
    ]

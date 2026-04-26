from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Request

from veriframe_core.api.auth import require_local_token
from veriframe_core.doctor.checks import (
    check_database,
    check_engine,
    check_model_paths,
    check_storage_permissions,
    run_all_checks,
)
from veriframe_core.doctor.system_info import collect_system_info

router = APIRouter(
    prefix="/doctor",
    tags=["doctor"],
    dependencies=[Depends(require_local_token)],
)


@router.get("/checks")
async def all_checks(request: Request) -> dict[str, object]:
    checks = run_all_checks(request.app.state.settings)
    return {"checks": [check.model_dump() for check in checks]}


@router.get("/check-engine")
async def engine_check(request: Request) -> dict[str, object]:
    return check_engine(request.app.state.settings).model_dump()


@router.get("/check-database")
async def database_check(request: Request) -> dict[str, object]:
    return check_database(request.app.state.settings).model_dump()


@router.get("/check-model-paths")
async def model_paths_check(request: Request) -> dict[str, object]:
    return check_model_paths(request.app.state.settings).model_dump()


@router.get("/check-storage-permissions")
async def storage_permissions_check(request: Request) -> dict[str, object]:
    return check_storage_permissions(request.app.state.settings).model_dump()


@router.get("/system-info")
async def system_info(request: Request) -> dict[str, object]:
    return collect_system_info(request.app.state.settings)


@router.get("/logs")
async def logs(request: Request, limit: int = 200) -> dict[str, object]:
    settings = request.app.state.settings
    safe_limit = max(1, min(int(limit), 1000))
    log_dir = resolve_log_dir(settings)

    if log_dir is None:
        return {
            "lines": [],
            "path": None,
            "message": "No log directory is configured.",
        }

    if not log_dir.exists():
        return {
            "lines": [],
            "path": str(log_dir),
            "message": "Log directory does not exist yet.",
        }

    candidates = sorted(
        [path for path in log_dir.glob("*.log") if path.is_file()],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )

    if not candidates:
        return {
            "lines": [],
            "path": str(log_dir),
            "message": "No log files found.",
        }

    latest = candidates[0]

    try:
        lines = latest.read_text(encoding="utf-8", errors="replace").splitlines()[-safe_limit:]
    except OSError as exc:
        return {
            "lines": [],
            "path": str(latest),
            "message": f"Unable to read log file: {exc}",
        }

    return {
        "lines": sanitize_log_lines(lines),
        "path": str(latest),
        "message": "Log tail loaded.",
    }


def resolve_log_dir(settings: Any) -> Path | None:
    """
    Resolve the engine log directory across older/newer EngineSettings shapes.

    Module history used both logs_dir/log_dir naming in different places. This
    endpoint must not crash because a settings object chose one noun over another,
    because that would be a very small hill for software to die on.
    """

    for attr in ("log_dir", "logs_dir"):
        value = getattr(settings, attr, None)
        if value:
            return Path(value).expanduser()

    app_data_dir = getattr(settings, "app_data_dir", None)
    if app_data_dir:
        return Path(app_data_dir).expanduser() / "logs"

    return None


def sanitize_log_lines(lines: list[str]) -> list[str]:
    redacted: list[str] = []

    for line in lines:
        redacted.append(
            line.replace("dev-token", "[redacted-token]")
                .replace("x-veriframe-token", "[redacted-header]")
        )

    return redacted

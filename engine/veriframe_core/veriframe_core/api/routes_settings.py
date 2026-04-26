from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from veriframe_core.api.auth import require_local_token
from veriframe_core.settings.settings_repository import SettingsRepository
from veriframe_core.storage.database import Database

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    dependencies=[Depends(require_local_token)],
)


class SettingsUpdateRequest(BaseModel):
    values: dict[str, object] = Field(default_factory=dict)


@router.get("")
async def get_settings(request: Request) -> dict[str, object]:
    db = Database(settings=request.app.state.settings)
    db.initialize()
    with db.connection() as connection:
        settings = SettingsRepository(connection).ensure_defaults()

    return {
        "settings": settings,
        "localOnly": True,
        "telemetry": False,
    }


@router.put("")
async def update_settings(request: Request, body: SettingsUpdateRequest) -> dict[str, object]:
    db = Database(settings=request.app.state.settings)
    db.initialize()
    with db.connection() as connection:
        repository = SettingsRepository(connection)
        changed = repository.set_many(body.values)
        settings = repository.list_all()

    return {
        "ok": True,
        "changed": [item.model_dump() for item in changed],
        "settings": settings,
    }

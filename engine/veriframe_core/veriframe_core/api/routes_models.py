from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from veriframe_core.api.auth import require_local_token
from veriframe_core.errors import ModelLoadError, NotFoundError
from veriframe_core.models.warmup import warmup_model

router = APIRouter(
    prefix="/models",
    tags=["models"],
    dependencies=[Depends(require_local_token)],
)


class ModelOperationRequest(BaseModel):
    modelId: str = Field(min_length=1)
    warmup: bool = False


class ModelOperationResponse(BaseModel):
    modelId: str
    loaded: bool
    device: str | None = None
    message: str
    warmup: dict[str, object] | None = None


@router.get("")
async def list_models(request: Request) -> dict[str, object]:
    registry = request.app.state.model_registry
    cache = request.app.state.model_cache

    return {
        "availableModels": [
            status.model_dump()
            for status in registry.list_statuses(
                loaded_model_ids=cache.loaded_ids(),
                loaded_devices=cache.loaded_devices(),
            )
        ],
        "loadedModels": [
            {
                "modelId": loaded.profile.modelId,
                "name": loaded.profile.name,
                "version": loaded.profile.version,
                "task": loaded.profile.task,
                "device": loaded.device,
                "labels": loaded.profile.labels,
            }
            for loaded in cache.list_loaded()
        ],
    }


@router.post("/load")
async def load_model(request: Request, body: ModelOperationRequest) -> ModelOperationResponse:
    registry = request.app.state.model_registry
    cache = request.app.state.model_cache
    settings = request.app.state.settings

    try:
        profile = registry.get_profile(body.modelId)
    except KeyError as exc:
        raise NotFoundError(f"Model profile not found: {body.modelId}") from exc

    status = registry.profile_status(profile)
    if not status.loadable:
        raise ModelLoadError(
            f"Model '{body.modelId}' requires a checkpoint, but no checkpoint is available.",
            details=status.model_dump(),
        )

    loaded = cache.load(profile, device_preference=settings.device_preference)
    warmup_payload = warmup_model(loaded).to_dict() if body.warmup else None

    return ModelOperationResponse(
        modelId=loaded.profile.modelId,
        loaded=True,
        device=loaded.device,
        message=f"Model '{loaded.profile.name}' is loaded on {loaded.device}.",
        warmup=warmup_payload,
    )


@router.post("/unload")
async def unload_model(request: Request, body: ModelOperationRequest) -> ModelOperationResponse:
    cache = request.app.state.model_cache
    removed = cache.unload(body.modelId)

    return ModelOperationResponse(
        modelId=body.modelId,
        loaded=False,
        device=None,
        message="Model unloaded." if removed else "Model was not loaded.",
    )

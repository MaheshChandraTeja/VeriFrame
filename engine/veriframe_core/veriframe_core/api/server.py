from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from veriframe_core.api.routes_analysis import router as analysis_router
from veriframe_core.api.routes_doctor import router as doctor_router
from veriframe_core.api.routes_health import router as health_router
from veriframe_core.api.routes_models import router as models_router
from veriframe_core.api.routes_reports import router as reports_router
from veriframe_core.api.routes_review import router as review_router
from veriframe_core.api.routes_settings import router as settings_router
from veriframe_core.config import EngineSettings, load_settings
from veriframe_core.errors import EngineError
from veriframe_core.logging_config import get_logger, setup_logging
from veriframe_core.models.cache import ModelCache
from veriframe_core.models.model_registry import ModelRegistry
from veriframe_core.runtime.cancellation import CancellationRegistry
from veriframe_core.runtime.progress import ProgressRegistry
from veriframe_core.storage.database import Database

logger = get_logger("api.server")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: EngineSettings = app.state.settings
    settings.ensure_directories()
    setup_logging(settings)
    Database(settings=settings).initialize()
    logger.info("VeriFrame engine API starting.")
    yield
    logger.info("VeriFrame engine API stopped.")


def create_app(
    settings: EngineSettings | None = None,
    *,
    token: str | None = None,
) -> FastAPI:
    settings = settings or load_settings()

    app = FastAPI(
        title="VeriFrame Core Engine",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    app.state.settings = settings
    app.state.session_token = token
    app.state.progress_registry = ProgressRegistry()
    app.state.cancellation_registry = CancellationRegistry()
    app.state.analysis_results: dict[str, Any] = {}
    app.state.model_registry = ModelRegistry.default()
    app.state.model_cache = ModelCache()

    app.add_exception_handler(EngineError, handle_engine_error)
    app.add_exception_handler(ValidationError, handle_validation_error)

    app.include_router(health_router)
    app.include_router(analysis_router)
    app.include_router(models_router)
    app.include_router(reports_router)
    app.include_router(review_router)
    app.include_router(settings_router)
    app.include_router(doctor_router)

    return app


async def handle_engine_error(_request: Request, exc: EngineError) -> JSONResponse:
    payload = exc.to_payload()

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "code": payload.code,
            "message": payload.message,
            "details": payload.details,
        },
    )


async def handle_validation_error(_request: Request, exc: ValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "code": "VALIDATION_ERROR",
            "message": "Request validation failed.",
            "details": exc.errors(),
        },
    )

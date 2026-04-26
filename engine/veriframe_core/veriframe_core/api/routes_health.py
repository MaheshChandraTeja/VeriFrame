from __future__ import annotations

from fastapi import APIRouter, Request

from veriframe_core.runtime.device import detect_device
from veriframe_core.version import (
    CONTRACT_SCHEMA_VERSION,
    ENGINE_NAME,
    ENGINE_VERSION,
    SUPPORTED_DESKTOP_PROTOCOL_VERSION,
)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> dict[str, object]:
    settings = request.app.state.settings
    device = detect_device(settings.device_preference)

    return {
        "ok": True,
        "engineName": ENGINE_NAME,
        "engineVersion": ENGINE_VERSION,
        "device": device.to_dict(),
        "directoriesReady": True,
    }


@router.get("/version")
async def version() -> dict[str, str]:
    return {
        "engineName": ENGINE_NAME,
        "engineVersion": ENGINE_VERSION,
        "contractSchemaVersion": CONTRACT_SCHEMA_VERSION,
        "desktopProtocolVersion": SUPPORTED_DESKTOP_PROTOCOL_VERSION,
    }


@router.get("/capabilities")
async def capabilities() -> dict[str, object]:
    return {
        "localOnly": True,
        "telemetry": False,
        "cloudUpload": False,
        "implementedModules": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "plannedCapabilities": [],
        "currentCapabilities": [
            "health_api",
            "token_auth",
            "cli",
            "analysis_contract_validation",
            "image_import",
            "metadata_extraction",
            "quality_signals",
            "dataset_registry",
            "torchvision_model_registry",
            "model_load_unload",
            "visual_audit_pipeline",
            "sqlite_storage",
            "audit_receipts",
            "report_exports",
            "human_review",
            "region_corrections",
            "finding_reviews",
            "review_dataset_export",
            "settings_repository",
            "doctor_diagnostics",
            "benchmark_scripts",
            "ci_workflows",
            "packaging_docs",
        ],
    }

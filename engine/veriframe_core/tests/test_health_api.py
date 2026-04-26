from pathlib import Path

from fastapi.testclient import TestClient

from veriframe_core.api.server import create_app
from veriframe_core.config import load_settings


def test_health_endpoint_is_available_without_token(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path)
    client = TestClient(create_app(settings=settings, token="secret"))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_version_endpoint_returns_engine_metadata(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path)
    client = TestClient(create_app(settings=settings, token="secret"))

    response = client.get("/version")

    assert response.status_code == 200
    assert response.json()["engineName"] == "veriframe-core"


def test_protected_models_endpoint_requires_token(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path)
    client = TestClient(create_app(settings=settings, token="secret"))

    response = client.get("/models")

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


def test_protected_models_endpoint_accepts_valid_token(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path)
    client = TestClient(create_app(settings=settings, token="secret"))

    response = client.get("/models", headers={"x-veriframe-token": "secret"})

    assert response.status_code == 200
    assert "availableModels" in response.json()

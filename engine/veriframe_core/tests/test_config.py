from pathlib import Path

from veriframe_core.config import load_settings


def test_load_settings_uses_override_paths(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path, log_level="debug", max_image_size=1024)

    assert settings.app_data_dir == tmp_path.resolve()
    assert settings.log_level == "DEBUG"
    assert settings.max_image_size == 1024
    assert settings.model_dir is not None
    assert settings.temp_dir is not None
    assert settings.reports_dir is not None
    assert settings.logs_dir is not None
    assert settings.database_path is not None
    assert settings.model_dir.exists()
    assert settings.temp_dir.exists()
    assert settings.reports_dir.exists()
    assert settings.logs_dir.exists()


def test_environment_overrides(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("VERIFRAME_APP_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("VERIFRAME_DEVICE", "cpu")

    settings = load_settings()

    assert settings.app_data_dir == tmp_path.resolve()
    assert settings.device_preference == "cpu"

from __future__ import annotations

import os
import platform
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

DevicePreference = Literal["auto", "cpu", "cuda", "mps"]
LogLevel = Literal["TRACE", "DEBUG", "INFO", "WARN", "ERROR"]


def default_app_data_dir() -> Path:
    override = os.getenv("VERIFRAME_APP_DATA_DIR")
    if override:
        return Path(override).expanduser().resolve()

    system = platform.system().lower()

    if system == "windows":
        base = os.getenv("APPDATA")
        if base:
            return Path(base) / "VeriFrame"

    if system == "darwin":
        return Path.home() / "Library" / "Application Support" / "VeriFrame"

    return Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "VeriFrame"


class EngineSettings(BaseModel):
    app_data_dir: Path = Field(default_factory=default_app_data_dir)
    model_dir: Path | None = None
    temp_dir: Path | None = None
    reports_dir: Path | None = None
    logs_dir: Path | None = None
    database_path: Path | None = None
    log_level: LogLevel = "INFO"
    max_image_size: int = Field(default=4096, ge=256, le=16384)
    device_preference: DevicePreference = "auto"

    @field_validator("log_level", mode="before")
    @classmethod
    def normalize_log_level(cls, value: str) -> str:
        return str(value).upper()

    @field_validator(
        "app_data_dir",
        "model_dir",
        "temp_dir",
        "reports_dir",
        "logs_dir",
        "database_path",
        mode="before",
    )
    @classmethod
    def expand_path(cls, value: str | Path | None) -> Path | None:
        if value is None:
            return None
        return Path(value).expanduser()

    @model_validator(mode="after")
    def fill_derived_paths(self) -> "EngineSettings":
        self.app_data_dir = self.app_data_dir.expanduser().resolve()

        if self.model_dir is None:
            self.model_dir = self.app_data_dir / "models"

        if self.temp_dir is None:
            self.temp_dir = self.app_data_dir / "temp"

        if self.reports_dir is None:
            self.reports_dir = self.app_data_dir / "reports"

        if self.logs_dir is None:
            self.logs_dir = self.app_data_dir / "logs"

        if self.database_path is None:
            self.database_path = self.app_data_dir / "veriframe.sqlite3"

        return self

    def ensure_directories(self) -> None:
        self.app_data_dir.mkdir(parents=True, exist_ok=True)
        assert self.model_dir is not None
        assert self.temp_dir is not None
        assert self.reports_dir is not None
        assert self.logs_dir is not None

        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

        if self.database_path is not None:
            self.database_path.parent.mkdir(parents=True, exist_ok=True)


def load_settings(**overrides: object) -> EngineSettings:
    env_values: dict[str, object] = {}

    mapping = {
        "VERIFRAME_APP_DATA_DIR": "app_data_dir",
        "VERIFRAME_MODEL_DIR": "model_dir",
        "VERIFRAME_TEMP_DIR": "temp_dir",
        "VERIFRAME_REPORTS_DIR": "reports_dir",
        "VERIFRAME_LOGS_DIR": "logs_dir",
        "VERIFRAME_DATABASE_PATH": "database_path",
        "VERIFRAME_LOG_LEVEL": "log_level",
        "VERIFRAME_MAX_IMAGE_SIZE": "max_image_size",
        "VERIFRAME_DEVICE": "device_preference",
    }

    for env_name, field_name in mapping.items():
        value = os.getenv(env_name)
        if value is not None:
            env_values[field_name] = int(value) if field_name == "max_image_size" else value

    env_values.update({key: value for key, value in overrides.items() if value is not None})

    settings = EngineSettings(**env_values)
    settings.ensure_directories()
    return settings

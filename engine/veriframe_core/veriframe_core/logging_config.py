from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from veriframe_core.config import EngineSettings

_LEVEL_MAP = {
    "TRACE": logging.DEBUG,
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARN": logging.WARNING,
    "ERROR": logging.ERROR,
}


def setup_logging(settings: EngineSettings) -> None:
    assert settings.logs_dir is not None
    settings.logs_dir.mkdir(parents=True, exist_ok=True)

    log_file = settings.logs_dir / "veriframe-engine.log"
    level = _LEVEL_MAP.get(settings.log_level, logging.INFO)

    root = logging.getLogger("veriframe_core")
    root.setLevel(level)
    root.handlers.clear()
    root.propagate = False

    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )

    console = logging.StreamHandler()
    console.setLevel(level)
    console.setFormatter(formatter)

    file_handler = RotatingFileHandler(
        filename=Path(log_file),
        maxBytes=2_000_000,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)

    root.addHandler(console)
    root.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"veriframe_core.{name}")

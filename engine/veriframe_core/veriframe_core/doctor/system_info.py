from __future__ import annotations

import os
import platform
import shutil
import sys
from pathlib import Path

from veriframe_core.config import EngineSettings
from veriframe_core.runtime.device import detect_device
from veriframe_core.version import ENGINE_VERSION


def collect_system_info(settings: EngineSettings) -> dict[str, object]:
    disk = shutil.disk_usage(settings.app_data_dir or Path.cwd())
    device = detect_device(settings.device_preference)

    return {
        "os": platform.system(),
        "osVersion": platform.version(),
        "architecture": platform.machine(),
        "pythonVersion": sys.version.split()[0],
        "engineVersion": ENGINE_VERSION,
        "processId": os.getpid(),
        "device": device.to_dict(),
        "appDataDir": str(settings.app_data_dir),
        "databasePath": str(settings.database_path),
        "reportsDir": str(settings.reports_dir),
        "tempDir": str(settings.temp_dir),
        "diskTotalBytes": disk.total,
        "diskFreeBytes": disk.free,
    }

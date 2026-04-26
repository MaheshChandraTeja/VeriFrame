from pathlib import Path

from veriframe_core.config import load_settings
from veriframe_core.doctor.checks import (
    check_database,
    check_engine,
    check_storage_permissions,
    run_all_checks,
)
from veriframe_core.doctor.system_info import collect_system_info


def test_doctor_checks_pass_for_temp_settings(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path / "app-data")

    assert check_engine(settings).status == "pass"
    assert check_database(settings).status == "pass"
    assert check_storage_permissions(settings).status == "pass"


def test_run_all_checks_returns_diagnostics(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path / "app-data")
    checks = run_all_checks(settings)

    assert {check.checkId for check in checks} >= {
        "engine",
        "database",
        "model_paths",
        "storage_permissions",
    }


def test_collect_system_info(tmp_path: Path) -> None:
    settings = load_settings(app_data_dir=tmp_path / "app-data")
    info = collect_system_info(settings)

    assert "pythonVersion" in info
    assert "engineVersion" in info
    assert "diskFreeBytes" in info

from pathlib import Path
from types import SimpleNamespace

from veriframe_core.api.routes_doctor import resolve_log_dir, sanitize_log_lines


def test_resolve_log_dir_prefers_log_dir(tmp_path: Path) -> None:
    settings = SimpleNamespace(log_dir=tmp_path / "explicit-logs", app_data_dir=tmp_path / "app-data")

    assert resolve_log_dir(settings) == tmp_path / "explicit-logs"


def test_resolve_log_dir_supports_logs_dir(tmp_path: Path) -> None:
    settings = SimpleNamespace(logs_dir=tmp_path / "logs-dir", app_data_dir=tmp_path / "app-data")

    assert resolve_log_dir(settings) == tmp_path / "logs-dir"


def test_resolve_log_dir_falls_back_to_app_data(tmp_path: Path) -> None:
    settings = SimpleNamespace(app_data_dir=tmp_path / "app-data")

    assert resolve_log_dir(settings) == tmp_path / "app-data" / "logs"


def test_sanitize_log_lines_redacts_tokens() -> None:
    lines = ["INFO token dev-token header x-veriframe-token"]

    assert sanitize_log_lines(lines) == ["INFO token [redacted-token] header [redacted-header]"]

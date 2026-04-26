from __future__ import annotations

import json
from pathlib import Path

from veriframe_core.cli import main


def test_cli_health_json_outputs_valid_payload(capsys) -> None:
    exit_code = main(["health", "--json"])
    captured = capsys.readouterr()

    assert exit_code == 0
    payload = json.loads(captured.out)
    assert payload["ok"] is True
    assert payload["engineName"] == "veriframe-core"


def test_cli_batch_lists_supported_images(tmp_path: Path, capsys) -> None:
    (tmp_path / "receipt.jpg").write_bytes(b"fake")
    (tmp_path / "notes.txt").write_text("ignore me", encoding="utf-8")

    exit_code = main(["batch", str(tmp_path)])
    captured = capsys.readouterr()

    assert exit_code == 0
    payload = json.loads(captured.out)
    assert len(payload["images"]) == 1
    assert payload["images"][0].endswith("receipt.jpg")


def test_cli_analyze_returns_placeholder_result(tmp_path: Path, capsys) -> None:
    image = tmp_path / "sample.png"
    image.write_bytes(b"fake")

    exit_code = main(["analyze", str(image)])
    captured = capsys.readouterr()

    assert exit_code == 0
    payload = json.loads(captured.out)
    assert payload["schemaVersion"] == "1.0.0"
    assert payload["status"] == "completed"

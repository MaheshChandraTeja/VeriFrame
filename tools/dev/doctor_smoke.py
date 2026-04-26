from __future__ import annotations

from pathlib import Path
import sys


def bootstrap_veriframe_core() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    engine_package_root = repo_root / "engine" / "veriframe_core"

    if not engine_package_root.exists():
        raise RuntimeError(f"Could not find VeriFrame engine package at: {engine_package_root}")

    engine_path = str(engine_package_root)
    if engine_path not in sys.path:
        sys.path.insert(0, engine_path)


bootstrap_veriframe_core()

from veriframe_core.config import load_settings
from veriframe_core.doctor.checks import run_all_checks


def main() -> int:
    settings = load_settings()
    checks = run_all_checks(settings)
    failed = [check for check in checks if check.status == "fail"]

    for check in checks:
        print(f"[{check.status.upper()}] {check.title}: {check.message}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

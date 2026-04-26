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

import argparse
import shutil
from pathlib import Path

from veriframe_core.config import load_settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Delete generated VeriFrame temp/report/cache files.")
    parser.add_argument("--reports", action="store_true")
    parser.add_argument("--temp", action="store_true")
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args(argv)

    settings = load_settings()
    targets: list[Path] = []

    if args.all or args.temp:
        targets.append(settings.temp_dir)
    if args.all or args.reports:
        targets.append(settings.reports_dir)

    removed: list[str] = []

    for target in targets:
        if target and target.exists():
            shutil.rmtree(target)
            target.mkdir(parents=True, exist_ok=True)
            removed.append(str(target))

    print({"removed": removed})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

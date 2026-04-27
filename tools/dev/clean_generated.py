from __future__ import annotations

import argparse
import shutil
import sys
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path


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


class CleanupStatus(StrEnum):
    REMOVED = "removed"
    CREATED = "created"
    ALREADY_CLEAN = "already_clean"
    NOT_CONFIGURED = "not_configured"


@dataclass(frozen=True)
class CleanupTarget:
    name: str
    path: Path | None


@dataclass(frozen=True)
class CleanupResult:
    target: CleanupTarget
    status: CleanupStatus


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Delete generated VeriFrame temp, report, and cache files."
    )
    parser.add_argument("--reports", action="store_true", help="Delete generated report artifacts.")
    parser.add_argument("--temp", action="store_true", help="Delete generated temporary files.")
    parser.add_argument("--all", action="store_true", help="Delete every generated cleanup target.")
    return parser.parse_args(argv)


def directory_has_content(path: Path) -> bool:
    return path.exists() and any(path.iterdir())


def clean_target(target: CleanupTarget) -> CleanupResult:
    if target.path is None:
        return CleanupResult(target, CleanupStatus.NOT_CONFIGURED)

    if not target.path.exists():
        target.path.mkdir(parents=True, exist_ok=True)
        return CleanupResult(target, CleanupStatus.CREATED)

    if not directory_has_content(target.path):
        return CleanupResult(target, CleanupStatus.ALREADY_CLEAN)

    shutil.rmtree(target.path)
    target.path.mkdir(parents=True, exist_ok=True)
    return CleanupResult(target, CleanupStatus.REMOVED)


def print_summary(selected: list[CleanupTarget], results: list[CleanupResult]) -> None:
    print()
    print("VeriFrame cleanup complete")
    print("=" * 28)

    if not selected:
        print()
        print("No cleanup target selected.")
        print()
        print("Use one of:")
        print("  python tools/dev/clean_generated.py --reports")
        print("  python tools/dev/clean_generated.py --temp")
        print("  python tools/dev/clean_generated.py --all")
        print()
        print("Status: NOOP")
        return

    print()
    print("Selected targets:")
    for target in selected:
        location = str(target.path) if target.path else "not configured"
        print(f"  - {target.name}: {location}")

    removed = [result for result in results if result.status == CleanupStatus.REMOVED]
    created = [result for result in results if result.status == CleanupStatus.CREATED]
    already_clean = [result for result in results if result.status == CleanupStatus.ALREADY_CLEAN]
    not_configured = [result for result in results if result.status == CleanupStatus.NOT_CONFIGURED]

    print()

    if removed:
        print("Removed and recreated:")
        for result in removed:
            print(f"  - {result.target.name}: {result.target.path}")

    if created:
        print("Created missing folders:")
        for result in created:
            print(f"  - {result.target.name}: {result.target.path}")

    if already_clean:
        print("Already clean:")
        for result in already_clean:
            print(f"  - {result.target.name}: {result.target.path}")

    if not_configured:
        print("Skipped because not configured:")
        for result in not_configured:
            print(f"  - {result.target.name}")

    print()
    print("Status: OK")


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    settings = load_settings()

    selected: list[CleanupTarget] = []

    if args.all or args.temp:
        selected.append(CleanupTarget("Temporary files", settings.temp_dir))

    if args.all or args.reports:
        selected.append(CleanupTarget("Reports", settings.reports_dir))

    results = [clean_target(target) for target in selected]
    print_summary(selected, results)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
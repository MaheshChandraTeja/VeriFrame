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
import json
import statistics
import time
from pathlib import Path

from veriframe_core.storage.database import Database


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Benchmark VeriFrame SQLite storage.")
    parser.add_argument("--iterations", type=int, default=250)
    parser.add_argument("--database", default=None)
    args = parser.parse_args(argv)

    db_path = Path(args.database) if args.database else Path(".veriframe-bench.sqlite3")
    db = Database(database_path=db_path)
    db.initialize()

    write_samples: list[float] = []
    read_samples: list[float] = []

    with db.connection() as connection:
        for index in range(args.iterations):
            start = time.perf_counter()
            connection.execute(
                """
                INSERT INTO settings(key, value_json, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value_json = excluded.value_json,
                    updated_at = excluded.updated_at
                """,
                (f"bench.{index}", "1", "2026-04-26T00:00:00Z"),
            )
            write_samples.append((time.perf_counter() - start) * 1000)

        for index in range(args.iterations):
            start = time.perf_counter()
            connection.execute("SELECT value_json FROM settings WHERE key = ?", (f"bench.{index}",)).fetchone()
            read_samples.append((time.perf_counter() - start) * 1000)

    result = {
        "benchmark": "sqlite_storage",
        "iterations": args.iterations,
        "writeMs": stats(write_samples),
        "readMs": stats(read_samples),
        "database": str(db_path),
    }

    print(json.dumps(result, indent=2))
    return 0


def stats(values: list[float]) -> dict[str, float]:
    ordered = sorted(values)
    return {
        "p50": round(ordered[int((len(ordered) - 1) * 0.50)], 6),
        "p95": round(ordered[int((len(ordered) - 1) * 0.95)], 6),
        "mean": round(statistics.mean(values), 6),
    }


if __name__ == "__main__":
    raise SystemExit(main())

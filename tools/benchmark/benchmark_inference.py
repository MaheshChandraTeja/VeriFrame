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

from veriframe_core.inference.thresholding import clamp_threshold


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Benchmark VeriFrame inference utilities.")
    parser.add_argument("--iterations", type=int, default=1000)
    parser.add_argument("--output", default=None)
    args = parser.parse_args(argv)

    samples: list[float] = []

    for _ in range(args.iterations):
        start = time.perf_counter()
        clamp_threshold(0.73)
        samples.append((time.perf_counter() - start) * 1000)

    result = {
        "benchmark": "inference_utilities",
        "iterations": args.iterations,
        "latencyMs": {
            "p50": percentile(samples, 50),
            "p95": percentile(samples, 95),
            "mean": round(statistics.mean(samples), 6),
        },
    }

    emit(result, args.output)
    return 0


def percentile(values: list[float], p: int) -> float:
    ordered = sorted(values)
    index = int((len(ordered) - 1) * p / 100)
    return round(ordered[index], 6)


def emit(result: dict[str, object], output: str | None) -> None:
    payload = json.dumps(result, indent=2)
    if output:
        Path(output).write_text(payload, encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    raise SystemExit(main())

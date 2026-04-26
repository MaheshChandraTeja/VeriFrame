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

from PIL import Image

from veriframe_core.config import load_settings
from veriframe_core.contracts.analysis import AnalysisRequest, AnalysisSource
from veriframe_core.pipeline.analysis_pipeline import AnalysisPipeline


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Benchmark VeriFrame full pipeline.")
    parser.add_argument("--iterations", type=int, default=3)
    parser.add_argument("--workdir", default=".veriframe-pipeline-bench")
    args = parser.parse_args(argv)

    workdir = Path(args.workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    image_path = workdir / "bench.jpg"
    Image.new("RGB", (640, 480), color=(200, 200, 200)).save(image_path)

    settings = load_settings(app_data_dir=workdir / "app-data")
    samples: list[float] = []

    for index in range(args.iterations):
        request = AnalysisRequest(
            schemaVersion="1.0.0",
            requestId=f"bench_req_{index}",
            source=AnalysisSource(type="image_file", path=str(image_path), sha256=None),
            workflow="visual_audit",
            requestedTasks=["quality"],
            modelProfileIds=[],
            options={
                "confidenceThreshold": 0.5,
                "maxImageSizePx": 4096,
                "includeExif": False,
                "exportArtifacts": True,
            },
            createdAt="2026-04-26T00:00:00Z",
        )
        start = time.perf_counter()
        AnalysisPipeline(settings=settings).run(request, run_id=f"bench_run_{index}")
        samples.append((time.perf_counter() - start) * 1000)

    ordered = sorted(samples)
    print(json.dumps({
        "benchmark": "full_pipeline",
        "iterations": args.iterations,
        "latencyMs": {
            "p50": round(ordered[int((len(ordered) - 1) * 0.50)], 4),
            "p95": round(ordered[int((len(ordered) - 1) * 0.95)], 4),
            "mean": round(statistics.mean(samples), 4),
        },
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

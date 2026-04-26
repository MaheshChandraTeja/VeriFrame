from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from uuid import uuid4

import uvicorn

from veriframe_core.api.routes_analysis import build_placeholder_analysis_result
from veriframe_core.api.server import create_app
from veriframe_core.config import load_settings
from veriframe_core.contracts.analysis import AnalysisRequest, AnalysisSource
from veriframe_core.runtime.device import detect_device
from veriframe_core.version import ENGINE_NAME, ENGINE_VERSION


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "health":
        return command_health(args)

    if args.command == "analyze":
        return command_analyze(args)

    if args.command == "batch":
        return command_batch(args)

    if args.command == "export":
        return command_export(args)

    if args.command == "serve":
        return command_serve(args)

    parser.print_help()
    return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="veriframe",
        description="VeriFrame local Python engine.",
    )
    subparsers = parser.add_subparsers(dest="command")

    health = subparsers.add_parser("health", help="Print engine health.")
    health.add_argument("--json", action="store_true", help="Print machine-readable JSON.")

    analyze = subparsers.add_parser("analyze", help="Run placeholder analysis for one image.")
    analyze.add_argument("image", help="Path to image.")
    analyze.add_argument("--workflow", default="visual_audit")

    batch = subparsers.add_parser("batch", help="List supported images in a folder.")
    batch.add_argument("folder", help="Folder path.")

    export = subparsers.add_parser("export", help="Export is scaffolded in the API for now.")
    export.add_argument("run_id", help="Run id to export.")

    serve = subparsers.add_parser("serve", help="Start the localhost-only FastAPI sidecar.")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=32187)
    serve.add_argument("--token", default=None)
    serve.add_argument("--log-level", default=None)

    return parser


def command_health(args: argparse.Namespace) -> int:
    settings = load_settings()
    device = detect_device(settings.device_preference)

    payload = {
        "ok": True,
        "engineName": ENGINE_NAME,
        "engineVersion": ENGINE_VERSION,
        "device": device.to_dict(),
    }

    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        print(f"{ENGINE_NAME} {ENGINE_VERSION} · device={device.selected} · ok")

    return 0


def command_analyze(args: argparse.Namespace) -> int:
    image_path = Path(args.image)

    request = AnalysisRequest(
        schemaVersion="1.0.0",
        requestId=f"req_{uuid4().hex}",
        source=AnalysisSource(
            type="image_file",
            path=str(image_path),
            sha256=None,
        ),
        workflow=args.workflow,
        requestedTasks=["quality"],
        modelProfileIds=[],
        options={
            "confidenceThreshold": 0.5,
            "maxImageSizePx": 4096,
            "includeExif": False,
            "exportArtifacts": False,
        },
        createdAt="1970-01-01T00:00:00Z",
    )

    result = build_placeholder_analysis_result(request)
    print(result.model_dump_json(indent=2))
    return 0


def command_batch(args: argparse.Namespace) -> int:
    folder = Path(args.folder)

    if not folder.exists() or not folder.is_dir():
        print(f"Folder does not exist: {folder}", file=sys.stderr)
        return 1

    supported = sorted(
        str(path)
        for path in folder.iterdir()
        if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
    )

    print(json.dumps({"folder": str(folder), "images": supported}, indent=2))
    return 0


def command_export(args: argparse.Namespace) -> int:
    print(
        json.dumps(
            {
                "runId": args.run_id,
                "message": "CLI export persistence arrives after storage/report modules. Use API export for current in-memory runs.",
            },
            indent=2,
        )
    )
    return 0


def command_serve(args: argparse.Namespace) -> int:
    if args.host not in {"127.0.0.1", "localhost", "::1"}:
        print("Refusing to bind VeriFrame engine to a non-localhost interface.", file=sys.stderr)
        return 2

    settings = load_settings(log_level=args.log_level)
    app = create_app(settings=settings, token=args.token)

    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level=settings.log_level.lower(),
        access_log=False,
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

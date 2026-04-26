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
from pathlib import Path

from veriframe_core.models.loader import ModelLoader
from veriframe_core.models.model_registry import ModelRegistry


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export a local VeriFrame model profile to ONNX.")
    parser.add_argument("model_id")
    parser.add_argument("--output", default=None)
    args = parser.parse_args(argv)

    import torch

    profile = ModelRegistry.default().get_profile(args.model_id)
    loaded = ModelLoader().load(profile, device_preference="cpu")
    output = Path(args.output or f"{profile.modelId}.onnx")

    if profile.task in {"detection", "segmentation"}:
        raise SystemExit("Detection/segmentation ONNX export requires profile-specific tracing. Refusing to fake it.")

    dummy = torch.zeros(1, 3, 224, 224)
    torch.onnx.export(loaded.model, dummy, output, opset_version=17)
    print({"modelId": profile.modelId, "output": str(output)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

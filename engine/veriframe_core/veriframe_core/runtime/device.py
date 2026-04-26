from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from veriframe_core.config import DevicePreference


@dataclass(frozen=True, slots=True)
class DeviceInfo:
    selected: str
    cuda_available: bool
    mps_available: bool
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def detect_device(preference: DevicePreference = "auto") -> DeviceInfo:
    try:
        import torch
    except Exception:
        return DeviceInfo(
            selected="cpu",
            cuda_available=False,
            mps_available=False,
            reason="PyTorch is unavailable; falling back to CPU.",
        )

    cuda_available = bool(torch.cuda.is_available())
    mps_available = bool(
        getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available()
    )

    if preference == "cpu":
        return DeviceInfo("cpu", cuda_available, mps_available, "CPU explicitly requested.")

    if preference == "cuda":
        return DeviceInfo(
            "cuda" if cuda_available else "cpu",
            cuda_available,
            mps_available,
            "CUDA requested." if cuda_available else "CUDA requested but unavailable; using CPU.",
        )

    if preference == "mps":
        return DeviceInfo(
            "mps" if mps_available else "cpu",
            cuda_available,
            mps_available,
            "MPS requested." if mps_available else "MPS requested but unavailable; using CPU.",
        )

    if cuda_available:
        return DeviceInfo("cuda", cuda_available, mps_available, "Auto-selected CUDA.")

    if mps_available:
        return DeviceInfo("mps", cuda_available, mps_available, "Auto-selected MPS.")

    return DeviceInfo("cpu", cuda_available, mps_available, "Auto-selected CPU.")

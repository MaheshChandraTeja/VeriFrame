from __future__ import annotations

import time
from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class WarmupResult:
    modelId: str
    device: str
    elapsedMs: float
    success: bool
    message: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def warmup_model(loaded_model, *, image_size: int = 224) -> WarmupResult:
    start = time.perf_counter()

    try:
        import torch

        device = torch.device(loaded_model.device)
        dummy = torch.zeros((3, image_size, image_size), dtype=torch.float32, device=device)

        with torch.inference_mode():
            if loaded_model.profile.task in {"detection", "segmentation"}:
                loaded_model.model([dummy])
            else:
                loaded_model.model(dummy.unsqueeze(0))

        elapsed = (time.perf_counter() - start) * 1000
        return WarmupResult(
            modelId=loaded_model.model_id,
            device=loaded_model.device,
            elapsedMs=round(elapsed, 3),
            success=True,
            message="Warmup completed.",
        )
    except Exception as exc:
        elapsed = (time.perf_counter() - start) * 1000
        return WarmupResult(
            modelId=loaded_model.model_id,
            device=loaded_model.device,
            elapsedMs=round(elapsed, 3),
            success=False,
            message=str(exc),
        )

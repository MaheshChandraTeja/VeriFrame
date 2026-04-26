from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from veriframe_core.contracts.analysis import ModelInfo
from veriframe_core.importing.hash_utils import compute_bytes_sha256
from veriframe_core.models.loader import LoadedModel


class InferenceRunner(ABC):
    def __init__(self, loaded_model: LoadedModel) -> None:
        self.loaded_model = loaded_model

    def load(self) -> None:
        self.loaded_model.model.eval()

    @abstractmethod
    def predict(self, image_path: str, *, confidence_threshold: float = 0.5) -> Any:
        raise NotImplementedError

    def unload(self) -> None:
        pass

    def get_model_info(self) -> ModelInfo:
        profile = self.loaded_model.profile
        config_hash = compute_bytes_sha256(profile.model_dump_json().encode("utf-8"))

        return ModelInfo(
            modelId=profile.modelId,
            name=profile.name,
            version=profile.version,
            task=profile.task,
            framework="torchvision",
            device=self.loaded_model.device,
            labels=profile.labels,
            configHash=config_hash,
            checkpointHash=None,
        )

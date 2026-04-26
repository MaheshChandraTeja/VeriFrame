from __future__ import annotations

from dataclasses import dataclass, field
from threading import RLock

from veriframe_core.config import DevicePreference
from veriframe_core.models.loader import LoadedModel, ModelLoader
from veriframe_core.models.model_registry import ModelProfile


@dataclass(slots=True)
class ModelCache:
    loader: ModelLoader = field(default_factory=ModelLoader)
    _models: dict[str, LoadedModel] = field(default_factory=dict)
    _lock: RLock = field(default_factory=RLock)

    def load(self, profile: ModelProfile, *, device_preference: DevicePreference = "auto") -> LoadedModel:
        with self._lock:
            existing = self._models.get(profile.modelId)

            if existing is not None:
                return existing

            loaded = self.loader.load(profile, device_preference=device_preference)
            self._models[profile.modelId] = loaded
            return loaded

    def get(self, model_id: str) -> LoadedModel | None:
        with self._lock:
            return self._models.get(model_id)

    def unload(self, model_id: str) -> bool:
        with self._lock:
            removed = self._models.pop(model_id, None)

        if removed is not None:
            try:
                import gc
                import torch

                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except Exception:
                pass

        return removed is not None

    def list_loaded(self) -> list[LoadedModel]:
        with self._lock:
            return list(self._models.values())

    def loaded_ids(self) -> set[str]:
        with self._lock:
            return set(self._models.keys())

    def loaded_devices(self) -> dict[str, str]:
        with self._lock:
            return {model_id: loaded.device for model_id, loaded in self._models.items()}

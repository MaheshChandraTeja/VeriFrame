from __future__ import annotations

from dataclasses import dataclass

from veriframe_core.config import DevicePreference
from veriframe_core.runtime.device import detect_device


@dataclass(frozen=True, slots=True)
class SelectedDevice:
    name: str
    reason: str


class DeviceManager:
    def __init__(self, preference: DevicePreference = "auto") -> None:
        self.preference = preference
        self.info = detect_device(preference)

    @property
    def selected(self) -> SelectedDevice:
        return SelectedDevice(name=self.info.selected, reason=self.info.reason)

    def torch_device(self):
        import torch

        return torch.device(self.info.selected)

    def move_model(self, model):
        return model.to(self.torch_device())

    def move_tensor(self, tensor):
        return tensor.to(self.torch_device())

    def move_inputs(self, inputs):
        if isinstance(inputs, list):
            return [self.move_tensor(item) for item in inputs]
        return self.move_tensor(inputs)

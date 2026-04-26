from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from veriframe_core.config import DevicePreference
from veriframe_core.errors import ModelLoadError
from veriframe_core.models.device_manager import DeviceManager
from veriframe_core.models.model_registry import ModelProfile


@dataclass(slots=True)
class LoadedModel:
    profile: ModelProfile
    model: object
    device: str

    @property
    def model_id(self) -> str:
        return self.profile.modelId


class ModelLoader:
    def load(self, profile: ModelProfile, *, device_preference: DevicePreference = "auto") -> LoadedModel:
        device_manager = DeviceManager(device_preference)

        try:
            model = self._build_model(profile)
            self._load_checkpoint_if_present(model, profile)
            model.eval()
            model = device_manager.move_model(model)

            return LoadedModel(
                profile=profile,
                model=model,
                device=device_manager.selected.name,
            )
        except ModelLoadError:
            raise
        except Exception as exc:
            raise ModelLoadError(f"Failed to load model '{profile.modelId}': {exc}") from exc

    def _build_model(self, profile: ModelProfile):
        if profile.modelFamily == "fasterrcnn":
            return self._build_fasterrcnn(profile)

        if profile.modelFamily == "maskrcnn":
            return self._build_maskrcnn(profile)

        if profile.modelFamily == "resnet18":
            return self._build_resnet18(profile)

        raise ModelLoadError(f"Unsupported model family: {profile.modelFamily}")

    def _build_fasterrcnn(self, profile: ModelProfile):
        from torchvision.models.detection import fasterrcnn_resnet50_fpn
        from torchvision.models.detection.faster_rcnn import FastRCNNPredictor

        model = fasterrcnn_resnet50_fpn(weights=None, weights_backbone=None)
        num_classes = len(profile.labels) + 1
        in_features = model.roi_heads.box_predictor.cls_score.in_features
        model.roi_heads.box_predictor = FastRCNNPredictor(in_features, num_classes)
        return model

    def _build_maskrcnn(self, profile: ModelProfile):
        from torchvision.models.detection import maskrcnn_resnet50_fpn
        from torchvision.models.detection.faster_rcnn import FastRCNNPredictor
        from torchvision.models.detection.mask_rcnn import MaskRCNNPredictor

        model = maskrcnn_resnet50_fpn(weights=None, weights_backbone=None)
        num_classes = len(profile.labels) + 1

        box_in_features = model.roi_heads.box_predictor.cls_score.in_features
        model.roi_heads.box_predictor = FastRCNNPredictor(box_in_features, num_classes)

        mask_in_features = model.roi_heads.mask_predictor.conv5_mask.in_channels
        hidden_layer = 256
        model.roi_heads.mask_predictor = MaskRCNNPredictor(mask_in_features, hidden_layer, num_classes)

        return model

    def _build_resnet18(self, profile: ModelProfile):
        import torch.nn as nn
        from torchvision.models import resnet18

        model = resnet18(weights=None)
        model.fc = nn.Linear(model.fc.in_features, len(profile.labels))
        return model

    def _load_checkpoint_if_present(self, model, profile: ModelProfile) -> None:
        if not profile.checkpointPath:
            if profile.checkpointRequired:
                raise ModelLoadError(f"Checkpoint is required for model '{profile.modelId}'.")
            return

        checkpoint_path = Path(profile.checkpointPath).expanduser()

        if not checkpoint_path.exists():
            if profile.checkpointRequired:
                raise ModelLoadError(f"Checkpoint not found: {checkpoint_path}")
            return

        import torch

        payload = torch.load(checkpoint_path, map_location="cpu")
        state_dict = payload.get("state_dict", payload) if isinstance(payload, dict) else payload
        model.load_state_dict(state_dict, strict=False)

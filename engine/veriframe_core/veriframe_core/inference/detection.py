from __future__ import annotations

from veriframe_core.importing.image_loader import load_image
from veriframe_core.inference.base import InferenceRunner
from veriframe_core.models.output_parsers import parse_detection_output
from veriframe_core.preprocessing.transforms import TransformConfig, build_inference_transform


class DetectionInferenceRunner(InferenceRunner):
    def predict(self, image_path: str, *, confidence_threshold: float = 0.5):
        import torch

        loaded_image = load_image(image_path)
        transform = build_inference_transform(
            TransformConfig(
                resize_short_side=self.loaded_model.profile.preprocessing.resizeShortSide,
                normalize=False,
            )
        )
        tensor = transform(loaded_image.image).to(self.loaded_model.device)

        with torch.inference_mode():
            output = self.loaded_model.model([tensor])[0]

        return parse_detection_output(
            output,
            profile=self.loaded_model.profile,
            confidence_threshold=confidence_threshold,
        )

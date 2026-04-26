from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TransformConfig:
    resize_short_side: int | None = None
    center_crop: int | None = None
    normalize: bool = True


def build_inference_transform(config: TransformConfig | None = None):
    config = config or TransformConfig()

    from torchvision import transforms

    pipeline = []

    if config.resize_short_side is not None:
        pipeline.append(transforms.Resize(config.resize_short_side))

    if config.center_crop is not None:
        pipeline.append(transforms.CenterCrop(config.center_crop))

    pipeline.append(transforms.ToTensor())

    if config.normalize:
        pipeline.append(
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            )
        )

    return transforms.Compose(pipeline)

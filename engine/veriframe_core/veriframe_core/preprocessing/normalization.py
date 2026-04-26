from __future__ import annotations

import numpy as np
from PIL import Image


def ensure_rgb(image: Image.Image) -> Image.Image:
    return image.convert("RGB")


def resize_max_side(image: Image.Image, max_side: int) -> Image.Image:
    if max(image.size) <= max_side:
        return image

    copy = image.copy()
    copy.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return copy


def image_to_uint8_rgb_array(image: Image.Image) -> np.ndarray:
    return np.asarray(ensure_rgb(image), dtype=np.uint8)


def image_to_float_tensor_array(image: Image.Image) -> np.ndarray:
    array = image_to_uint8_rgb_array(image).astype(np.float32) / 255.0
    return np.transpose(array, (2, 0, 1))


def normalize_for_inference(
    image: Image.Image,
    *,
    max_side: int = 2048,
) -> np.ndarray:
    resized = resize_max_side(ensure_rgb(image), max_side)
    return image_to_float_tensor_array(resized)

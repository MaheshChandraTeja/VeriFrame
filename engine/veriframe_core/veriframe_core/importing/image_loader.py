from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import numpy as np
from PIL import Image, ImageOps

from veriframe_core.importing.file_validator import validate_image_file


@dataclass(frozen=True, slots=True)
class LoadedImage:
    path: Path
    image: Image.Image
    array_rgb: np.ndarray
    width: int
    height: int
    mode: str
    format: str | None
    exif_present: bool


def load_image(
    path: str | Path,
    *,
    mode: Literal["RGB", "RGBA", "L"] = "RGB",
    max_file_size_bytes: int | None = None,
) -> LoadedImage:
    validation_kwargs = {}
    if max_file_size_bytes is not None:
        validation_kwargs["max_file_size_bytes"] = max_file_size_bytes

    validation = validate_image_file(path, **validation_kwargs)

    with Image.open(validation.path) as opened:
        exif_present = bool(opened.getexif())
        normalized = ImageOps.exif_transpose(opened)
        converted = normalized.convert(mode)

    array_rgb = np.asarray(converted.convert("RGB"))

    return LoadedImage(
        path=validation.path,
        image=converted,
        array_rgb=array_rgb,
        width=converted.width,
        height=converted.height,
        mode=converted.mode,
        format=validation.pil_format,
        exif_present=exif_present,
    )

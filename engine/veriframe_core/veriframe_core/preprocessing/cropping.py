from __future__ import annotations

from dataclasses import dataclass

from PIL import Image


@dataclass(frozen=True, slots=True)
class CropBox:
    x: int
    y: int
    width: int
    height: int


def clamp_crop_box(
    box: CropBox,
    image_width: int,
    image_height: int,
    *,
    padding: int = 0,
) -> CropBox:
    x1 = max(0, box.x - padding)
    y1 = max(0, box.y - padding)
    x2 = min(image_width, box.x + box.width + padding)
    y2 = min(image_height, box.y + box.height + padding)

    if x2 <= x1 or y2 <= y1:
        raise ValueError("Crop box does not overlap the image.")

    return CropBox(x=x1, y=y1, width=x2 - x1, height=y2 - y1)


def crop_image(image: Image.Image, box: CropBox, *, padding: int = 0) -> Image.Image:
    clamped = clamp_crop_box(box, image.width, image.height, padding=padding)
    return image.crop((clamped.x, clamped.y, clamped.x + clamped.width, clamped.y + clamped.height))

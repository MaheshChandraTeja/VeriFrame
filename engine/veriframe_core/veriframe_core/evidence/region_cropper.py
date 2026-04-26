from __future__ import annotations

from pathlib import Path

from PIL import Image

from veriframe_core.contracts.analysis import DetectedRegion
from veriframe_core.preprocessing.cropping import CropBox, crop_image


def export_region_crops(
    *,
    image_path: str | Path,
    regions: list[DetectedRegion],
    output_dir: str | Path,
    padding: int = 8,
) -> list[Path]:
    target_dir = Path(output_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    if not regions:
        return []

    with Image.open(image_path) as opened:
        image = opened.convert("RGB")

    crop_paths: list[Path] = []

    for region in regions:
        crop = crop_image(
            image,
            CropBox(
                x=int(region.bbox.x),
                y=int(region.bbox.y),
                width=int(region.bbox.width),
                height=int(region.bbox.height),
            ),
            padding=padding,
        )
        output_path = target_dir / f"{region.regionId}.jpg"
        crop.save(output_path, format="JPEG", quality=88, optimize=True)
        crop_paths.append(output_path)

    return crop_paths

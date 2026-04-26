from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from veriframe_core.contracts.analysis import DetectedRegion


def render_overlay(
    *,
    image_path: str | Path,
    regions: list[DetectedRegion],
    output_path: str | Path,
) -> Path:
    source = Path(image_path)
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(source) as opened:
        image = opened.convert("RGBA")

    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    font = ImageFont.load_default()

    for index, region in enumerate(regions):
        color = color_for_index(index)
        x1 = region.bbox.x
        y1 = region.bbox.y
        x2 = region.bbox.x + region.bbox.width
        y2 = region.bbox.y + region.bbox.height

        draw.rectangle((x1, y1, x2, y2), outline=color, width=3)
        label = f"{region.label} {region.confidence:.0%}"
        label_box = draw.textbbox((x1, max(0, y1 - 14)), label, font=font)
        draw.rectangle(label_box, fill=(0, 0, 0, 180))
        draw.text((x1, max(0, y1 - 14)), label, fill=color, font=font)

    composed = Image.alpha_composite(image, overlay).convert("RGB")
    composed.save(target, format="PNG", optimize=True)
    return target


def color_for_index(index: int) -> tuple[int, int, int, int]:
    palette = [
        (56, 189, 248, 255),
        (74, 222, 128, 255),
        (250, 204, 21, 255),
        (251, 113, 133, 255),
        (196, 181, 253, 255),
        (251, 146, 60, 255),
    ]
    return palette[index % len(palette)]

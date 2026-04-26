from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from PIL import Image

from veriframe_core.importing.image_loader import load_image


def create_thumbnail(
    source_path: str | Path,
    output_dir: str | Path,
    *,
    max_size: tuple[int, int] = (320, 320),
    format: str = "WEBP",
    quality: int = 82,
) -> Path:
    output_directory = Path(output_dir)
    output_directory.mkdir(parents=True, exist_ok=True)

    loaded = load_image(source_path)
    thumbnail = loaded.image.copy()
    thumbnail.thumbnail(max_size, Image.Resampling.LANCZOS)

    normalized_format = format.upper()
    extension = "webp" if normalized_format == "WEBP" else "jpg"
    output_path = output_directory / f"thumb_{uuid4().hex}.{extension}"

    save_kwargs: dict[str, object] = {}
    if normalized_format in {"WEBP", "JPEG"}:
        save_kwargs["quality"] = quality
        save_kwargs["optimize"] = True

    thumbnail.save(output_path, format=normalized_format, **save_kwargs)
    return output_path

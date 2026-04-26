from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image
from pydantic import BaseModel, ConfigDict, Field

from veriframe_core.importing.file_validator import validate_image_file
from veriframe_core.importing.hash_utils import compute_perceptual_hash_placeholder, compute_sha256
from veriframe_core.importing.image_loader import load_image


class ImageImportMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    filename: str
    sourcePath: str
    sizeBytes: int = Field(ge=0)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    format: str
    mimeType: str
    exifPresent: bool
    createdAt: str | None
    modifiedAt: str
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    perceptualHash: str
    exif: dict[str, Any] | None = None


def extract_image_metadata(
    path: str | Path,
    *,
    include_exif: bool = False,
) -> ImageImportMetadata:
    validation = validate_image_file(path)
    loaded = load_image(validation.path)
    stat = validation.path.stat()

    exif_payload: dict[str, Any] | None = None
    if include_exif and loaded.exif_present:
        with Image.open(validation.path) as original:
            raw_exif = original.getexif()
            exif_payload = {str(key): stringify_exif_value(value) for key, value in raw_exif.items()}

    return ImageImportMetadata(
        filename=validation.path.name,
        sourcePath=str(validation.path),
        sizeBytes=validation.size_bytes,
        width=loaded.width,
        height=loaded.height,
        format=validation.pil_format,
        mimeType=validation.mime_type,
        exifPresent=loaded.exif_present,
        createdAt=timestamp_to_iso(get_created_time(stat)),
        modifiedAt=timestamp_to_iso(stat.st_mtime) or "",
        sha256=compute_sha256(validation.path),
        perceptualHash=compute_perceptual_hash_placeholder(loaded.image),
        exif=exif_payload,
    )


def get_created_time(stat_result: object) -> float | None:
    return getattr(stat_result, "st_birthtime", None) or getattr(stat_result, "st_ctime", None)


def timestamp_to_iso(value: float | None) -> str | None:
    if value is None:
        return None
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()


def stringify_exif_value(value: object) -> str | int | float | bool | None:
    if value is None or isinstance(value, str | int | float | bool):
        return value
    if isinstance(value, bytes):
        return f"<{len(value)} bytes>"
    return str(value)

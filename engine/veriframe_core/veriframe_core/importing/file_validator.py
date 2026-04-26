from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from PIL import Image, UnidentifiedImageError

from veriframe_core.errors import InvalidImageError

SupportedImageFormat = Literal["jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff"]

SUPPORTED_EXTENSIONS: frozenset[str] = frozenset(
    {"jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff"}
)
SUPPORTED_PIL_FORMATS: frozenset[str] = frozenset({"JPEG", "PNG", "WEBP", "BMP", "TIFF"})

DEFAULT_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
DEFAULT_MAX_PIXELS = 80_000_000


@dataclass(frozen=True, slots=True)
class ImageFileValidation:
    path: Path
    extension: str
    size_bytes: int
    pil_format: str
    width: int
    height: int
    mode: str

    @property
    def mime_type(self) -> str:
        return {
            "JPEG": "image/jpeg",
            "PNG": "image/png",
            "WEBP": "image/webp",
            "BMP": "image/bmp",
            "TIFF": "image/tiff",
        }.get(self.pil_format, "application/octet-stream")


def validate_image_file(
    path: str | Path,
    *,
    max_file_size_bytes: int = DEFAULT_MAX_FILE_SIZE_BYTES,
    max_pixels: int = DEFAULT_MAX_PIXELS,
) -> ImageFileValidation:
    candidate = Path(path).expanduser()
    reject_path_traversal(candidate)

    if not candidate.exists():
        raise InvalidImageError(f"Image file does not exist: {safe_display_path(candidate)}")

    if not candidate.is_file():
        raise InvalidImageError(f"Expected an image file: {safe_display_path(candidate)}")

    if candidate.is_symlink():
        raise InvalidImageError(f"Symbolic links are not accepted for image imports: {candidate.name}")

    extension = candidate.suffix.lower().lstrip(".")
    if extension not in SUPPORTED_EXTENSIONS:
        raise InvalidImageError(
            f"Unsupported image extension '.{extension}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}."
        )

    stat = candidate.stat()
    if stat.st_size <= 0:
        raise InvalidImageError(f"Image file is empty: {candidate.name}")

    if stat.st_size > max_file_size_bytes:
        raise InvalidImageError(f"Image file is too large: {candidate.name} ({stat.st_size} bytes).")

    try:
        with Image.open(candidate) as image:
            image.verify()

        with Image.open(candidate) as image:
            pil_format = image.format or ""
            width, height = image.size
            mode = image.mode
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise InvalidImageError(f"Image file is corrupted or unreadable: {candidate.name}") from exc

    if pil_format not in SUPPORTED_PIL_FORMATS:
        raise InvalidImageError(f"Unsupported image format '{pil_format}' for {candidate.name}.")

    if width <= 0 or height <= 0:
        raise InvalidImageError(f"Image has invalid dimensions: {candidate.name}")

    if width * height > max_pixels:
        raise InvalidImageError(f"Image dimensions are too large: {candidate.name} ({width}x{height}).")

    return ImageFileValidation(
        path=candidate.resolve(),
        extension=extension,
        size_bytes=stat.st_size,
        pil_format=pil_format,
        width=width,
        height=height,
        mode=mode,
    )


def reject_path_traversal(path: Path) -> None:
    if any(part == ".." for part in path.parts):
        raise InvalidImageError("Path traversal is not allowed for image imports.")


def safe_display_path(path: Path) -> str:
    return path.name or str(path)

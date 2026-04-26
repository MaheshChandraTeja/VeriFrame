from pathlib import Path

import pytest
from PIL import Image

from veriframe_core.errors import InvalidImageError
from veriframe_core.importing.file_validator import validate_image_file


def create_image(path: Path, size: tuple[int, int] = (64, 64)) -> None:
    Image.new("RGB", size, color=(32, 96, 160)).save(path)


def test_accepts_supported_image(tmp_path: Path) -> None:
    image_path = tmp_path / "receipt.jpg"
    create_image(image_path)

    result = validate_image_file(image_path)

    assert result.extension == "jpg"
    assert result.width == 64
    assert result.height == 64
    assert result.mime_type == "image/jpeg"


def test_rejects_unsupported_extension(tmp_path: Path) -> None:
    text_path = tmp_path / "notes.txt"
    text_path.write_text("not an image", encoding="utf-8")

    with pytest.raises(InvalidImageError) as exc:
        validate_image_file(text_path)

    assert exc.value.code == "INVALID_IMAGE"


def test_rejects_corrupted_image(tmp_path: Path) -> None:
    image_path = tmp_path / "broken.png"
    image_path.write_bytes(b"definitely not png")

    with pytest.raises(InvalidImageError):
        validate_image_file(image_path)


def test_rejects_file_over_size_limit(tmp_path: Path) -> None:
    image_path = tmp_path / "large.png"
    create_image(image_path, size=(128, 128))

    with pytest.raises(InvalidImageError):
        validate_image_file(image_path, max_file_size_bytes=4)


def test_rejects_parent_traversal() -> None:
    with pytest.raises(InvalidImageError):
        validate_image_file("../receipt.jpg")

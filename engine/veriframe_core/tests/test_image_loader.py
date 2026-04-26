from pathlib import Path

from PIL import Image

from veriframe_core.importing.image_loader import load_image
from veriframe_core.importing.metadata_extractor import extract_image_metadata


def test_loads_fixture_image_and_returns_rgb_array(tmp_path: Path) -> None:
    image_path = tmp_path / "sample.png"
    Image.new("RGB", (80, 60), color=(20, 120, 200)).save(image_path)

    loaded = load_image(image_path)

    assert loaded.width == 80
    assert loaded.height == 60
    assert loaded.mode == "RGB"
    assert loaded.array_rgb.shape == (60, 80, 3)


def test_handles_exif_orientation(tmp_path: Path) -> None:
    image_path = tmp_path / "oriented.jpg"
    image = Image.new("RGB", (40, 20), color=(255, 255, 255))
    exif = image.getexif()
    exif[274] = 6
    image.save(image_path, exif=exif)

    loaded = load_image(image_path)

    assert loaded.width == 20
    assert loaded.height == 40
    assert loaded.exif_present is True


def test_extracts_metadata_without_private_exif_payload(tmp_path: Path) -> None:
    image_path = tmp_path / "meta.jpg"
    Image.new("RGB", (32, 24), color=(1, 2, 3)).save(image_path)

    metadata = extract_image_metadata(image_path, include_exif=False)

    assert metadata.filename == "meta.jpg"
    assert metadata.width == 32
    assert metadata.height == 24
    assert metadata.sha256
    assert metadata.exif is None

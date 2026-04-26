from pathlib import Path

from PIL import Image, ImageFilter

from veriframe_core.preprocessing.quality import compute_quality_signals


def test_quality_detects_low_resolution_warning(tmp_path: Path) -> None:
    image_path = tmp_path / "small.png"
    Image.new("RGB", (64, 64), color=(80, 80, 80)).save(image_path)

    quality = compute_quality_signals(image_path)

    assert quality.resolutionAdequate is False
    assert any("resolution" in warning.lower() for warning in quality.warnings)


def test_quality_brightness_and_contrast_are_normalized(tmp_path: Path) -> None:
    image_path = tmp_path / "bright.png"
    Image.new("RGB", (640, 640), color=(240, 240, 240)).save(image_path)

    quality = compute_quality_signals(image_path)

    assert 0 <= quality.brightness <= 1
    assert 0 <= quality.contrast <= 1


def test_quality_blur_score_is_non_negative(tmp_path: Path) -> None:
    image_path = tmp_path / "blurred.png"
    image = Image.new("RGB", (640, 640), color=(120, 120, 120)).filter(
        ImageFilter.GaussianBlur(radius=4)
    )
    image.save(image_path)

    quality = compute_quality_signals(image_path)

    assert quality.blurScore >= 0
    assert quality.glareRisk in {"none", "low", "medium", "high"}

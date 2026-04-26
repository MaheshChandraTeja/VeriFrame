from pathlib import Path

from PIL import Image

from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion
from veriframe_core.evidence.overlay_renderer import render_overlay


def test_overlay_renderer_writes_png(tmp_path: Path) -> None:
    image_path = tmp_path / "sample.jpg"
    output_path = tmp_path / "overlay.png"
    Image.new("RGB", (240, 180), color=(24, 24, 24)).save(image_path)

    region = DetectedRegion(
        regionId="reg_1",
        label="receipt_header",
        category="receipt_header",
        confidence=0.88,
        bbox=BoundingBox(x=20, y=20, width=100, height=60),
        mask=None,
        sourceModelId="test",
        rationale="test",
        reviewStatus="unreviewed",
    )

    result = render_overlay(image_path=image_path, regions=[region], output_path=output_path)

    assert result.exists()
    assert result.suffix == ".png"

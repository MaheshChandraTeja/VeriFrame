from pathlib import Path

from PIL import Image

from veriframe_core.config import load_settings
from veriframe_core.contracts.analysis import AnalysisRequest, AnalysisSource, BoundingBox, DetectedRegion
from veriframe_core.pipeline.analysis_pipeline import AnalysisPipeline


def test_analysis_pipeline_runs_end_to_end_with_mocked_inference(tmp_path: Path) -> None:
    image_path = tmp_path / "receipt.jpg"
    Image.new("RGB", (640, 480), color=(210, 210, 210)).save(image_path)

    settings = load_settings(app_data_dir=tmp_path / "app-data")

    def fake_detection(profile, _image_path: str, _threshold: float):
        return [
            DetectedRegion(
                regionId="reg_price",
                label="price_label",
                category="price_label",
                confidence=0.92,
                bbox=BoundingBox(x=50, y=80, width=120, height=40),
                mask=None,
                sourceModelId=profile.modelId,
                rationale="mocked detection",
                reviewStatus="unreviewed",
            )
        ]

    request = AnalysisRequest(
        schemaVersion="1.0.0",
        requestId="req_pipeline",
        source=AnalysisSource(type="image_file", path=str(image_path), sha256=None),
        workflow="visual_audit",
        requestedTasks=["quality", "detection"],
        modelProfileIds=["receipt_region_detector"],
        options={
            "confidenceThreshold": 0.5,
            "maxImageSizePx": 4096,
            "includeExif": False,
            "exportArtifacts": True,
        },
        createdAt="2026-04-26T00:00:00Z",
    )

    pipeline = AnalysisPipeline(settings=settings, detection_runner=fake_detection)
    result = pipeline.run(request, run_id="run_test")

    assert result.status == "completed"
    assert result.image.width == 640
    assert len(result.regions) == 1
    assert len(result.findings) >= 1
    assert (settings.reports_dir / "run_test" / "evidence-overlay.png").exists()
    assert (settings.reports_dir / "run_test" / "analysis-result.json").exists()

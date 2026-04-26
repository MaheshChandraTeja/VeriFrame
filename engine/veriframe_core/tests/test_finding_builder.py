from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion, ImageQualityReport
from veriframe_core.explainability.finding_builder import FindingBuilder


def test_finding_builder_creates_region_and_quality_findings() -> None:
    region = DetectedRegion(
        regionId="reg_1",
        label="damage_zone",
        category="damage_zone",
        confidence=0.9,
        bbox=BoundingBox(x=10, y=10, width=100, height=100),
        mask=None,
        sourceModelId="damage_detector",
        rationale="test",
        reviewStatus="unreviewed",
    )
    quality = ImageQualityReport(
        blurScore=10,
        brightness=0.5,
        contrast=0.2,
        glareRisk="none",
        resolutionAdequate=False,
        warnings=["Image resolution may be too low for reliable analysis."],
    )

    findings = FindingBuilder().build(regions=[region], quality=quality, warnings=[])

    assert len(findings) == 2
    assert findings[0].severity == "high"
    assert findings[1].severity == "medium"

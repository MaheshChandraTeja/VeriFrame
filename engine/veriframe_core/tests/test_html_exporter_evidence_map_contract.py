from pathlib import Path

from veriframe_core.contracts.analysis import (
    AnalysisResult,
    AuditReceipt,
    AuditSignature,
    BoundingBox,
    DetectedRegion,
    Finding,
    ImageMetadata,
    ImageQualityReport,
)
from veriframe_core.reports.html_exporter import HtmlReportExporter
from veriframe_core.reports.report_builder import ReportBuilder


def test_html_exporter_uses_evidence_map_region_contract(tmp_path: Path) -> None:
    region = DetectedRegion(
        regionId="reg_1",
        label="price_label",
        category="price_label",
        confidence=0.9,
        bbox=BoundingBox(x=10, y=20, width=100, height=40),
        mask=None,
        sourceModelId="test_model",
        rationale="test",
        reviewStatus="unreviewed",
    )
    finding = Finding(
        findingId="find_1",
        title="Review price label",
        description="desc",
        severity="medium",
        confidence=0.9,
        regionIds=["reg_1"],
        evidenceRefs=["region:reg_1"],
        recommendation="Review manually.",
    )

    result = AnalysisResult(
        schemaVersion="1.0.0",
        runId="run_1",
        requestId="req_1",
        status="completed",
        createdAt="2026-04-26T00:00:00Z",
        completedAt="2026-04-26T00:00:00Z",
        image=ImageMetadata(
            imageId="img_1",
            fileName="receipt.jpg",
            sha256="a" * 64,
            mimeType="image/jpeg",
            width=640,
            height=480,
            sizeBytes=100,
            exifPresent=False,
        ),
        modelInfo=[],
        qualityReport=ImageQualityReport(
            blurScore=100,
            brightness=0.5,
            contrast=0.25,
            glareRisk="none",
            resolutionAdequate=True,
            warnings=[],
        ),
        regions=[region],
        findings=[finding],
        auditReceipt=AuditReceipt(
            schemaVersion="1.0.0",
            receiptId="receipt_1",
            runId="run_1",
            generatedAt="2026-04-26T00:00:00Z",
            inputHash="a" * 64,
            resultHash="b" * 64,
            configHash="c" * 64,
            modelRefs=[],
            artifactHashes=[],
            signature=AuditSignature(
                algorithm="sha256-local-integrity",
                value="d" * 64,
            ),
        ),
        warnings=[],
    )

    report = ReportBuilder().build(result)
    output_path = tmp_path / "report.html"

    HtmlReportExporter().export(report, output_path)

    html = output_path.read_text(encoding="utf-8")
    assert "Evidence Regions" in html
    assert "Bounding Box" in html
    assert "region:reg_1" in html

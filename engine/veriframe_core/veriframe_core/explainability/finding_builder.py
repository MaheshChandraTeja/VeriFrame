from __future__ import annotations

from uuid import uuid4

from veriframe_core.contracts.analysis import DetectedRegion, Finding, ImageQualityReport
from veriframe_core.explainability.rationale_templates import (
    QUALITY_RATIONALE_TEMPLATE,
    REGION_RATIONALE_TEMPLATE,
    REVIEW_RECOMMENDATIONS,
)
from veriframe_core.explainability.severity import (
    score_quality_warning_severity,
    score_region_severity,
)


class FindingBuilder:
    def build(
        self,
        *,
        regions: list[DetectedRegion],
        quality: ImageQualityReport | None,
        warnings: list[str],
    ) -> list[Finding]:
        findings: list[Finding] = []

        for region in regions:
            findings.append(self.from_region(region))

        if quality is not None:
            for warning in quality.warnings:
                findings.append(self.from_quality_warning(warning))

        for warning in warnings:
            findings.append(self.from_pipeline_warning(warning))

        if not findings:
            findings.append(
                Finding(
                    findingId=f"find_{uuid4().hex}",
                    title="No visual findings generated",
                    description="The pipeline completed but no model regions or quality warnings were produced.",
                    severity="info",
                    confidence=1.0,
                    regionIds=[],
                    evidenceRefs=[],
                    recommendation="Review image quality and model selection if findings were expected.",
                )
            )

        return findings

    def from_region(self, region: DetectedRegion) -> Finding:
        severity = score_region_severity(region)
        recommendation = REVIEW_RECOMMENDATIONS.get(region.category, REVIEW_RECOMMENDATIONS["unknown"])

        return Finding(
            findingId=f"find_{uuid4().hex}",
            title=f"Review {region.label}",
            description=REGION_RATIONALE_TEMPLATE.format(
                label=region.label,
                confidence=region.confidence,
                category=region.category,
            ),
            severity=severity,
            confidence=region.confidence,
            regionIds=[region.regionId],
            evidenceRefs=[f"region:{region.regionId}", "artifact:evidence_overlay"],
            recommendation=recommendation,
        )

    def from_quality_warning(self, warning: str) -> Finding:
        return Finding(
            findingId=f"find_{uuid4().hex}",
            title="Image quality warning",
            description=QUALITY_RATIONALE_TEMPLATE.format(warning=warning),
            severity=score_quality_warning_severity(warning),
            confidence=1.0,
            regionIds=[],
            evidenceRefs=["quality_report"],
            recommendation="Consider retaking or replacing the image if this warning affects review confidence.",
        )

    def from_pipeline_warning(self, warning: str) -> Finding:
        return Finding(
            findingId=f"find_{uuid4().hex}",
            title="Pipeline warning",
            description=warning,
            severity="info",
            confidence=1.0,
            regionIds=[],
            evidenceRefs=[],
            recommendation="Review pipeline configuration and loaded model state.",
        )

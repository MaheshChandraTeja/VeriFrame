from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from veriframe_core.contracts.analysis import AnalysisResult
from veriframe_core.contracts.report import EvidenceMap, EvidenceMapRegion, ReportSection, VisualReport


class ReportBuilder:
    def build(self, result: AnalysisResult) -> VisualReport:
        return VisualReport(
            schemaVersion="1.0.0",
            reportId=f"report_{uuid4().hex}",
            runId=result.runId,
            title=f"Visual audit for {result.image.fileName}",
            generatedAt=datetime.now(timezone.utc).isoformat(),
            image=result.image,
            qualityReport=result.qualityReport,
            models=result.modelInfo,
            sections=self._sections(result),
            findings=result.findings,
            evidenceMap=self._evidence_map(result),
            auditReceipt=result.auditReceipt,
        )

    def _sections(self, result: AnalysisResult) -> list[ReportSection]:
        severity_order = ["critical", "high", "medium", "low", "info"]
        sections: list[ReportSection] = []

        for severity in severity_order:
            finding_ids = [
                finding.findingId
                for finding in result.findings
                if finding.severity == severity
            ]

            if not finding_ids:
                continue

            label = severity.title()
            sections.append(
                ReportSection(
                    sectionId=f"severity_{severity}",
                    title=f"{label} review items",
                    summary=f"{len(finding_ids)} {severity} item(s) need review.",
                    findingIds=finding_ids,
                )
            )

        if not sections:
            sections.append(
                ReportSection(
                    sectionId="summary",
                    title="Summary",
                    summary="No findings were generated for this run.",
                    findingIds=[],
                )
            )

        return sections

    def _evidence_map(self, result: AnalysisResult) -> EvidenceMap:
        return EvidenceMap(
            schemaVersion="1.0.0",
            runId=result.runId,
            imageId=result.image.imageId,
            width=result.image.width,
            height=result.image.height,
            regions=[
                EvidenceMapRegion(
                    regionId=region.regionId,
                    label=region.label,
                    bbox=region.bbox,
                    confidence=region.confidence,
                    evidenceRefs=[f"region:{region.regionId}", "artifact:evidence_overlay"],
                )
                for region in result.regions
            ],
            generatedAt=datetime.now(timezone.utc).isoformat(),
        )

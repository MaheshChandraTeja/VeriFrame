from __future__ import annotations

from typing import Literal

from pydantic import Field

from veriframe_core.contracts.analysis import (
    AuditReceipt,
    BoundingBox,
    Finding,
    ImageMetadata,
    ImageQualityReport,
    ModelInfo,
    StrictModel,
)

ExportFormat = Literal["json", "html", "evidence_map", "audit_receipt"]


class ReportSection(StrictModel):
    sectionId: str = Field(min_length=1)
    title: str = Field(min_length=1)
    summary: str
    findingIds: list[str]


class EvidenceMapRegion(StrictModel):
    regionId: str = Field(min_length=1)
    label: str = Field(min_length=1)
    bbox: BoundingBox
    confidence: float = Field(ge=0, le=1)
    evidenceRefs: list[str]


class EvidenceMap(StrictModel):
    schemaVersion: Literal["1.0.0"]
    runId: str = Field(min_length=1)
    imageId: str = Field(min_length=1)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    regions: list[EvidenceMapRegion]
    generatedAt: str


class VisualReport(StrictModel):
    schemaVersion: Literal["1.0.0"]
    reportId: str = Field(min_length=1)
    runId: str = Field(min_length=1)
    title: str = Field(min_length=1)
    generatedAt: str
    image: ImageMetadata
    qualityReport: ImageQualityReport
    models: list[ModelInfo]
    sections: list[ReportSection]
    findings: list[Finding]
    evidenceMap: EvidenceMap
    auditReceipt: AuditReceipt

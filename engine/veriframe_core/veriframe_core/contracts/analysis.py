from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SchemaVersion = Literal["1.0.0"]
RequestedWorkflow = Literal[
    "visual_audit",
    "receipt_verification",
    "package_evidence",
    "device_display",
    "screenshot_review",
]
AnalysisTask = Literal[
    "quality",
    "detection",
    "segmentation",
    "classification",
    "evidence_overlay",
]
AnalysisStatus = Literal["queued", "running", "completed", "failed", "cancelled"]
FindingSeverity = Literal["info", "low", "medium", "high", "critical"]
RegionCategory = Literal[
    "receipt_header",
    "line_item_block",
    "price_label",
    "product_package",
    "damage_zone",
    "display_panel",
    "sensitive_region",
    "unknown",
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class AnalysisSource(StrictModel):
    type: Literal["image_file"]
    path: str = Field(min_length=1)
    sha256: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")


class AnalysisOptions(StrictModel):
    confidenceThreshold: float = Field(ge=0, le=1)
    maxImageSizePx: int = Field(ge=256, le=8192)
    includeExif: bool
    exportArtifacts: bool


class AnalysisRequest(StrictModel):
    schemaVersion: SchemaVersion
    requestId: str = Field(min_length=1)
    source: AnalysisSource
    workflow: RequestedWorkflow
    requestedTasks: list[AnalysisTask] = Field(min_length=1)
    modelProfileIds: list[str]
    options: AnalysisOptions
    createdAt: str


class ImageMetadata(StrictModel):
    imageId: str = Field(min_length=1)
    fileName: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    mimeType: str = Field(min_length=1)
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    sizeBytes: int = Field(ge=0)
    exifPresent: bool


class BoundingBox(StrictModel):
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)


class RleMask(StrictModel):
    counts: list[int]
    size: tuple[int, int]


class SegmentationMask(StrictModel):
    format: Literal["polygon", "rle"]
    points: list[tuple[float, float]] | None = None
    rle: RleMask | None = None


class DetectedRegion(StrictModel):
    regionId: str = Field(min_length=1)
    label: str = Field(min_length=1)
    category: RegionCategory
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox
    mask: SegmentationMask | None = None
    sourceModelId: str = Field(min_length=1)
    rationale: str = Field(min_length=1)
    reviewStatus: Literal["unreviewed", "accepted", "corrected", "rejected"]


class ImageQualityReport(StrictModel):
    blurScore: float = Field(ge=0)
    brightness: float = Field(ge=0)
    contrast: float = Field(ge=0)
    glareRisk: Literal["none", "low", "medium", "high"]
    resolutionAdequate: bool
    warnings: list[str]


class ModelInfo(StrictModel):
    modelId: str = Field(min_length=1)
    name: str = Field(min_length=1)
    version: str = Field(min_length=1)
    task: Literal["classification", "detection", "segmentation"]
    framework: Literal["torchvision"]
    device: Literal["cpu", "cuda", "mps"]
    labels: list[str]
    configHash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    checkpointHash: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")


class Finding(StrictModel):
    findingId: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    severity: FindingSeverity
    confidence: float = Field(ge=0, le=1)
    regionIds: list[str]
    evidenceRefs: list[str]
    recommendation: str = Field(min_length=1)


class AuditModelRef(StrictModel):
    modelId: str = Field(min_length=1)
    version: str = Field(min_length=1)
    configHash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    checkpointHash: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")


class AuditArtifactHash(StrictModel):
    artifactId: str = Field(min_length=1)
    path: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")


class AuditSignature(StrictModel):
    algorithm: Literal["sha256-local-integrity"]
    value: str = Field(pattern=r"^[a-fA-F0-9]{64}$")


class AuditReceipt(StrictModel):
    schemaVersion: SchemaVersion
    receiptId: str = Field(min_length=1)
    runId: str = Field(min_length=1)
    generatedAt: str
    inputHash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    resultHash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    configHash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    modelRefs: list[AuditModelRef]
    artifactHashes: list[AuditArtifactHash]
    signature: AuditSignature


class AnalysisResult(StrictModel):
    schemaVersion: SchemaVersion
    runId: str = Field(min_length=1)
    requestId: str = Field(min_length=1)
    status: AnalysisStatus
    createdAt: str
    completedAt: str | None = None
    image: ImageMetadata
    modelInfo: list[ModelInfo]
    qualityReport: ImageQualityReport
    regions: list[DetectedRegion]
    findings: list[Finding]
    auditReceipt: AuditReceipt
    warnings: list[str]

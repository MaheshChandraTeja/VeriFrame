from __future__ import annotations

from typing import Literal

from pydantic import Field

from veriframe_core.contracts.analysis import AnalysisStatus, FindingSeverity, StrictModel
from veriframe_core.contracts.report import ExportFormat

AuditLogLevel = Literal["trace", "debug", "info", "warn", "error"]


class StoredAnalysisRun(StrictModel):
    runId: str = Field(min_length=1)
    requestId: str = Field(min_length=1)
    status: AnalysisStatus
    workflow: str
    imageId: str
    createdAt: str
    completedAt: str | None = None
    errorCode: str | None = None
    errorMessage: str | None = None


class StoredImageRecord(StrictModel):
    imageId: str = Field(min_length=1)
    fileName: str
    sourcePath: str
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    mimeType: str
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    sizeBytes: int = Field(ge=0)
    importedAt: str


class StoredModelRegistryEntry(StrictModel):
    modelId: str
    name: str
    version: str
    task: Literal["classification", "detection", "segmentation"]
    framework: Literal["torchvision"]
    configPath: str
    checkpointPath: str | None = None
    configHash: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    checkpointHash: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")
    enabled: bool


class StoredReportArtifact(StrictModel):
    artifactId: str
    runId: str
    format: ExportFormat
    path: str
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    sizeBytes: int = Field(ge=0)
    createdAt: str


class AuditLogEntry(StrictModel):
    entryId: str
    level: AuditLogLevel
    eventType: str
    message: str
    runId: str | None = None
    context: dict[str, object] | None = None
    createdAt: str


class FindingIndexRecord(StrictModel):
    findingId: str
    runId: str
    severity: FindingSeverity
    confidence: float = Field(ge=0, le=1)
    title: str

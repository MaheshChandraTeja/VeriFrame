from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path

from veriframe_core.config import EngineSettings
from veriframe_core.contracts.analysis import (
    AnalysisRequest,
    AuditArtifactHash,
    DetectedRegion,
    Finding,
    ImageMetadata,
    ImageQualityReport,
    ModelInfo,
)
from veriframe_core.importing.image_loader import LoadedImage
from veriframe_core.importing.metadata_extractor import ImageImportMetadata
from veriframe_core.models.cache import ModelCache
from veriframe_core.models.model_registry import ModelProfile, ModelRegistry
from veriframe_core.runtime.cancellation import CancellationToken
from veriframe_core.runtime.progress import ProgressReporter


DetectionRunner = Callable[[ModelProfile, str, float], list[DetectedRegion]]


@dataclass(slots=True)
class PipelineContext:
    run_id: str
    request: AnalysisRequest
    settings: EngineSettings
    progress: ProgressReporter
    cancellation: CancellationToken
    model_registry: ModelRegistry
    model_cache: ModelCache
    output_dir: Path
    temp_dir: Path
    detection_runner: DetectionRunner | None = None

    image_path: Path = field(init=False)
    import_metadata: ImageImportMetadata | None = None
    loaded_image: LoadedImage | None = None
    image: ImageMetadata | None = None
    quality_report: ImageQualityReport | None = None
    regions: list[DetectedRegion] = field(default_factory=list)
    findings: list[Finding] = field(default_factory=list)
    model_info: list[ModelInfo] = field(default_factory=list)
    artifact_hashes: list[AuditArtifactHash] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    stage_outputs: dict[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.image_path = Path(self.request.source.path).expanduser()
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def assert_not_cancelled(self) -> None:
        from veriframe_core.errors import AnalysisCancelledError

        if self.cancellation.is_cancelled():
            raise AnalysisCancelledError(f"Analysis run was cancelled: {self.run_id}")

    def add_warning(self, warning: str) -> None:
        if warning not in self.warnings:
            self.warnings.append(warning)

    def add_artifact_hash(self, artifact: AuditArtifactHash) -> None:
        self.artifact_hashes.append(artifact)

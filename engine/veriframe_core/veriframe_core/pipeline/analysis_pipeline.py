from __future__ import annotations

import hashlib
import json
from pathlib import Path
from uuid import uuid4

from veriframe_core.config import EngineSettings, load_settings
from veriframe_core.contracts.analysis import (
    AnalysisRequest,
    AnalysisResult,
    AuditReceipt,
    AuditSignature,
)
from veriframe_core.models.cache import ModelCache
from veriframe_core.models.model_registry import ModelRegistry
from veriframe_core.pipeline.pipeline_context import DetectionRunner, PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage
from veriframe_core.pipeline.stages.detection_stage import DetectionStage
from veriframe_core.pipeline.stages.evidence_stage import EvidenceStage
from veriframe_core.pipeline.stages.findings_stage import FindingsStage
from veriframe_core.pipeline.stages.import_stage import ImportStage
from veriframe_core.pipeline.stages.quality_stage import QualityStage
from veriframe_core.pipeline.stages.segmentation_stage import SegmentationStage
from veriframe_core.postprocessing.confidence_calibration import calibrate_regions
from veriframe_core.postprocessing.region_merger import merge_overlapping_regions
from veriframe_core.runtime.cancellation import CancellationRegistry
from veriframe_core.runtime.progress import ProgressRegistry
from veriframe_core.storage.result_persistor import persist_analysis_result


class AnalysisPipeline:
    def __init__(
        self,
        *,
        settings: EngineSettings | None = None,
        model_registry: ModelRegistry | None = None,
        model_cache: ModelCache | None = None,
        progress_registry: ProgressRegistry | None = None,
        cancellation_registry: CancellationRegistry | None = None,
        stages: list[PipelineStage] | None = None,
        detection_runner: DetectionRunner | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        self.model_registry = model_registry or ModelRegistry.default()
        self.model_cache = model_cache or ModelCache()
        self.progress_registry = progress_registry or ProgressRegistry()
        self.cancellation_registry = cancellation_registry or CancellationRegistry()
        self.stages = stages or [
            ImportStage(),
            QualityStage(),
            DetectionStage(),
            SegmentationStage(),
            EvidenceStage(),
            FindingsStage(),
        ]
        self.detection_runner = detection_runner

    def run(self, request: AnalysisRequest, *, run_id: str | None = None) -> AnalysisResult:
        run_id = run_id or f"run_{uuid4().hex}"
        reporter = self.progress_registry.create(run_id, "Analysis pipeline queued.")
        token = self.cancellation_registry.create(run_id)

        assert self.settings.reports_dir is not None
        assert self.settings.temp_dir is not None

        context = PipelineContext(
            run_id=run_id,
            request=request,
            settings=self.settings,
            progress=reporter,
            cancellation=token,
            model_registry=self.model_registry,
            model_cache=self.model_cache,
            output_dir=self.settings.reports_dir / run_id,
            temp_dir=self.settings.temp_dir / run_id,
            detection_runner=self.detection_runner,
        )

        try:
            for stage in self.stages:
                context.assert_not_cancelled()
                context = stage.execute(context)

            context.regions = calibrate_regions(merge_overlapping_regions(context.regions))

            for stage in self.stages:
                if isinstance(stage, FindingsStage):
                    context.findings.clear()
                    stage.execute(context)
                    break

            result = self._build_result(context)
            self._persist_result(result, context.output_dir)
            persist_analysis_result(
                result,
                workflow=request.workflow,
                source_path=str(context.image_path),
            )
            reporter.update("completed", 100, "Analysis pipeline completed.")
            return result
        except Exception:
            reporter.update("failed", 100, "Analysis pipeline failed.")
            raise

    def _build_result(self, context: PipelineContext) -> AnalysisResult:
        if context.image is None:
            raise RuntimeError("Pipeline did not produce image metadata.")

        if context.quality_report is None:
            raise RuntimeError("Pipeline did not produce a quality report.")

        created_at = context.request.createdAt
        completed_at = created_at

        result_hash = stable_hash(
            {
                "runId": context.run_id,
                "requestId": context.request.requestId,
                "image": context.image.model_dump(),
                "regions": [region.model_dump() for region in context.regions],
                "findings": [finding.model_dump() for finding in context.findings],
                "warnings": context.warnings,
            }
        )
        config_hash = stable_hash(context.request.model_dump())
        signature_value = stable_hash(
            {
                "inputHash": context.image.sha256,
                "resultHash": result_hash,
                "configHash": config_hash,
                "artifactHashes": [artifact.model_dump() for artifact in context.artifact_hashes],
            }
        )

        receipt = AuditReceipt(
            schemaVersion="1.0.0",
            receiptId=f"receipt_{uuid4().hex}",
            runId=context.run_id,
            generatedAt=completed_at,
            inputHash=context.image.sha256,
            resultHash=result_hash,
            configHash=config_hash,
            modelRefs=[
                {
                    "modelId": model.modelId,
                    "version": model.version,
                    "configHash": model.configHash,
                    "checkpointHash": model.checkpointHash,
                }
                for model in context.model_info
            ],
            artifactHashes=context.artifact_hashes,
            signature=AuditSignature(
                algorithm="sha256-local-integrity",
                value=signature_value,
            ),
        )

        return AnalysisResult(
            schemaVersion="1.0.0",
            runId=context.run_id,
            requestId=context.request.requestId,
            status="completed",
            createdAt=created_at,
            completedAt=completed_at,
            image=context.image,
            modelInfo=context.model_info,
            qualityReport=context.quality_report,
            regions=context.regions,
            findings=context.findings,
            auditReceipt=receipt,
            warnings=context.warnings,
        )

    def _persist_result(self, result: AnalysisResult, output_dir: Path) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        result_path = output_dir / "analysis-result.json"
        result_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        return result_path


def stable_hash(payload: object) -> str:
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

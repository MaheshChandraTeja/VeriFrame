from __future__ import annotations

from veriframe_core.contracts.analysis import ImageQualityReport
from veriframe_core.pipeline.pipeline_context import PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage
from veriframe_core.preprocessing.quality import compute_quality_signals


class QualityStage(PipelineStage):
    name = "quality"

    def execute(self, context: PipelineContext) -> PipelineContext:
        context.assert_not_cancelled()
        self.update(context, 20, "Computing quality signals.")

        quality = compute_quality_signals(context.image_path)

        context.quality_report = ImageQualityReport(
            blurScore=quality.blurScore,
            brightness=quality.brightness,
            contrast=quality.contrast,
            glareRisk=quality.glareRisk,
            resolutionAdequate=quality.resolutionAdequate,
            warnings=quality.warnings,
        )
        context.stage_outputs[self.name] = quality.model_dump()
        return context

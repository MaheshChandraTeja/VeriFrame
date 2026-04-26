from __future__ import annotations

from veriframe_core.explainability.finding_builder import FindingBuilder
from veriframe_core.pipeline.pipeline_context import PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage


class FindingsStage(PipelineStage):
    name = "findings"

    def __init__(self, builder: FindingBuilder | None = None) -> None:
        self.builder = builder or FindingBuilder()

    def execute(self, context: PipelineContext) -> PipelineContext:
        context.assert_not_cancelled()
        self.update(context, 85, "Building explainable findings.")

        findings = self.builder.build(
            regions=context.regions,
            quality=context.quality_report,
            warnings=context.warnings,
        )
        context.findings.extend(findings)
        context.stage_outputs[self.name] = {"findingCount": len(findings)}
        return context

from __future__ import annotations

from veriframe_core.inference.batch_runner import runner_for_loaded_model
from veriframe_core.pipeline.pipeline_context import PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage


class SegmentationStage(PipelineStage):
    name = "segmentation"

    def execute(self, context: PipelineContext) -> PipelineContext:
        context.assert_not_cancelled()

        if "segmentation" not in context.request.requestedTasks:
            context.stage_outputs[self.name] = {
                "skipped": True,
                "reason": "Segmentation not requested.",
            }
            return context

        self.update(context, 55, "Running segmentation models.")

        added = 0
        for model_id in context.request.modelProfileIds:
            context.assert_not_cancelled()

            try:
                profile = context.model_registry.get_profile(model_id)
            except KeyError:
                context.add_warning(f"Model profile not found: {model_id}")
                continue

            if profile.task != "segmentation":
                continue

            loaded = context.model_cache.get(model_id)
            if loaded is None:
                context.add_warning(f"Segmentation model is not loaded and was skipped: {model_id}")
                continue

            runner = runner_for_loaded_model(loaded)
            regions = runner.predict(
                str(context.image_path),
                confidence_threshold=context.request.options.confidenceThreshold,
            )
            context.model_info.append(runner.get_model_info())
            context.regions.extend(regions)
            added += len(regions)

        context.stage_outputs[self.name] = {"regionCount": added}
        return context

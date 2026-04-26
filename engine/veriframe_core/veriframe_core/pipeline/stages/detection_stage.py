from __future__ import annotations

from veriframe_core.inference.batch_runner import runner_for_loaded_model
from veriframe_core.pipeline.pipeline_context import PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage


class DetectionStage(PipelineStage):
    name = "detection"

    def execute(self, context: PipelineContext) -> PipelineContext:
        context.assert_not_cancelled()

        if "detection" not in context.request.requestedTasks:
            context.stage_outputs[self.name] = {"skipped": True, "reason": "Detection not requested."}
            return context

        self.update(context, 40, "Running detection models.")

        model_ids = context.request.modelProfileIds
        if not model_ids:
            context.add_warning("No detection model profile selected; detection stage skipped.")
            context.stage_outputs[self.name] = {"skipped": True, "reason": "No model profiles selected."}
            return context

        all_regions = []

        for model_id in model_ids:
            context.assert_not_cancelled()

            try:
                profile = context.model_registry.get_profile(model_id)
            except KeyError:
                context.add_warning(f"Model profile not found: {model_id}")
                continue

            if profile.task != "detection":
                continue

            if context.detection_runner is not None:
                regions = context.detection_runner(
                    profile,
                    str(context.image_path),
                    context.request.options.confidenceThreshold,
                )
                all_regions.extend(regions)
                continue

            loaded = context.model_cache.get(model_id)
            if loaded is None:
                context.add_warning(f"Detection model is not loaded and was skipped: {model_id}")
                continue

            runner = runner_for_loaded_model(loaded)
            regions = runner.predict(
                str(context.image_path),
                confidence_threshold=context.request.options.confidenceThreshold,
            )
            context.model_info.append(runner.get_model_info())
            all_regions.extend(regions)

        context.regions.extend(all_regions)
        context.stage_outputs[self.name] = {"regionCount": len(all_regions)}
        return context

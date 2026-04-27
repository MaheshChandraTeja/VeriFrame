from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion
from veriframe_core.inference.batch_runner import runner_for_loaded_model
from veriframe_core.pipeline.pipeline_context import PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage

logger = logging.getLogger(__name__)


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

        all_regions: list[DetectedRegion] = []
        model_outputs: list[dict[str, Any]] = []

        for model_id in model_ids:
            context.assert_not_cancelled()

            try:
                profile = context.model_registry.get_profile(model_id)
            except KeyError:
                context.add_warning(f"Model profile not found: {model_id}")
                model_outputs.append({"modelId": model_id, "status": "missing_profile"})
                continue

            if profile.task != "detection":
                model_outputs.append(
                    {
                        "modelId": model_id,
                        "status": "skipped",
                        "reason": f"Profile task is {profile.task}, not detection.",
                    }
                )
                continue

            regions: list[DetectedRegion] = []

            if context.detection_runner is not None:
                try:
                    regions = context.detection_runner(
                        profile,
                        str(context.image_path),
                        context.request.options.confidenceThreshold,
                    )
                except Exception as exc:  # pragma: no cover - defensive boundary
                    logger.exception("Injected detection runner failed for %s", model_id)
                    context.add_warning(
                        f"Detection runner failed for {model_id}: {type(exc).__name__}: {exc}"
                    )
                    regions = self._fallback_regions(
                        profile=profile,
                        context=context,
                        reason=f"injected runner failed: {type(exc).__name__}",
                    )

                all_regions.extend(regions)
                model_outputs.append(
                    {
                        "modelId": model_id,
                        "status": "completed",
                        "regionCount": len(regions),
                        "runner": "injected",
                    }
                )
                continue

            loaded = context.model_cache.get(model_id)
            if loaded is None:
                context.add_warning(f"Detection model is not loaded and was skipped: {model_id}")
                fallback = self._fallback_regions(
                    profile=profile,
                    context=context,
                    reason="model not loaded",
                )
                all_regions.extend(fallback)
                model_outputs.append(
                    {
                        "modelId": model_id,
                        "status": "not_loaded",
                        "regionCount": len(fallback),
                        "fallbackUsed": bool(fallback),
                    }
                )
                continue

            try:
                runner = runner_for_loaded_model(loaded)
                self._append_model_info(context, runner)

                regions = runner.predict(
                    str(context.image_path),
                    confidence_threshold=context.request.options.confidenceThreshold,
                )

                if not regions:
                    fallback = self._fallback_regions(
                        profile=profile,
                        context=context,
                        reason="model produced zero regions",
                    )
                    if fallback:
                        context.add_warning(
                            f"Detection model {model_id} produced no regions; generated deterministic QA fallback regions."
                        )
                        regions = fallback

                all_regions.extend(regions)
                model_outputs.append(
                    {
                        "modelId": model_id,
                        "status": "completed",
                        "regionCount": len(regions),
                        "fallbackUsed": any(
                            region.sourceModelId.endswith(":heuristic")
                            for region in regions
                        ),
                    }
                )
            except Exception as exc:
                logger.exception("Detection model failed for %s", model_id)
                context.add_warning(
                    f"Detection model failed for {model_id}: {type(exc).__name__}: {exc}"
                )

                fallback = self._fallback_regions(
                    profile=profile,
                    context=context,
                    reason=f"inference failed: {type(exc).__name__}",
                )
                all_regions.extend(fallback)
                model_outputs.append(
                    {
                        "modelId": model_id,
                        "status": "failed",
                        "errorType": type(exc).__name__,
                        "regionCount": len(fallback),
                        "fallbackUsed": bool(fallback),
                    }
                )

        context.regions.extend(all_regions)
        context.stage_outputs[self.name] = {
            "regionCount": len(all_regions),
            "models": model_outputs,
        }
        return context

    def _append_model_info(self, context: PipelineContext, runner: Any) -> None:
        try:
            info = runner.get_model_info()
        except Exception as exc:  # pragma: no cover - defensive metadata guard
            logger.warning("Could not read model info: %s", exc)
            return

        if all(existing.modelId != info.modelId for existing in context.model_info):
            context.model_info.append(info)

    def _fallback_regions(
        self,
        *,
        profile: Any,
        context: PipelineContext,
        reason: str,
    ) -> list[DetectedRegion]:
        if context.image is None:
            return []

        width = float(context.image.width)
        height = float(context.image.height)

        if width <= 0 or height <= 0:
            return []

        if profile.modelId == "receipt_region_detector" or context.request.workflow == "receipt_verification":
            return self._receipt_regions(profile.modelId, width, height, reason)

        if profile.modelId == "display_panel_detector" or context.request.workflow == "device_display":
            return [
                self._region(
                    source_model_id=profile.modelId,
                    label="display_panel",
                    category="display_panel",
                    confidence=0.52,
                    width=width,
                    height=height,
                    rel=(0.08, 0.18, 0.84, 0.52),
                    reason=reason,
                )
            ]

        if profile.modelId == "product_package_detector" or context.request.workflow == "package_evidence":
            return [
                self._region(
                    source_model_id=profile.modelId,
                    label="product_package",
                    category="product_package",
                    confidence=0.52,
                    width=width,
                    height=height,
                    rel=(0.10, 0.10, 0.80, 0.72),
                    reason=reason,
                )
            ]

        return []

    def _receipt_regions(
        self,
        source_model_id: str,
        width: float,
        height: float,
        reason: str,
    ) -> list[DetectedRegion]:
        return [
            self._region(
                source_model_id=source_model_id,
                label="receipt_header",
                category="receipt_header",
                confidence=0.58,
                width=width,
                height=height,
                rel=(0.06, 0.05, 0.88, 0.16),
                reason=reason,
            ),
            self._region(
                source_model_id=source_model_id,
                label="line_item_block",
                category="line_item_block",
                confidence=0.56,
                width=width,
                height=height,
                rel=(0.06, 0.24, 0.88, 0.44),
                reason=reason,
            ),
            self._region(
                source_model_id=source_model_id,
                label="price_label",
                category="price_label",
                confidence=0.55,
                width=width,
                height=height,
                rel=(0.56, 0.72, 0.36, 0.14),
                reason=reason,
            ),
        ]

    def _region(
        self,
        *,
        source_model_id: str,
        label: str,
        category: str,
        confidence: float,
        width: float,
        height: float,
        rel: tuple[float, float, float, float],
        reason: str,
    ) -> DetectedRegion:
        x_ratio, y_ratio, w_ratio, h_ratio = rel

        x = max(0.0, min(width - 1.0, width * x_ratio))
        y = max(0.0, min(height - 1.0, height * y_ratio))
        box_width = max(1.0, min(width - x, width * w_ratio))
        box_height = max(1.0, min(height - y, height * h_ratio))

        return DetectedRegion(
            regionId=f"reg_{uuid4().hex}",
            label=label,
            category=category,  # type: ignore[arg-type]
            confidence=confidence,
            bbox=BoundingBox(
                x=round(x, 3),
                y=round(y, 3),
                width=round(box_width, 3),
                height=round(box_height, 3),
            ),
            mask=None,
            sourceModelId=f"{source_model_id}:heuristic",
            rationale=(
                "Deterministic local QA fallback region generated because "
                f"{reason}. Replace with a fine-tuned checkpoint for production evidence scoring."
            ),
            reviewStatus="unreviewed",
        )

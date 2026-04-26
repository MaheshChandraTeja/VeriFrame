from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from veriframe_core.errors import AnalysisCancelledError, ModelLoadError
from veriframe_core.inference.classification import ClassificationInferenceRunner
from veriframe_core.inference.detection import DetectionInferenceRunner
from veriframe_core.inference.segmentation import SegmentationInferenceRunner
from veriframe_core.models.cache import ModelCache
from veriframe_core.models.model_registry import ModelRegistry
from veriframe_core.runtime.cancellation import CancellationRegistry
from veriframe_core.runtime.progress import ProgressRegistry


@dataclass(slots=True)
class BatchInferenceResult:
    imagePath: str
    outputs: object


class BatchInferenceRunner:
    def __init__(
        self,
        *,
        registry: ModelRegistry,
        cache: ModelCache,
        progress_registry: ProgressRegistry,
        cancellation_registry: CancellationRegistry,
    ) -> None:
        self.registry = registry
        self.cache = cache
        self.progress_registry = progress_registry
        self.cancellation_registry = cancellation_registry

    def run(
        self,
        *,
        run_id: str,
        model_id: str,
        image_paths: list[str],
        confidence_threshold: float = 0.5,
    ) -> list[BatchInferenceResult]:
        profile = self.registry.get_profile(model_id)
        loaded = self.cache.get(model_id)

        if loaded is None:
            raise ModelLoadError(f"Model must be loaded before batch inference: {model_id}")

        token = self.cancellation_registry.get(run_id) or self.cancellation_registry.create(run_id)
        reporter = self.progress_registry.create(run_id, "Batch inference queued.")
        runner = runner_for_loaded_model(loaded)

        results: list[BatchInferenceResult] = []
        total = max(1, len(image_paths))

        for index, image_path in enumerate(image_paths):
            if token.is_cancelled():
                reporter.update("cancelled", int(index / total * 100), "Batch inference cancelled.")
                raise AnalysisCancelledError(f"Batch inference cancelled: {run_id}")

            outputs = runner.predict(image_path, confidence_threshold=confidence_threshold)
            results.append(BatchInferenceResult(imagePath=str(Path(image_path)), outputs=outputs))
            reporter.update("running", int(((index + 1) / total) * 100), f"Processed {index + 1}/{total}")

        reporter.update("completed", 100, "Batch inference completed.")
        return results


def runner_for_loaded_model(loaded_model):
    if loaded_model.profile.task == "detection":
        return DetectionInferenceRunner(loaded_model)
    if loaded_model.profile.task == "segmentation":
        return SegmentationInferenceRunner(loaded_model)
    if loaded_model.profile.task == "classification":
        return ClassificationInferenceRunner(loaded_model)

    raise ModelLoadError(f"Unsupported task: {loaded_model.profile.task}")

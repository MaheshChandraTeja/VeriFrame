from __future__ import annotations

from abc import ABC, abstractmethod

from veriframe_core.pipeline.pipeline_context import PipelineContext


class PipelineStage(ABC):
    name: str = "base"

    @abstractmethod
    def execute(self, context: PipelineContext) -> PipelineContext:
        raise NotImplementedError

    def update(self, context: PipelineContext, percent: int, message: str) -> None:
        context.progress.update("running", percent, message)

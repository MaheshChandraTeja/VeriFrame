from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ModelTask = Literal["classification", "detection", "segmentation"]


class ModelMetric(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1)
    value: float | str
    split: str | None = None
    notes: str | None = None


class ModelCard(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    modelId: str = Field(min_length=1)
    name: str = Field(min_length=1)
    version: str = Field(min_length=1)
    task: ModelTask
    trainingDataSummary: str
    limitations: list[str]
    inputSize: tuple[int, int] | None = None
    labels: list[str]
    metrics: list[ModelMetric] = Field(default_factory=list)
    license: str
    cardPath: str | None = None

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictAnnotationModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class AnnotationBox(StrictAnnotationModel):
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)


class AnnotationMask(StrictAnnotationModel):
    format: Literal["polygon", "rle"]
    points: list[tuple[float, float]] | None = None
    rle: dict[str, object] | None = None


class AnnotationRegion(StrictAnnotationModel):
    regionId: str = Field(min_length=1)
    label: str = Field(min_length=1)
    category: str = Field(min_length=1)
    bbox: AnnotationBox
    mask: AnnotationMask | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class VisualAuditAnnotation(StrictAnnotationModel):
    schemaVersion: Literal["1.0.0"]
    imagePath: str = Field(min_length=1)
    imageSha256: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")
    width: int = Field(ge=1)
    height: int = Field(ge=1)
    split: Literal["train", "val", "test", "unassigned"] = "unassigned"
    regions: list[AnnotationRegion]
    metadata: dict[str, object] = Field(default_factory=dict)

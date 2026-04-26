from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion, SegmentationMask

CorrectionAction = Literal["add", "update", "delete"]
FindingDecision = Literal["valid", "false_positive", "needs_review", "ignored"]


class StrictReviewModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class BoxCorrection(StrictReviewModel):
    before: BoundingBox | None = None
    after: BoundingBox


class LabelCorrection(StrictReviewModel):
    before: str | None = None
    after: str = Field(min_length=1)


class MaskCorrection(StrictReviewModel):
    before: SegmentationMask | None = None
    after: SegmentationMask | None = None


class RegionCorrection(StrictReviewModel):
    correctionId: str = Field(min_length=1)
    runId: str = Field(min_length=1)
    regionId: str | None = None
    action: CorrectionAction
    originalRegion: DetectedRegion | None = None
    correctedRegion: DetectedRegion
    labelCorrection: LabelCorrection | None = None
    boxCorrection: BoxCorrection | None = None
    maskCorrection: MaskCorrection | None = None
    notes: str | None = None
    createdAt: str
    updatedAt: str


class FindingReview(StrictReviewModel):
    reviewId: str = Field(min_length=1)
    runId: str = Field(min_length=1)
    findingId: str = Field(min_length=1)
    decision: FindingDecision
    notes: str | None = None
    reviewer: str | None = None
    createdAt: str
    updatedAt: str


class ReviewSession(StrictReviewModel):
    runId: str
    corrections: list[RegionCorrection]
    findingReviews: list[FindingReview]
    correctionCount: int
    findingReviewCount: int
    unresolvedFindingCount: int

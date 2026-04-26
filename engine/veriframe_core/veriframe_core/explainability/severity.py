from __future__ import annotations

from typing import Literal

from veriframe_core.contracts.analysis import DetectedRegion

FindingSeverity = Literal["info", "low", "medium", "high", "critical"]


def score_region_severity(region: DetectedRegion) -> FindingSeverity:
    if region.category == "sensitive_region":
        return "high"

    if region.category == "damage_zone":
        if region.confidence >= 0.85:
            return "high"
        return "medium"

    if region.category in {"price_label", "display_panel"}:
        return "medium" if region.confidence >= 0.8 else "low"

    if region.confidence < 0.35:
        return "low"

    return "info"


def score_quality_warning_severity(warning: str) -> FindingSeverity:
    normalized = warning.lower()

    if "resolution" in normalized or "blurry" in normalized:
        return "medium"

    if "glare" in normalized or "overexposed" in normalized or "underexposed" in normalized:
        return "low"

    return "info"

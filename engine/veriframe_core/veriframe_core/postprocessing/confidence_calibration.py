from __future__ import annotations

from veriframe_core.contracts.analysis import DetectedRegion


def calibrate_confidence(value: float) -> float:
    clamped = max(0.0, min(1.0, float(value)))
    # Mildly conservative calibration. Keeps high scores high but avoids
    # pretending raw model confidence is courtroom-grade certainty. Finally,
    # a number with humility.
    calibrated = 1.0 / (1.0 + pow(2.718281828, -5.0 * (clamped - 0.5)))
    return round(calibrated, 6)


def calibrate_regions(regions: list[DetectedRegion]) -> list[DetectedRegion]:
    return [
        region.model_copy(update={"confidence": calibrate_confidence(region.confidence)})
        for region in regions
    ]

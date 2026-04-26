from __future__ import annotations

from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion


def merge_overlapping_regions(
    regions: list[DetectedRegion],
    *,
    iou_threshold: float = 0.65,
) -> list[DetectedRegion]:
    if not regions:
        return []

    ordered = sorted(regions, key=lambda region: region.confidence, reverse=True)
    kept: list[DetectedRegion] = []

    for region in ordered:
        duplicate_index = find_duplicate_index(region, kept, iou_threshold=iou_threshold)

        if duplicate_index is None:
            kept.append(region)
            continue

        kept[duplicate_index] = merge_pair(kept[duplicate_index], region)

    return sorted(kept, key=lambda region: region.regionId)


def find_duplicate_index(
    region: DetectedRegion,
    candidates: list[DetectedRegion],
    *,
    iou_threshold: float,
) -> int | None:
    for index, candidate in enumerate(candidates):
        if candidate.label != region.label:
            continue

        if iou(candidate.bbox, region.bbox) >= iou_threshold:
            return index

    return None


def merge_pair(left: DetectedRegion, right: DetectedRegion) -> DetectedRegion:
    best = left if left.confidence >= right.confidence else right
    other = right if best is left else left

    merged_box = union_box(best.bbox, other.bbox)
    merged_confidence = min(1.0, max(best.confidence, other.confidence) + min(best.confidence, other.confidence) * 0.05)

    return best.model_copy(
        update={
            "bbox": merged_box,
            "confidence": round(merged_confidence, 6),
            "rationale": f"{best.rationale} Duplicate overlapping region merged.",
        }
    )


def union_box(left: BoundingBox, right: BoundingBox) -> BoundingBox:
    x1 = min(left.x, right.x)
    y1 = min(left.y, right.y)
    x2 = max(left.x + left.width, right.x + right.width)
    y2 = max(left.y + left.height, right.y + right.height)

    return BoundingBox(x=x1, y=y1, width=x2 - x1, height=y2 - y1)


def iou(left: BoundingBox, right: BoundingBox) -> float:
    left_x2 = left.x + left.width
    left_y2 = left.y + left.height
    right_x2 = right.x + right.width
    right_y2 = right.y + right.height

    inter_x1 = max(left.x, right.x)
    inter_y1 = max(left.y, right.y)
    inter_x2 = min(left_x2, right_x2)
    inter_y2 = min(left_y2, right_y2)

    inter_width = max(0.0, inter_x2 - inter_x1)
    inter_height = max(0.0, inter_y2 - inter_y1)
    intersection = inter_width * inter_height
    union = left.width * left.height + right.width * right.height - intersection

    if union <= 0:
        return 0.0

    return intersection / union

from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion
from veriframe_core.postprocessing.region_merger import iou, merge_overlapping_regions


def make_region(region_id: str, label: str, box: BoundingBox, confidence: float) -> DetectedRegion:
    return DetectedRegion(
        regionId=region_id,
        label=label,
        category="unknown",
        confidence=confidence,
        bbox=box,
        mask=None,
        sourceModelId="test",
        rationale="test",
        reviewStatus="unreviewed",
    )


def test_iou_for_overlapping_boxes() -> None:
    left = BoundingBox(x=0, y=0, width=100, height=100)
    right = BoundingBox(x=50, y=50, width=100, height=100)

    assert round(iou(left, right), 4) == 0.1429


def test_merges_duplicate_overlapping_regions() -> None:
    regions = [
        make_region("a", "price_label", BoundingBox(x=0, y=0, width=100, height=100), 0.8),
        make_region("b", "price_label", BoundingBox(x=5, y=5, width=100, height=100), 0.7),
        make_region("c", "receipt_header", BoundingBox(x=300, y=300, width=50, height=50), 0.9),
    ]

    merged = merge_overlapping_regions(regions, iou_threshold=0.6)

    assert len(merged) == 2
    assert any(region.label == "price_label" and region.bbox.width == 105 for region in merged)

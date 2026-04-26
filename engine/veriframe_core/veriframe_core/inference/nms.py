from __future__ import annotations

from typing import Sequence


def non_max_suppression(
    boxes: Sequence[Sequence[float]],
    scores: Sequence[float],
    *,
    iou_threshold: float = 0.5,
) -> list[int]:
    if not boxes:
        return []

    try:
        import torch
        from torchvision.ops import nms

        box_tensor = torch.tensor(boxes, dtype=torch.float32)
        score_tensor = torch.tensor(scores, dtype=torch.float32)
        return nms(box_tensor, score_tensor, iou_threshold).cpu().tolist()
    except Exception:
        return pure_python_nms(boxes, scores, iou_threshold=iou_threshold)


def pure_python_nms(
    boxes: Sequence[Sequence[float]],
    scores: Sequence[float],
    *,
    iou_threshold: float,
) -> list[int]:
    order = sorted(range(len(scores)), key=lambda index: float(scores[index]), reverse=True)
    keep: list[int] = []

    while order:
        current = order.pop(0)
        keep.append(current)
        order = [
            candidate
            for candidate in order
            if box_iou(boxes[current], boxes[candidate]) <= iou_threshold
        ]

    return keep


def box_iou(left: Sequence[float], right: Sequence[float]) -> float:
    left_x1, left_y1, left_x2, left_y2 = map(float, left)
    right_x1, right_y1, right_x2, right_y2 = map(float, right)

    inter_x1 = max(left_x1, right_x1)
    inter_y1 = max(left_y1, right_y1)
    inter_x2 = min(left_x2, right_x2)
    inter_y2 = min(left_y2, right_y2)

    inter_width = max(0.0, inter_x2 - inter_x1)
    inter_height = max(0.0, inter_y2 - inter_y1)
    intersection = inter_width * inter_height

    left_area = max(0.0, left_x2 - left_x1) * max(0.0, left_y2 - left_y1)
    right_area = max(0.0, right_x2 - right_x1) * max(0.0, right_y2 - right_y1)
    union = left_area + right_area - intersection

    if union <= 0:
        return 0.0

    return intersection / union

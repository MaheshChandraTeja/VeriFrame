from __future__ import annotations

from typing import Sequence, TypeVar

T = TypeVar("T")


def filter_indices_by_threshold(scores: Sequence[float], threshold: float) -> list[int]:
    return [index for index, score in enumerate(scores) if float(score) >= threshold]


def filter_pairs_by_threshold(
    items: Sequence[T],
    scores: Sequence[float],
    threshold: float,
) -> list[T]:
    return [item for item, score in zip(items, scores, strict=False) if float(score) >= threshold]


def top_k_indices(scores: Sequence[float], k: int) -> list[int]:
    if k <= 0:
        return []

    return sorted(range(len(scores)), key=lambda index: float(scores[index]), reverse=True)[:k]


def clamp_threshold(value: float) -> float:
    return max(0.0, min(1.0, float(value)))

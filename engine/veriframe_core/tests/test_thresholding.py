from veriframe_core.inference.thresholding import (
    clamp_threshold,
    filter_indices_by_threshold,
    filter_pairs_by_threshold,
    top_k_indices,
)


def test_filter_indices_by_threshold() -> None:
    assert filter_indices_by_threshold([0.1, 0.5, 0.9], 0.5) == [1, 2]


def test_filter_pairs_by_threshold() -> None:
    assert filter_pairs_by_threshold(["a", "b", "c"], [0.1, 0.7, 0.2], 0.5) == ["b"]


def test_top_k_indices() -> None:
    assert top_k_indices([0.4, 0.9, 0.2, 0.8], 2) == [1, 3]


def test_clamp_threshold() -> None:
    assert clamp_threshold(-1) == 0.0
    assert clamp_threshold(2) == 1.0
    assert clamp_threshold(0.42) == 0.42

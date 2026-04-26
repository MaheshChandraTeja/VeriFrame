from dataclasses import dataclass

from veriframe_core.models.warmup import WarmupResult


def test_warmup_result_serializes_without_dict_attribute() -> None:
    result = WarmupResult(
        modelId="general_object_detector",
        device="cpu",
        elapsedMs=1.23,
        success=True,
        message="ok",
    )

    assert result.to_dict() == {
        "modelId": "general_object_detector",
        "device": "cpu",
        "elapsedMs": 1.23,
        "success": True,
        "message": "ok",
    }

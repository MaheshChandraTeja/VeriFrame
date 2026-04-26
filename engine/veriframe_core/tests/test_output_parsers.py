import torch

from veriframe_core.models.model_registry import ModelRegistry
from veriframe_core.models.output_parsers import parse_classification_output, parse_detection_output


def test_detection_parser_converts_fake_torchvision_output() -> None:
    registry = ModelRegistry.default()
    profile = registry.get_profile("receipt_region_detector")

    output = {
        "boxes": torch.tensor([[10.0, 20.0, 110.0, 220.0], [0.0, 0.0, 5.0, 5.0]]),
        "scores": torch.tensor([0.91, 0.12]),
        "labels": torch.tensor([1, 2]),
    }

    regions = parse_detection_output(output, profile=profile, confidence_threshold=0.5)

    assert len(regions) == 1
    assert regions[0].label == "receipt_header"
    assert regions[0].bbox.width == 100.0
    assert regions[0].confidence == 0.91


def test_classification_parser_converts_logits_to_findings() -> None:
    registry = ModelRegistry.default()
    profile = registry.get_profile("general_object_detector").model_copy(
        update={
            "task": "classification",
            "modelFamily": "resnet18",
            "outputParser": "classification",
            "labels": ["receipt", "package", "display"],
        }
    )

    logits = torch.tensor([[0.1, 4.0, 0.2]])
    findings = parse_classification_output(logits, profile=profile, confidence_threshold=0.5)

    assert len(findings) == 1
    assert "package" in findings[0].title
    assert findings[0].confidence > 0.5

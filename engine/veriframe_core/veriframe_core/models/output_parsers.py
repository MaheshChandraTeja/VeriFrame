from __future__ import annotations

from typing import Any
from uuid import uuid4

from veriframe_core.contracts.analysis import BoundingBox, DetectedRegion, Finding
from veriframe_core.inference.thresholding import filter_indices_by_threshold
from veriframe_core.models.model_registry import ModelProfile


def parse_detection_output(
    output: dict[str, Any],
    *,
    profile: ModelProfile,
    confidence_threshold: float,
) -> list[DetectedRegion]:
    boxes = to_list(output.get("boxes", []))
    scores = to_list(output.get("scores", []))
    labels = to_list(output.get("labels", []))

    selected = filter_indices_by_threshold(scores, confidence_threshold)
    regions: list[DetectedRegion] = []

    for index in selected:
        box = boxes[index]
        score = float(scores[index])
        label_index = int(labels[index])
        label = label_for_index(profile, label_index)

        regions.append(
            DetectedRegion(
                regionId=f"reg_{uuid4().hex}",
                label=label,
                category=category_for_label(label),
                confidence=round(score, 6),
                bbox=BoundingBox(
                    x=max(0.0, float(box[0])),
                    y=max(0.0, float(box[1])),
                    width=max(1e-6, float(box[2]) - float(box[0])),
                    height=max(1e-6, float(box[3]) - float(box[1])),
                ),
                mask=None,
                sourceModelId=profile.modelId,
                rationale=f"TorchVision detection output exceeded threshold {confidence_threshold}.",
                reviewStatus="unreviewed",
            )
        )

    return regions


def parse_segmentation_output(
    output: dict[str, Any],
    *,
    profile: ModelProfile,
    confidence_threshold: float,
) -> list[DetectedRegion]:
    regions = parse_detection_output(
        output,
        profile=profile,
        confidence_threshold=confidence_threshold,
    )

    masks = output.get("masks")
    if masks is None:
        return regions

    # Mask-to-contract conversion lands in the evidence overlay module. Keep
    # region detection useful and deterministic here.
    return regions


def parse_classification_output(
    output: Any,
    *,
    profile: ModelProfile,
    confidence_threshold: float,
    top_k: int = 5,
) -> list[Finding]:
    import torch

    tensor = output
    if isinstance(output, (list, tuple)):
        tensor = output[0]

    probabilities = torch.softmax(tensor.detach().cpu(), dim=-1)
    values, indices = torch.topk(probabilities, k=min(top_k, probabilities.shape[-1]))

    findings: list[Finding] = []

    for confidence, index in zip(values.flatten().tolist(), indices.flatten().tolist(), strict=False):
        if confidence < confidence_threshold:
            continue

        label = profile.labels[int(index)]

        findings.append(
            Finding(
                findingId=f"find_{uuid4().hex}",
                title=f"Classified as {label}",
                description=f"Classification profile '{profile.name}' predicted '{label}'.",
                severity="info",
                confidence=round(float(confidence), 6),
                regionIds=[],
                evidenceRefs=[f"model:{profile.modelId}"],
                recommendation="Review classification confidence before using in evidence reports.",
            )
        )

    return findings


def label_for_index(profile: ModelProfile, label_index: int) -> str:
    if profile.task in {"detection", "segmentation"}:
        mapped = label_index - 1
    else:
        mapped = label_index

    if 0 <= mapped < len(profile.labels):
        return profile.labels[mapped]

    return "unknown"


def category_for_label(label: str) -> str:
    if "receipt" in label:
        return "receipt_header"
    if "price" in label:
        return "price_label"
    if "package" in label:
        return "product_package"
    if "damage" in label or "tear" in label or "tamper" in label:
        return "damage_zone"
    if "display" in label or "panel" in label:
        return "display_panel"
    return "unknown"


def to_list(value: Any) -> list[Any]:
    if hasattr(value, "detach"):
        return value.detach().cpu().tolist()
    if hasattr(value, "tolist"):
        return value.tolist()
    return list(value)

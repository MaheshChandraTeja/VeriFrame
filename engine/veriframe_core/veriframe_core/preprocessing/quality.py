from __future__ import annotations

from typing import Literal

import cv2
import numpy as np
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field

from veriframe_core.importing.image_loader import LoadedImage, load_image


class ImageQualitySignals(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    blurScore: float = Field(ge=0)
    brightness: float = Field(ge=0)
    contrast: float = Field(ge=0)
    glareRisk: Literal["none", "low", "medium", "high"]
    resolutionAdequate: bool
    compressionArtifactScore: float = Field(ge=0)
    warnings: list[str]


def compute_quality_signals(
    image_or_path: str | Image.Image | LoadedImage,
    *,
    min_width: int = 512,
    min_height: int = 512,
) -> ImageQualitySignals:
    array = coerce_rgb_array(image_or_path)
    height, width = array.shape[:2]
    gray = cv2.cvtColor(array, cv2.COLOR_RGB2GRAY)

    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean() / 255.0)
    contrast = float(gray.std() / 255.0)
    glare_ratio = float(np.mean(gray > 245))
    glare_risk = classify_glare(glare_ratio)
    compression_score = compute_blockiness(gray)
    resolution_adequate = width >= min_width and height >= min_height

    warnings: list[str] = []
    if blur_score < 25:
        warnings.append("Image appears very blurry.")
    if brightness < 0.18:
        warnings.append("Image appears underexposed.")
    if brightness > 0.88:
        warnings.append("Image appears overexposed.")
    if contrast < 0.08:
        warnings.append("Image has low contrast.")
    if glare_risk in {"medium", "high"}:
        warnings.append("Potential glare or blown highlights detected.")
    if not resolution_adequate:
        warnings.append("Image resolution may be too low for reliable analysis.")
    if compression_score > 0.22:
        warnings.append("Possible compression artifacts detected.")

    return ImageQualitySignals(
        blurScore=round(blur_score, 4),
        brightness=round(brightness, 4),
        contrast=round(contrast, 4),
        glareRisk=glare_risk,
        resolutionAdequate=resolution_adequate,
        compressionArtifactScore=round(compression_score, 4),
        warnings=warnings,
    )


def coerce_rgb_array(image_or_path: str | Image.Image | LoadedImage) -> np.ndarray:
    if isinstance(image_or_path, LoadedImage):
        return image_or_path.array_rgb
    if isinstance(image_or_path, Image.Image):
        return np.asarray(image_or_path.convert("RGB"))
    return load_image(image_or_path).array_rgb


def classify_glare(glare_ratio: float) -> Literal["none", "low", "medium", "high"]:
    if glare_ratio >= 0.12:
        return "high"
    if glare_ratio >= 0.05:
        return "medium"
    if glare_ratio >= 0.015:
        return "low"
    return "none"


def compute_blockiness(gray: np.ndarray) -> float:
    if gray.shape[0] < 16 or gray.shape[1] < 16:
        return 0.0

    vertical_edges = np.abs(np.diff(gray.astype(np.float32), axis=1))
    horizontal_edges = np.abs(np.diff(gray.astype(np.float32), axis=0))

    block_vertical = vertical_edges[:, 7::8].mean() if vertical_edges[:, 7::8].size else 0.0
    block_horizontal = horizontal_edges[7::8, :].mean() if horizontal_edges[7::8, :].size else 0.0
    all_edges = (vertical_edges.mean() + horizontal_edges.mean()) / 2.0

    if all_edges <= 1e-6:
        return 0.0

    return float(min(1.0, max(0.0, ((block_vertical + block_horizontal) / 2.0) / (all_edges * 3.0))))

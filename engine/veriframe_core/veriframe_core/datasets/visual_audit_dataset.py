from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from PIL import Image

from veriframe_core.datasets.annotation_schema import VisualAuditAnnotation
from veriframe_core.importing.image_loader import load_image


class VisualAuditDataset:
    def __init__(
        self,
        annotations_dir: str | Path,
        *,
        image_root: str | Path | None = None,
        transform: Callable[[Image.Image], object] | None = None,
    ) -> None:
        self.annotations_dir = Path(annotations_dir)
        self.image_root = Path(image_root) if image_root is not None else self.annotations_dir
        self.transform = transform
        self.annotation_paths = sorted(self.annotations_dir.glob("*.json"))

    def __len__(self) -> int:
        return len(self.annotation_paths)

    def __getitem__(self, index: int) -> tuple[object, dict[str, object]]:
        annotation = self.load_annotation(self.annotation_paths[index])
        image_path = Path(annotation.imagePath)

        if not image_path.is_absolute():
            image_path = self.image_root / image_path

        loaded = load_image(image_path)
        image: object = loaded.image

        if self.transform is not None:
            image = self.transform(loaded.image)

        target = {
            "imagePath": str(image_path),
            "width": annotation.width,
            "height": annotation.height,
            "boxes": [
                [
                    region.bbox.x,
                    region.bbox.y,
                    region.bbox.x + region.bbox.width,
                    region.bbox.y + region.bbox.height,
                ]
                for region in annotation.regions
            ],
            "labels": [region.label for region in annotation.regions],
            "categories": [region.category for region in annotation.regions],
            "regionIds": [region.regionId for region in annotation.regions],
            "metadata": annotation.metadata,
        }

        return image, target

    @staticmethod
    def load_annotation(path: str | Path) -> VisualAuditAnnotation:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        return VisualAuditAnnotation.model_validate(payload)

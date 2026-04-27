from __future__ import annotations

from pathlib import Path
import shutil

from veriframe_core.contracts.analysis import AnalysisResult


class ReportAssetWriter:
    def write_assets(self, *, result: AnalysisResult, source_dir: str | Path, output_dir: str | Path) -> list[Path]:
        source = Path(source_dir)
        target = Path(output_dir)
        target.mkdir(parents=True, exist_ok=True)

        copied: list[Path] = []

        for candidate in ["evidence-overlay.png", "evidence-map.json"]:
            source_path = source / candidate
            if source_path.exists():
                dest = target / candidate
                shutil.copy2(source_path, dest)
                copied.append(dest)

        crops_dir = source / "region-crops"
        if crops_dir.exists():
            target_crops = target / "region-crops"
            target_crops.mkdir(exist_ok=True)
            for crop in crops_dir.glob("*"):
                if crop.is_file():
                    dest = target_crops / crop.name
                    shutil.copy2(crop, dest)
                    copied.append(dest)

        metadata_path = target / "metadata.json"
        metadata_path.write_text(result.model_dump_json(indent=2), encoding="utf-8")
        copied.append(metadata_path)

        return copied

from __future__ import annotations

from pathlib import Path

from veriframe_core.contracts.report import VisualReport


class JsonReportExporter:
    def export(self, report: VisualReport, output_path: str | Path) -> Path:
        target = Path(output_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        return target

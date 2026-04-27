from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from html import escape
import json
from pathlib import Path, PureWindowsPath
import re
from typing import Any

from veriframe_core.contracts.report import VisualReport


SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]
SEVERITY_LABELS = {
    "critical": "Critical",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
    "info": "Info",
}


class HtmlReportExporter:
    def __init__(self, template_dir: str | Path | None = None) -> None:
        self.template_dir = Path(template_dir) if template_dir else Path(__file__).resolve().parent / "templates"

    def export(self, report: VisualReport, output_path: str | Path) -> Path:
        target = Path(output_path)
        target.parent.mkdir(parents=True, exist_ok=True)
        html = self.render(report, output_path=target)
        target.write_text(html, encoding="utf-8")
        return target

    def render(self, report: VisualReport, output_path: str | Path | None = None) -> str:
        css_path = self.template_dir / "report.css"
        css = css_path.read_text(encoding="utf-8") if css_path.exists() else ""
        context = ReportViewContext(report, output_path=output_path)

        return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(context.document_title)}</title>
  <style>{css}</style>
</head>
<body>
  <main class="report-shell">
    {context.render_hero()}
    {context.render_summary()}
    <div class="report-layout">
      <div class="report-layout__main">
        {context.render_quality()}
        {context.render_findings()}
        {context.render_regions()}
      </div>
      <aside class="report-layout__side">
        {context.render_evidence_preview()}
        {context.render_models()}
        {context.render_audit()}
      </aside>
    </div>
  </main>
</body>
</html>
"""


class ReportViewContext:
    def __init__(self, report: VisualReport, output_path: str | Path | None = None) -> None:
        self.report = report
        self.output_path = Path(output_path) if output_path is not None else None
        self.document_title = f"VeriFrame audit Â· {report.image.fileName}"

    def render_hero(self) -> str:
        receipt = self.report.auditReceipt
        return f"""
<header class="report-hero">
  <div class="report-hero__copy">
    <div class="eyebrow">VeriFrame Local Audit Report</div>
    <h1>{escape(self.report.image.fileName)}</h1>
    <p>
      Local visual audit generated from the original image, quality checks,
      evidence map, and integrity receipt. No cloud review. No telemetry. No theatrical nonsense.
    </p>
  </div>

  <div class="report-hero__status">
    <span class="verdict verdict--{escape(self.verdict_class())}">{escape(self.verdict_label())}</span>
    <dl>
      <div>
        <dt>Generated</dt>
        <dd>{escape(format_datetime(self.report.generatedAt))}</dd>
      </div>
      <div>
        <dt>Run</dt>
        <dd><code>{escape(short_id(self.report.runId))}</code></dd>
      </div>
      <div>
        <dt>Receipt</dt>
        <dd><code>{escape(short_id(receipt.receiptId))}</code></dd>
      </div>
    </dl>
  </div>
</header>
"""

    def render_summary(self) -> str:
        counts = self.severity_counts()
        return f"""
<section class="summary-grid" aria-label="Report summary">
  {metric_card("Findings", str(len(self.report.findings)), "issues and notices")}
  {metric_card("Evidence regions", str(len(self.report.evidenceMap.regions)), "detected areas")}
  {metric_card("Models", str(len(self.report.models)), "recorded in run")}
  {metric_card("Warnings", str(len(self.report.qualityReport.warnings)), "quality checks")}
  {metric_card("Highest severity", escape(self.highest_severity_label()), "review priority")}
  {metric_card("Input hash", escape(short_hash(self.report.auditReceipt.inputHash)), "SHA-256 fingerprint", monospace=True)}
</section>
<section class="executive-summary">
  <div>
    <h2>Executive summary</h2>
    <p>{escape(self.executive_summary())}</p>
  </div>
  <div class="severity-strip" aria-label="Severity counts">
    {''.join(severity_chip(severity, counts.get(severity, 0)) for severity in SEVERITY_ORDER)}
  </div>
</section>
"""

    def render_quality(self) -> str:
        q = self.report.qualityReport
        warnings_html = "".join(
            f"<li>{escape(clean_sentence(warning))}</li>"
            for warning in q.warnings
        ) or "<li>No quality warnings were produced.</li>"

        return f"""
<section class="panel quality-panel">
  <div class="section-heading">
    <div>
      <span>Image quality</span>
      <h2>Capture reliability</h2>
    </div>
    <span class="verdict verdict--{escape(self.quality_class())}">{escape(self.quality_label())}</span>
  </div>

  <div class="quality-meter">
    {quality_metric("Blur", f"{q.blurScore:.1f}", "Higher is sharper")}
    {quality_metric("Brightness", f"{q.brightness:.2f}", "0 dark Â· 1 bright")}
    {quality_metric("Contrast", f"{q.contrast:.2f}", "Separation strength")}
    {quality_metric("Glare", escape(q.glareRisk.title()), "Highlight risk")}
  </div>

  <div class="callout">
    <strong>Capture notes</strong>
    <ul>{warnings_html}</ul>
  </div>
</section>
"""

    def render_findings(self) -> str:
        if not self.report.findings:
            return """
<section class="panel">
  <div class="section-heading">
    <div>
      <span>Findings</span>
      <h2>No findings recorded</h2>
    </div>
  </div>
  <p class="muted">The pipeline did not generate any findings for this run.</p>
</section>
"""

        groups = []
        for severity in SEVERITY_ORDER:
            findings = [finding for finding in self.report.findings if finding.severity == severity]
            if not findings:
                continue

            cards = "\n".join(self.render_finding_card(finding) for finding in findings)
            groups.append(
                f"""
<div class="finding-group">
  <div class="finding-group__header">
    <h3>{escape(SEVERITY_LABELS.get(severity, severity.title()))}</h3>
    <span>{len(findings)} item(s)</span>
  </div>
  <div class="finding-list">{cards}</div>
</div>
"""
            )

        return f"""
<section class="panel findings-panel">
  <div class="section-heading">
    <div>
      <span>Findings</span>
      <h2>Review queue</h2>
    </div>
    <span class="pill">{len(self.report.findings)} total</span>
  </div>
  {''.join(groups)}
</section>
"""

    def render_finding_card(self, finding: Any) -> str:
        title = clean_finding_title(finding)
        description = clean_finding_description(finding)
        recommendation = clean_recommendation(finding)

        refs = ", ".join(finding.evidenceRefs) if finding.evidenceRefs else "No evidence reference recorded"
        regions = ", ".join(finding.regionIds) if finding.regionIds else "Whole-image or pipeline-level finding"

        return f"""
<article class="finding-card severity-{escape(finding.severity)}">
  <header>
    <div>
      <h4>{escape(title)}</h4>
      <p>{escape(description)}</p>
    </div>
    <span>{escape(SEVERITY_LABELS.get(finding.severity, finding.severity.title()))}</span>
  </header>

  <dl class="compact-dl">
    <div><dt>Confidence</dt><dd>{finding.confidence:.0%}</dd></div>
    <div><dt>Scope</dt><dd>{escape(regions)}</dd></div>
    <div><dt>Evidence</dt><dd>{escape(refs)}</dd></div>
  </dl>

  <div class="recommendation">
    <strong>Recommended action</strong>
    <p>{escape(recommendation)}</p>
  </div>
</article>
"""

    def render_regions(self) -> str:
        if not self.report.evidenceMap.regions:
            return """
<section class="panel">
  <div class="section-heading">
    <div>
      <span>Evidence map</span>
      <h2>Evidence Regions</h2>
    </div>
  </div>
  <div class="empty-state">
    <strong>No Bounding Boxes were recorded for this run.</strong>
    <p>This usually means a detector was not loaded, skipped, or produced no regions above threshold.</p>
  </div>
</section>
"""

        rows = "\n".join(
            f"""
<tr>
  <td>{escape(region.label)}</td>
  <td>{region.confidence:.0%}</td>
  <td><code>{format_bbox(region.bbox)}</code></td>
  <td>{escape(", ".join(region.evidenceRefs) or "none")}</td>
</tr>
"""
            for region in self.report.evidenceMap.regions
        )

        return f"""
<section class="panel">
  <div class="section-heading">
    <div>
      <span>Evidence map</span>
      <h2>Evidence Regions</h2>
    </div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Label</th>
          <th>Confidence</th>
          <th>Bounding Box</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
</section>
"""

    def render_evidence_preview(self) -> str:
        overlay = self.artifact_by_id("evidence_overlay")
        if not overlay:
            return """
<section class="panel side-panel">
  <div class="section-heading">
    <div>
      <span>Evidence preview</span>
      <h2>No overlay artifact</h2>
    </div>
  </div>
  <p class="muted">No overlay image was recorded for this report.</p>
</section>
"""

        src = escape(safe_artifact_href(overlay.get("path", "")))
        filename = escape(filename_from_path(overlay.get("path", "")))
        digest = escape(short_hash(overlay.get("sha256", "")))

        return f"""
<section class="panel side-panel">
  <div class="section-heading">
    <div>
      <span>Evidence preview</span>
      <h2>Overlay artifact</h2>
    </div>
  </div>
  <figure class="evidence-preview">
    <img src="{src}" alt="Evidence overlay for {escape(self.report.image.fileName)}">
    <figcaption>
      <strong>{filename}</strong>
      <span>SHA-256 {digest}</span>
    </figcaption>
  </figure>
</section>
"""

    def render_models(self) -> str:
        if not self.report.models:
            return """
<section class="panel side-panel">
  <div class="section-heading">
    <div>
      <span>Model state</span>
      <h2>No model recorded</h2>
    </div>
  </div>
  <div class="empty-state compact">
    <strong>No detector output is tied to this report.</strong>
    <p>The run may contain only image quality findings, or the requested model was not loaded.</p>
  </div>
</section>
"""

        models = "".join(
            f"""
<li>
  <strong>{escape(model.name)}</strong>
  <span>{escape(model.version)} Â· {escape(model.device)}</span>
</li>
"""
            for model in self.report.models
        )

        return f"""
<section class="panel side-panel">
  <div class="section-heading">
    <div>
      <span>Model state</span>
      <h2>Recorded models</h2>
    </div>
  </div>
  <ul class="model-list">{models}</ul>
</section>
"""

    def render_audit(self) -> str:
        receipt = self.report.auditReceipt
        artifact_rows = "".join(
            f"""
<tr>
  <td>{escape(artifact.artifactId)}</td>
  <td>{escape(filename_from_path(artifact.path))}</td>
  <td><code>{escape(short_hash(artifact.sha256))}</code></td>
</tr>
"""
            for artifact in receipt.artifactHashes
        ) or '<tr><td colspan="3">No artifacts recorded.</td></tr>'

        sanitized_receipt = escape(
            json.dumps(sanitize_receipt(receipt.model_dump()), indent=2)
        )

        return f"""
<section class="panel side-panel audit-panel">
  <div class="section-heading">
    <div>
      <span>Audit Receipt</span>
      <h2>Local integrity record</h2>
    </div>
  </div>

  <dl class="receipt-grid">
    <div><dt>Input</dt><dd><code>{escape(short_hash(receipt.inputHash))}</code></dd></div>
    <div><dt>Result</dt><dd><code>{escape(short_hash(receipt.resultHash))}</code></dd></div>
    <div><dt>Config</dt><dd><code>{escape(short_hash(receipt.configHash))}</code></dd></div>
    <div><dt>Signature</dt><dd><code>{escape(short_hash(receipt.signature.value))}</code></dd></div>
  </dl>

  <div class="table-wrap mini">
    <table>
      <thead>
        <tr>
          <th>Artifact</th>
          <th>File</th>
          <th>Hash</th>
        </tr>
      </thead>
      <tbody>{artifact_rows}</tbody>
    </table>
  </div>

  <details class="raw-receipt">
    <summary>View sanitized receipt payload</summary>
    <pre>{sanitized_receipt}</pre>
  </details>
</section>
"""

    def severity_counts(self) -> dict[str, int]:
        return {
            severity: sum(1 for finding in self.report.findings if finding.severity == severity)
            for severity in SEVERITY_ORDER
        }

    def highest_severity_label(self) -> str:
        for severity in SEVERITY_ORDER:
            if any(finding.severity == severity for finding in self.report.findings):
                return SEVERITY_LABELS.get(severity, severity.title())
        return "None"

    def verdict_class(self) -> str:
        if any(finding.severity in {"critical", "high"} for finding in self.report.findings):
            return "danger"
        if any(finding.severity == "medium" for finding in self.report.findings):
            return "warning"
        if self.report.findings:
            return "review"
        return "success"

    def verdict_label(self) -> str:
        if any(finding.severity in {"critical", "high"} for finding in self.report.findings):
            return "Action required"
        if any(finding.severity == "medium" for finding in self.report.findings):
            return "Review recommended"
        if self.report.findings:
            return "Notes recorded"
        return "No findings"

    def quality_class(self) -> str:
        q = self.report.qualityReport
        if q.glareRisk == "high" or not q.resolutionAdequate:
            return "warning"
        if q.warnings:
            return "review"
        return "success"

    def quality_label(self) -> str:
        q = self.report.qualityReport
        if q.glareRisk == "high" or not q.resolutionAdequate:
            return "Needs review"
        if q.warnings:
            return "Check capture"
        return "Good"

    def executive_summary(self) -> str:
        if not self.report.findings:
            return "No findings were recorded for this run. The report still includes the image fingerprint, quality metrics, evidence map, and local audit receipt."

        medium_or_higher = [
            finding for finding in self.report.findings
            if finding.severity in {"critical", "high", "medium"}
        ]
        model_skipped = any("model is not loaded" in finding.description.lower() for finding in self.report.findings)

        if medium_or_higher and model_skipped:
            return (
                "The run produced quality-related review items and the requested detector was not loaded. "
                "Treat this as a capture and configuration check, not a final model-backed inspection."
            )

        if medium_or_higher:
            return (
                "The run produced findings that should be reviewed before relying on the image. "
                "Use the quality notes and evidence map to decide whether the image should be retaken or reprocessed."
            )

        return (
            "The run produced low-priority or informational findings. Review the notes, then decide whether the image is sufficient for the intended audit."
        )

    def artifact_by_id(self, artifact_id: str) -> dict[str, str] | None:
        for artifact in self.report.auditReceipt.artifactHashes:
            if artifact.artifactId == artifact_id:
                return artifact.model_dump()
        return None


def metric_card(label: str, value: str, hint: str, *, monospace: bool = False) -> str:
    value_class = "metric-card__value mono" if monospace else "metric-card__value"
    return f"""
<article class="metric-card">
  <span>{escape(label)}</span>
  <strong class="{value_class}">{value}</strong>
  <small>{escape(hint)}</small>
</article>
"""


def severity_chip(severity: str, count: int) -> str:
    return f'<span class="severity-chip severity-chip--{escape(severity)}">{escape(SEVERITY_LABELS.get(severity, severity.title()))}: {count}</span>'


def quality_metric(label: str, value: str, hint: str) -> str:
    return f"""
<div class="quality-metric">
  <span>{escape(label)}</span>
  <strong>{value}</strong>
  <small>{escape(hint)}</small>
</div>
"""


def clean_finding_title(finding: Any) -> str:
    if finding.title.lower().strip() == "image quality warning":
        cleaned = clean_sentence(finding.description)
        cleaned = re.sub(r"^Image quality warning:\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.split(" This may reduce reliability")[0]
        return cleaned.rstrip(".") or "Image quality warning"

    return clean_sentence(finding.title).rstrip(".")


def clean_finding_description(finding: Any) -> str:
    description = clean_sentence(finding.description)
    description = re.sub(r"^Image quality warning:\s*", "", description, flags=re.IGNORECASE)

    if "This may reduce reliability" in description:
        issue = description.split(" This may reduce reliability")[0].rstrip(".")
        return f"{issue}. This may reduce confidence in the automated review."

    return description


def clean_recommendation(finding: Any) -> str:
    recommendation = clean_sentence(finding.recommendation)

    if finding.title.lower().strip() == "image quality warning":
        return "Retake or replace the image if this warning affects review confidence."

    return recommendation


def clean_sentence(value: str) -> str:
    cleaned = " ".join(value.split())
    cleaned = re.sub(r"\.{2,}", ".", cleaned)
    cleaned = cleaned.replace(" .", ".")
    if cleaned and cleaned[-1] not in ".!?":
        cleaned += "."
    return cleaned


def format_bbox(bbox: Any) -> str:
    return escape(
        f"x={bbox.x:.1f}, y={bbox.y:.1f}, w={bbox.width:.1f}, h={bbox.height:.1f}"
    )


def format_datetime(value: str) -> str:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value

    return parsed.strftime("%Y-%m-%d %H:%M UTC")


def short_hash(value: str) -> str:
    if not value:
        return "not recorded"
    if len(value) <= 18:
        return value
    return f"{value[:10]}â€¦{value[-8:]}"


def short_id(value: str) -> str:
    if not value:
        return "not recorded"
    if "_" in value:
        prefix, suffix = value.split("_", 1)
        return f"{prefix}_{suffix[:8]}"
    return value[:12]


def filename_from_path(path: str) -> str:
    if not path:
        return "not recorded"

    if "\\" in path:
        return PureWindowsPath(path).name

    return Path(path).name


def safe_artifact_href(path: str) -> str:
    # Reports and assets are exported into the same report folder. Use the file name
    # instead of leaking full local filesystem paths into the HTML.
    return filename_from_path(path)


def sanitize_receipt(payload: dict[str, Any]) -> dict[str, Any]:
    sanitized = deepcopy(payload)

    for artifact in sanitized.get("artifactHashes", []):
        if isinstance(artifact, dict) and "path" in artifact:
            artifact["file"] = filename_from_path(str(artifact.get("path", "")))
            artifact.pop("path", None)

    return sanitized



from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from pydantic import BaseModel, ConfigDict

from veriframe_core.contracts.analysis import AuditArtifactHash, BoundingBox, DetectedRegion, ImageMetadata


class EvidenceMapRegion(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    regionId: str
    label: str
    category: str
    bbox: BoundingBox
    confidence: float
    evidenceRefs: list[str]


class EvidenceMapPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schemaVersion: str
    runId: str
    imageId: str
    width: int
    height: int
    regions: list[EvidenceMapRegion]
    artifactHashes: list[AuditArtifactHash]
    generatedAt: str


def create_evidence_map_payload(
    *,
    run_id: str,
    image: ImageMetadata,
    regions: list[DetectedRegion],
    artifact_hashes: list[AuditArtifactHash],
) -> EvidenceMapPayload:
    return EvidenceMapPayload(
        schemaVersion="1.0.0",
        runId=run_id,
        imageId=image.imageId,
        width=image.width,
        height=image.height,
        regions=[
            EvidenceMapRegion(
                regionId=region.regionId,
                label=region.label,
                category=region.category,
                bbox=region.bbox,
                confidence=region.confidence,
                evidenceRefs=[f"region:{region.regionId}", "artifact:evidence_overlay"],
            )
            for region in regions
        ],
        artifactHashes=artifact_hashes,
        generatedAt=datetime.now(timezone.utc).isoformat(),
    )


def write_evidence_map(payload: EvidenceMapPayload, output_path: str | Path) -> Path:
    target = Path(output_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(payload.model_dump_json(indent=2), encoding="utf-8")
    return target

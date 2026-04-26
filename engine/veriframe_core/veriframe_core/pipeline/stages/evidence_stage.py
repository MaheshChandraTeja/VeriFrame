from __future__ import annotations

from pathlib import Path

from veriframe_core.contracts.analysis import AuditArtifactHash
from veriframe_core.evidence.evidence_map import create_evidence_map_payload, write_evidence_map
from veriframe_core.evidence.overlay_renderer import render_overlay
from veriframe_core.evidence.region_cropper import export_region_crops
from veriframe_core.importing.hash_utils import compute_sha256
from veriframe_core.pipeline.pipeline_context import PipelineContext
from veriframe_core.pipeline.stages.base_stage import PipelineStage


class EvidenceStage(PipelineStage):
    name = "evidence"

    def execute(self, context: PipelineContext) -> PipelineContext:
        context.assert_not_cancelled()
        self.update(context, 72, "Rendering evidence artifacts.")

        if context.image is None:
            raise RuntimeError("Import stage did not populate image metadata.")

        overlay_path = context.output_dir / "evidence-overlay.png"
        render_overlay(
            image_path=context.image_path,
            regions=context.regions,
            output_path=overlay_path,
        )
        context.add_artifact_hash(make_artifact("evidence_overlay", overlay_path))

        crop_paths = export_region_crops(
            image_path=context.image_path,
            regions=context.regions,
            output_dir=context.output_dir / "region-crops",
        )
        for crop_path in crop_paths:
            context.add_artifact_hash(make_artifact(f"region_crop:{crop_path.stem}", crop_path))

        evidence_map = create_evidence_map_payload(
            run_id=context.run_id,
            image=context.image,
            regions=context.regions,
            artifact_hashes=context.artifact_hashes,
        )
        evidence_map_path = write_evidence_map(evidence_map, context.output_dir / "evidence-map.json")
        context.add_artifact_hash(make_artifact("evidence_map", evidence_map_path))

        context.stage_outputs[self.name] = {
            "overlayPath": str(overlay_path),
            "cropCount": len(crop_paths),
            "evidenceMapPath": str(evidence_map_path),
        }
        return context


def make_artifact(artifact_id: str, path: str | Path) -> AuditArtifactHash:
    artifact_path = Path(path)
    return AuditArtifactHash(
        artifactId=artifact_id,
        path=str(artifact_path),
        sha256=compute_sha256(artifact_path),
    )

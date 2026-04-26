from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from veriframe_core.audit.signing import deterministic_hash, local_integrity_signature
from veriframe_core.contracts.analysis import (
    AnalysisRequest,
    AuditReceipt,
    AuditSignature,
    ImageMetadata,
    ModelInfo,
)
from veriframe_core.contracts.analysis import AuditArtifactHash


def create_audit_receipt(
    *,
    run_id: str,
    request: AnalysisRequest,
    image: ImageMetadata,
    models: list[ModelInfo],
    artifact_hashes: list[AuditArtifactHash],
    findings_payload: object,
    generated_at: str | None = None,
) -> AuditReceipt:
    generated = generated_at or datetime.now(timezone.utc).isoformat()
    request_payload = request.model_dump()
    result_payload = {
        "runId": run_id,
        "image": image.model_dump(),
        "findings": findings_payload,
        "models": [model.model_dump() for model in models],
        "artifacts": [artifact.model_dump() for artifact in artifact_hashes],
    }

    input_hash = image.sha256
    result_hash = deterministic_hash(result_payload)
    config_hash = deterministic_hash(request_payload)
    signature_payload = {
        "inputHash": input_hash,
        "resultHash": result_hash,
        "configHash": config_hash,
        "models": [model.model_dump() for model in models],
        "artifactHashes": [artifact.model_dump() for artifact in artifact_hashes],
        "generatedAt": generated,
    }
    signature = local_integrity_signature(signature_payload)

    return AuditReceipt(
        schemaVersion="1.0.0",
        receiptId=f"receipt_{uuid4().hex}",
        runId=run_id,
        generatedAt=generated,
        inputHash=input_hash,
        resultHash=result_hash,
        configHash=config_hash,
        modelRefs=[
            {
                "modelId": model.modelId,
                "version": model.version,
                "configHash": model.configHash,
                "checkpointHash": model.checkpointHash,
            }
            for model in models
        ],
        artifactHashes=artifact_hashes,
        signature=AuditSignature(
            algorithm=signature["algorithm"],
            value=signature["value"],
        ),
    )

from veriframe_core.audit.audit_receipt import create_audit_receipt
from veriframe_core.audit.signing import deterministic_hash
from veriframe_core.contracts.analysis import AnalysisRequest, AnalysisSource, ImageMetadata


def test_deterministic_hash_is_stable_for_dict_order() -> None:
    left = {"b": 2, "a": 1}
    right = {"a": 1, "b": 2}

    assert deterministic_hash(left) == deterministic_hash(right)


def test_audit_receipt_generation_is_consistent_for_core_hashes() -> None:
    request = AnalysisRequest(
        schemaVersion="1.0.0",
        requestId="req_1",
        source=AnalysisSource(type="image_file", path="receipt.jpg", sha256=None),
        workflow="visual_audit",
        requestedTasks=["quality"],
        modelProfileIds=[],
        options={
            "confidenceThreshold": 0.5,
            "maxImageSizePx": 4096,
            "includeExif": False,
            "exportArtifacts": True,
        },
        createdAt="2026-04-26T00:00:00Z",
    )
    image = ImageMetadata(
        imageId="img_1",
        fileName="receipt.jpg",
        sha256="a" * 64,
        mimeType="image/jpeg",
        width=640,
        height=480,
        sizeBytes=100,
        exifPresent=False,
    )

    first = create_audit_receipt(
        run_id="run_1",
        request=request,
        image=image,
        models=[],
        artifact_hashes=[],
        findings_payload=[],
        generated_at="2026-04-26T00:00:00Z",
    )
    second = create_audit_receipt(
        run_id="run_1",
        request=request,
        image=image,
        models=[],
        artifact_hashes=[],
        findings_payload=[],
        generated_at="2026-04-26T00:00:00Z",
    )

    assert first.inputHash == second.inputHash
    assert first.resultHash == second.resultHash
    assert first.configHash == second.configHash
    assert first.signature.value == second.signature.value

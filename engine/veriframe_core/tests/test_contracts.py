from __future__ import annotations

import json
from pathlib import Path

from veriframe_core.contracts.analysis import AnalysisRequest, AnalysisResult


def test_sample_analysis_result_matches_python_contract() -> None:
    repo_root = Path(__file__).resolve().parents[3]
    sample_path = repo_root / "packages" / "shared-fixtures" / "analysis" / "sample-analysis-result.json"

    payload = json.loads(sample_path.read_text(encoding="utf-8"))
    result = AnalysisResult.model_validate(payload)

    assert result.schemaVersion == "1.0.0"
    assert result.status == "completed"
    assert result.auditReceipt.signature.algorithm == "sha256-local-integrity"


def test_analysis_request_contract_accepts_valid_payload() -> None:
    payload = {
        "schemaVersion": "1.0.0",
        "requestId": "req_test",
        "source": {
            "type": "image_file",
            "path": "sample.jpg",
        },
        "workflow": "visual_audit",
        "requestedTasks": ["quality", "detection"],
        "modelProfileIds": [],
        "options": {
            "confidenceThreshold": 0.5,
            "maxImageSizePx": 4096,
            "includeExif": False,
            "exportArtifacts": True,
        },
        "createdAt": "2026-04-26T00:00:00Z",
    }

    request = AnalysisRequest.model_validate(payload)

    assert request.requestId == "req_test"
    assert request.source.type == "image_file"

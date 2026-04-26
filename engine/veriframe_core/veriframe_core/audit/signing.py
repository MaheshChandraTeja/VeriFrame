from __future__ import annotations

import hashlib
import json
from typing import Any


def deterministic_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def deterministic_hash(value: Any) -> str:
    return hashlib.sha256(deterministic_json(value).encode("utf-8")).hexdigest()


def file_sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def local_integrity_signature(payload: Any) -> dict[str, str]:
    return {
        "algorithm": "sha256-local-integrity",
        "value": deterministic_hash(payload),
    }

from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field


class DatasetRegistryEntry(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    datasetId: str
    name: str = Field(min_length=1)
    path: str = Field(min_length=1)
    schemaPath: str = Field(min_length=1)
    labels: list[str]
    splitInfo: dict[str, int]
    createdAt: str
    updatedAt: str


class DatasetRegistry:
    def __init__(self, registry_path: str | Path) -> None:
        self.registry_path = Path(registry_path)
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)

    def list(self) -> list[DatasetRegistryEntry]:
        return [
            DatasetRegistryEntry.model_validate(item)
            for item in self._read_payload().get("datasets", [])
        ]

    def add(
        self,
        *,
        name: str,
        path: str | Path,
        schema_path: str | Path,
        labels: list[str],
        split_info: dict[str, int] | None = None,
        timestamp: str,
    ) -> DatasetRegistryEntry:
        payload = self._read_payload()
        entry = DatasetRegistryEntry(
            datasetId=f"dataset_{uuid4().hex}",
            name=name,
            path=str(Path(path)),
            schemaPath=str(Path(schema_path)),
            labels=labels,
            splitInfo=split_info or {"train": 0, "val": 0, "test": 0, "unassigned": 0},
            createdAt=timestamp,
            updatedAt=timestamp,
        )

        payload.setdefault("datasets", []).append(entry.model_dump())
        self._write_payload(payload)

        return entry

    def remove(self, dataset_id: str) -> bool:
        payload = self._read_payload()
        datasets = payload.get("datasets", [])
        kept = [dataset for dataset in datasets if dataset.get("datasetId") != dataset_id]
        payload["datasets"] = kept
        self._write_payload(payload)
        return len(kept) != len(datasets)

    def _read_payload(self) -> dict[str, object]:
        if not self.registry_path.exists():
            return {"schemaVersion": "1.0.0", "datasets": []}
        return json.loads(self.registry_path.read_text(encoding="utf-8"))

    def _write_payload(self, payload: dict[str, object]) -> None:
        self.registry_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

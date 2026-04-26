from __future__ import annotations

import sqlite3

from veriframe_core.contracts.analysis import ModelInfo
from veriframe_core.storage.json_utils import dumps_json


class ModelRunRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def insert_many(self, *, run_id: str, models: list[ModelInfo]) -> None:
        self.connection.execute("DELETE FROM model_runs WHERE run_id = ?", (run_id,))
        self.connection.executemany(
            """
            INSERT INTO model_runs (
                run_id,
                model_id,
                name,
                version,
                task,
                framework,
                device,
                config_hash,
                checkpoint_hash,
                labels_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    run_id,
                    model.modelId,
                    model.name,
                    model.version,
                    model.task,
                    model.framework,
                    model.device,
                    model.configHash,
                    model.checkpointHash,
                    dumps_json(model.labels),
                )
                for model in models
            ],
        )

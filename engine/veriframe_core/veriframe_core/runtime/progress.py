from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Literal

from pydantic import BaseModel, Field

ProgressStatus = Literal["queued", "running", "completed", "failed", "cancelled"]


class ProgressSnapshot(BaseModel):
    runId: str
    status: ProgressStatus
    percent: int = Field(ge=0, le=100)
    message: str


@dataclass(slots=True)
class ProgressReporter:
    run_id: str
    registry: "ProgressRegistry"

    def update(self, status: ProgressStatus, percent: int, message: str) -> ProgressSnapshot:
        return self.registry.update(self.run_id, status, percent, message)


class ProgressRegistry:
    def __init__(self) -> None:
        self._progress: dict[str, ProgressSnapshot] = {}
        self._lock = Lock()

    def create(self, run_id: str, message: str = "Queued.") -> ProgressReporter:
        with self._lock:
            self._progress[run_id] = ProgressSnapshot(
                runId=run_id,
                status="queued",
                percent=0,
                message=message,
            )

        return ProgressReporter(run_id=run_id, registry=self)

    def update(
        self,
        run_id: str,
        status: ProgressStatus,
        percent: int,
        message: str,
    ) -> ProgressSnapshot:
        snapshot = ProgressSnapshot(
            runId=run_id,
            status=status,
            percent=max(0, min(100, percent)),
            message=message,
        )

        with self._lock:
            self._progress[run_id] = snapshot

        return snapshot

    def get(self, run_id: str) -> ProgressSnapshot | None:
        with self._lock:
            return self._progress.get(run_id)

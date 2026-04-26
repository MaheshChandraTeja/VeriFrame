from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock


@dataclass(slots=True)
class CancellationToken:
    run_id: str
    _cancelled: bool = False
    _lock: Lock = field(default_factory=Lock)

    def cancel(self) -> None:
        with self._lock:
            self._cancelled = True

    def is_cancelled(self) -> bool:
        with self._lock:
            return self._cancelled


class CancellationRegistry:
    def __init__(self) -> None:
        self._tokens: dict[str, CancellationToken] = {}
        self._lock = Lock()

    def create(self, run_id: str) -> CancellationToken:
        with self._lock:
            token = CancellationToken(run_id=run_id)
            self._tokens[run_id] = token
            return token

    def get(self, run_id: str) -> CancellationToken | None:
        with self._lock:
            return self._tokens.get(run_id)

    def cancel(self, run_id: str) -> bool:
        token = self.get(run_id)

        if token is None:
            return False

        token.cancel()
        return True

    def remove(self, run_id: str) -> None:
        with self._lock:
            self._tokens.pop(run_id, None)

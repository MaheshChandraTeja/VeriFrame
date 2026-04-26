from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class ErrorPayload:
    code: str
    message: str
    details: dict[str, Any] | None = None


class EngineError(Exception):
    code = "ENGINE_ERROR"
    status_code = 500

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details

    def to_payload(self) -> ErrorPayload:
        return ErrorPayload(
            code=self.code,
            message=self.message,
            details=self.details,
        )


class InvalidImageError(EngineError):
    code = "INVALID_IMAGE"
    status_code = 400


class ModelLoadError(EngineError):
    code = "MODEL_LOAD_ERROR"
    status_code = 500


class AnalysisCancelledError(EngineError):
    code = "ANALYSIS_CANCELLED"
    status_code = 409


class ReportGenerationError(EngineError):
    code = "REPORT_GENERATION_ERROR"
    status_code = 500


class StorageError(EngineError):
    code = "STORAGE_ERROR"
    status_code = 500


class NotFoundError(EngineError):
    code = "NOT_FOUND"
    status_code = 404


class UnauthorizedError(EngineError):
    code = "UNAUTHORIZED"
    status_code = 401


class ModuleUnavailableError(EngineError):
    code = "MODULE_UNAVAILABLE"
    status_code = 501

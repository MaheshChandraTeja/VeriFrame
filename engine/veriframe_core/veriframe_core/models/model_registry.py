from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from veriframe_core.models.model_card import ModelCard, ModelTask

ModelFamily = Literal["fasterrcnn", "maskrcnn", "resnet18"]
OutputParser = Literal["detection", "segmentation", "classification"]


class PreprocessingConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    resizeShortSide: int | None = None
    centerCrop: int | None = None
    maxSide: int = Field(default=2048, ge=256, le=8192)
    normalize: bool = True


class ModelProfile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    modelId: str = Field(min_length=1)
    name: str = Field(min_length=1)
    version: str = Field(min_length=1)
    task: ModelTask
    modelFamily: ModelFamily
    labels: list[str] = Field(min_length=1)
    configPath: str
    checkpointPath: str | None = None
    checkpointRequired: bool = False
    pretrained: bool = False
    preprocessing: PreprocessingConfig = Field(default_factory=PreprocessingConfig)
    outputParser: OutputParser
    description: str


class ModelProfileStatus(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    modelId: str
    name: str
    version: str
    task: ModelTask
    labels: list[str]
    configPath: str
    checkpointPath: str | None
    checkpointPresent: bool
    checkpointRequired: bool
    loadable: bool
    loaded: bool
    device: str | None
    description: str


class ModelRegistry:
    def __init__(self, config_dir: str | Path | None = None, card_dir: str | Path | None = None) -> None:
        self.config_dir = (
            Path(config_dir).expanduser().resolve()
            if config_dir is not None
            else default_model_config_dir()
        )
        self.card_dir = (
            Path(card_dir).expanduser().resolve()
            if card_dir is not None
            else default_model_card_dir()
        )

    @classmethod
    def default(cls) -> "ModelRegistry":
        return cls()

    def list_profiles(self) -> list[ModelProfile]:
        profiles: list[ModelProfile] = []

        if not self.config_dir.exists():
            return profiles

        for path in sorted(self.config_dir.glob("*.json")):
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload.setdefault("configPath", str(path))
            profile = ModelProfile.model_validate(payload)
            profiles.append(profile)

        return profiles

    def get_profile(self, model_id: str) -> ModelProfile:
        for profile in self.list_profiles():
            if profile.modelId == model_id:
                return profile

        raise KeyError(f"Model profile not found: {model_id}")

    def list_statuses(
        self,
        *,
        loaded_model_ids: set[str] | None = None,
        loaded_devices: dict[str, str] | None = None,
    ) -> list[ModelProfileStatus]:
        loaded_model_ids = loaded_model_ids or set()
        loaded_devices = loaded_devices or {}

        return [
            self.profile_status(
                profile,
                loaded=profile.modelId in loaded_model_ids,
                device=loaded_devices.get(profile.modelId),
            )
            for profile in self.list_profiles()
        ]

    def profile_status(
        self,
        profile: ModelProfile,
        *,
        loaded: bool = False,
        device: str | None = None,
    ) -> ModelProfileStatus:
        checkpoint_present = bool(
            profile.checkpointPath and Path(profile.checkpointPath).expanduser().exists()
        )
        loadable = not profile.checkpointRequired or checkpoint_present

        return ModelProfileStatus(
            modelId=profile.modelId,
            name=profile.name,
            version=profile.version,
            task=profile.task,
            labels=profile.labels,
            configPath=profile.configPath,
            checkpointPath=profile.checkpointPath,
            checkpointPresent=checkpoint_present,
            checkpointRequired=profile.checkpointRequired,
            loadable=loadable,
            loaded=loaded,
            device=device,
            description=profile.description,
        )

    def load_model_card(self, model_id: str) -> ModelCard | None:
        card_path = self.card_dir / f"{model_id.replace('_', '-')}.md"

        if not card_path.exists():
            return None

        profile = self.get_profile(model_id)

        return ModelCard(
            modelId=profile.modelId,
            name=profile.name,
            version=profile.version,
            task=profile.task,
            trainingDataSummary=card_path.read_text(encoding="utf-8"),
            limitations=[
                "This profile is local-first and may require a fine-tuned checkpoint for production accuracy.",
                "Base TorchVision architectures are not domain-specific evidence auditors by themselves.",
            ],
            inputSize=(profile.preprocessing.maxSide, profile.preprocessing.maxSide),
            labels=profile.labels,
            metrics=[],
            license="Project-local / user-provided checkpoints",
            cardPath=str(card_path),
        )


def default_model_config_dir() -> Path:
    override = os.getenv("VERIFRAME_MODEL_CONFIG_DIR")
    if override:
        return Path(override).expanduser().resolve()

    candidates = model_resource_candidates("configs")

    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate

    # Return the first candidate so callers get a stable path even if empty.
    return candidates[0]


def default_model_card_dir() -> Path:
    override = os.getenv("VERIFRAME_MODEL_CARD_DIR")
    if override:
        return Path(override).expanduser().resolve()

    candidates = model_resource_candidates("model_cards")

    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate

    return candidates[0]


def model_resource_candidates(kind: str) -> list[Path]:
    candidates: list[Path] = []

    # PyInstaller onefile extraction directory.
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        root = Path(meipass).resolve()
        candidates.extend(
            [
                root / "models" / kind,
                root / "resources" / "models" / kind,
            ]
        )

    # Folder beside the packaged executable.
    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).resolve().parent
        candidates.extend(
            [
                exe_dir / "resources" / "models" / kind,
                exe_dir / "models" / kind,
            ]
        )

    # Current working directory, useful for portable builds.
    try:
        cwd = Path.cwd().resolve()
        candidates.extend(
            [
                cwd / "resources" / "models" / kind,
                cwd / "models" / kind,
            ]
        )
    except Exception:
        pass

    # Source-tree development mode.
    repo_root = find_repo_root()
    candidates.append(repo_root / "models" / kind)

    # Deduplicate while preserving order.
    seen: set[str] = set()
    unique: list[Path] = []

    for candidate in candidates:
        key = str(candidate).lower()
        if key not in seen:
            seen.add(key)
            unique.append(candidate)

    return unique


def find_repo_root() -> Path:
    search_roots: list[Path] = []

    try:
        search_roots.append(Path(__file__).resolve())
    except Exception:
        pass

    try:
        search_roots.append(Path.cwd().resolve())
    except Exception:
        pass

    if getattr(sys, "frozen", False):
        try:
            search_roots.append(Path(sys.executable).resolve())
        except Exception:
            pass

    for start in search_roots:
        for parent in [start, *start.parents]:
            if (parent / "package.json").exists() and (parent / "engine").exists():
                return parent

    return Path.cwd().resolve()

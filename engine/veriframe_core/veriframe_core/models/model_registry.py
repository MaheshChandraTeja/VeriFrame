from __future__ import annotations

import json
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
        repo_root = find_repo_root()
        self.config_dir = Path(config_dir) if config_dir is not None else repo_root / "models" / "configs"
        self.card_dir = Path(card_dir) if card_dir is not None else repo_root / "models" / "model_cards"

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


def find_repo_root() -> Path:
    current = Path(__file__).resolve()

    for parent in current.parents:
        if (parent / "package.json").exists() and (parent / "engine").exists():
            return parent

    return current.parents[4]

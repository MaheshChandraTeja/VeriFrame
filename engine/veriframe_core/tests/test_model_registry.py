from veriframe_core.models.model_registry import ModelRegistry


def test_registry_loads_default_profiles() -> None:
    registry = ModelRegistry.default()
    profiles = registry.list_profiles()
    ids = {profile.modelId for profile in profiles}

    assert "general_object_detector" in ids
    assert "receipt_region_detector" in ids
    assert "damage_detector" in ids
    assert "display_panel_detector" in ids
    assert "product_package_detector" in ids


def test_registry_status_marks_no_checkpoint_profiles_loadable() -> None:
    registry = ModelRegistry.default()
    profile = registry.get_profile("general_object_detector")
    status = registry.profile_status(profile)

    assert status.loadable is True
    assert status.loaded is False
    assert status.task == "detection"

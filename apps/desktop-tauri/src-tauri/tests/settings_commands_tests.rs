use veriframe_desktop::commands::settings_commands::normalize_setting_key;

#[test]
fn normalizes_setting_keys() {
    assert_eq!(
        normalize_setting_key(" privacy__includeExifByDefault "),
        "privacy.includeExifByDefault"
    );
}

use veriframe_desktop_lib::engine::sidecar::build_default_sidecar_command_spec;

#[test]
fn default_sidecar_command_binds_to_localhost() {
    let spec = build_default_sidecar_command_spec(32187, "vf_test_token");

    assert_eq!(spec.program, "conda");
    assert!(spec.args.contains(&"127.0.0.1".to_string()));
    assert!(spec.args.contains(&"32187".to_string()));
    assert!(spec.args.contains(&"vf_test_token".to_string()));
}

#[test]
fn default_sidecar_uses_veriframe_conda_environment() {
    let spec = build_default_sidecar_command_spec(32187, "vf_test_token");

    let joined = spec.args.join(" ");

    assert!(joined.contains("run -n veriframe"));
    assert!(joined.contains("python -m veriframe_core.cli serve"));
}

#[test]
fn default_sidecar_does_not_bind_public_interfaces() {
    let spec = build_default_sidecar_command_spec(32187, "vf_test_token");

    assert!(!spec.args.contains(&"0.0.0.0".to_string()));
}

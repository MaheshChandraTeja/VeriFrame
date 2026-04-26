use std::fs;

use tempfile::tempdir;
use veriframe_desktop_lib::security::path_guard::{
    is_supported_image_path, validate_existing_folder, validate_existing_image_file,
};

#[test]
fn accepts_supported_image_file() {
    let temp = tempdir().expect("temp dir");
    let image_path = temp.path().join("receipt.jpg");
    fs::write(&image_path, b"fake image bytes").expect("write test image");

    let validated = validate_existing_image_file(&image_path).expect("valid image");

    assert!(validated.supported);
    assert!(validated.canonical_path.ends_with("receipt.jpg"));
}

#[test]
fn rejects_unsupported_image_file() {
    let temp = tempdir().expect("temp dir");
    let text_path = temp.path().join("notes.txt");
    fs::write(&text_path, b"nope").expect("write test text");

    let error = validate_existing_image_file(&text_path).expect_err("unsupported file");
    assert_eq!(error.code(), "UNSUPPORTED_FILE_TYPE");
}

#[test]
fn accepts_existing_folder() {
    let temp = tempdir().expect("temp dir");

    let validated = validate_existing_folder(temp.path()).expect("valid folder");

    assert!(validated.supported);
}

#[test]
fn rejects_parent_traversal_before_canonicalization() {
    let temp = tempdir().expect("temp dir");
    let suspicious = temp.path().join("safe").join("..").join("receipt.jpg");

    let error = validate_existing_image_file(&suspicious).expect_err("traversal should fail");
    assert_eq!(error.code(), "FORBIDDEN_PATH");
}

#[test]
fn supported_image_extension_check_is_case_insensitive() {
    assert!(is_supported_image_path("PHOTO.JPEG"));
    assert!(is_supported_image_path("evidence.PNG"));
    assert!(!is_supported_image_path("payload.exe"));
}

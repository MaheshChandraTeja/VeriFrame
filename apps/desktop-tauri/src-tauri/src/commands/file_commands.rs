use std::path::PathBuf;

use rfd::FileDialog;
use serde::Deserialize;
use tauri::State;

use crate::errors::AppError;
use crate::security::path_guard::{
    validate_existing_file_or_folder, validate_existing_folder, validate_existing_image_file,
    PathValidationResponse,
};
use crate::state::AppState;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExpectedPathKind {
    ImageFile,
    Folder,
    FileOrFolder,
}

#[tauri::command]
pub async fn select_images() -> Result<Vec<String>, AppError> {
    let selected = tauri::async_runtime::spawn_blocking(|| {
        FileDialog::new()
            .set_title("Select VeriFrame Evidence Images")
            .add_filter(
                "Images",
                &["jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff"],
            )
            .pick_files()
    })
    .await
    .map_err(|error| AppError::Internal(error.to_string()))?;

    let Some(paths) = selected else {
        return Ok(Vec::new());
    };

    paths
        .into_iter()
        .map(|path| {
            let validated = validate_existing_image_file(&path)?;
            Ok(validated.canonical_path)
        })
        .collect()
}

#[tauri::command]
pub async fn select_folder() -> Result<Option<String>, AppError> {
    let selected = tauri::async_runtime::spawn_blocking(|| {
        FileDialog::new()
            .set_title("Select VeriFrame Folder")
            .pick_folder()
    })
    .await
    .map_err(|error| AppError::Internal(error.to_string()))?;

    selected
        .map(|path| validate_existing_folder(path).map(|validated| validated.canonical_path))
        .transpose()
}

#[tauri::command]
pub async fn validate_file_path(
    path: String,
    expected_kind: Option<ExpectedPathKind>,
) -> Result<PathValidationResponse, AppError> {
    let expected_kind = expected_kind.unwrap_or(ExpectedPathKind::FileOrFolder);

    match expected_kind {
        ExpectedPathKind::ImageFile => validate_existing_image_file(path),
        ExpectedPathKind::Folder => validate_existing_folder(path),
        ExpectedPathKind::FileOrFolder => validate_existing_file_or_folder(path),
    }
}

#[tauri::command]
pub async fn open_report_location(
    state: State<'_, AppState>,
    path: Option<String>,
) -> Result<(), AppError> {
    let target = path
        .map(PathBuf::from)
        .unwrap_or_else(|| state.paths.reports_dir());

    let validated = validate_existing_file_or_folder(&target)?;
    open::that_detached(validated.canonical_path)
        .map_err(|error| AppError::Io(format!("Unable to open report location: {error}")))
}

#[tauri::command]
pub async fn reveal_in_file_manager(path: String) -> Result<(), AppError> {
    let validated = validate_existing_file_or_folder(&path)?;
    let target = PathBuf::from(validated.canonical_path);

    let reveal_target = if target.is_file() {
        target
            .parent()
            .map(PathBuf::from)
            .unwrap_or_else(|| target.clone())
    } else {
        target
    };

    open::that_detached(reveal_target)
        .map_err(|error| AppError::Io(format!("Unable to reveal path in file manager: {error}")))
}

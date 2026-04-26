use std::path::{Component, Path, PathBuf};

use serde::Serialize;

use crate::errors::AppError;

const SUPPORTED_IMAGE_EXTENSIONS: &[&str] = &[
    "jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff",
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathValidationResponse {
    pub path: String,
    pub canonical_path: String,
    pub kind: PathKind,
    pub supported: bool,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PathKind {
    File,
    Folder,
}

pub fn validate_existing_image_file(path: impl AsRef<Path>) -> Result<PathValidationResponse, AppError> {
    let path = path.as_ref();
    ensure_no_parent_traversal(path)?;

    let canonical = canonical_existing(path)?;

    if !canonical.is_file() {
        return Err(AppError::BadRequest(format!(
            "Expected an image file, got '{}'.",
            canonical.display()
        )));
    }

    if !is_supported_image_path(&canonical) {
        return Err(AppError::UnsupportedFileType(format!(
            "Unsupported image type for '{}'. Supported: {}.",
            canonical.display(),
            SUPPORTED_IMAGE_EXTENSIONS.join(", ")
        )));
    }

    Ok(PathValidationResponse {
        path: path.to_string_lossy().to_string(),
        canonical_path: canonical.to_string_lossy().to_string(),
        kind: PathKind::File,
        supported: true,
    })
}

pub fn validate_existing_folder(path: impl AsRef<Path>) -> Result<PathValidationResponse, AppError> {
    let path = path.as_ref();
    ensure_no_parent_traversal(path)?;

    let canonical = canonical_existing(path)?;

    if !canonical.is_dir() {
        return Err(AppError::BadRequest(format!(
            "Expected a folder, got '{}'.",
            canonical.display()
        )));
    }

    Ok(PathValidationResponse {
        path: path.to_string_lossy().to_string(),
        canonical_path: canonical.to_string_lossy().to_string(),
        kind: PathKind::Folder,
        supported: true,
    })
}

pub fn validate_existing_file_or_folder(path: impl AsRef<Path>) -> Result<PathValidationResponse, AppError> {
    let path = path.as_ref();
    ensure_no_parent_traversal(path)?;

    let canonical = canonical_existing(path)?;
    let kind = if canonical.is_dir() {
        PathKind::Folder
    } else if canonical.is_file() {
        PathKind::File
    } else {
        return Err(AppError::BadRequest(format!(
            "Path '{}' is neither a file nor a folder.",
            canonical.display()
        )));
    };

    Ok(PathValidationResponse {
        path: path.to_string_lossy().to_string(),
        canonical_path: canonical.to_string_lossy().to_string(),
        kind,
        supported: true,
    })
}

pub fn is_supported_image_path(path: impl AsRef<Path>) -> bool {
    path.as_ref()
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            SUPPORTED_IMAGE_EXTENSIONS
                .iter()
                .any(|allowed| allowed.eq_ignore_ascii_case(extension))
        })
        .unwrap_or(false)
}

fn ensure_no_parent_traversal(path: &Path) -> Result<(), AppError> {
    if path.components().any(|component| matches!(component, Component::ParentDir)) {
        return Err(AppError::ForbiddenPath(format!(
            "Path traversal is not allowed: '{}'.",
            path.display()
        )));
    }

    Ok(())
}

fn canonical_existing(path: &Path) -> Result<PathBuf, AppError> {
    std::fs::canonicalize(path).map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            AppError::NotFound(format!("Path does not exist: '{}'.", path.display()))
        } else {
            AppError::Io(format!("Unable to access '{}': {error}.", path.display()))
        }
    })
}

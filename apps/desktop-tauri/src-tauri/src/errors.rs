use serde::ser::SerializeStruct;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(String),

    #[error("{0}")]
    ForbiddenPath(String),

    #[error("{0}")]
    UnsupportedFileType(String),

    #[error("{0}")]
    NotFound(String),

    #[error("{0}")]
    EngineUnavailable(String),

    #[error("{0}")]
    ModuleUnavailable(String),

    #[error("{0}")]
    Io(String),

    #[error("{0}")]
    Internal(String),
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeError {
    pub code: &'static str,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

impl AppError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::BadRequest(_) => "BAD_REQUEST",
            Self::ForbiddenPath(_) => "FORBIDDEN_PATH",
            Self::UnsupportedFileType(_) => "UNSUPPORTED_FILE_TYPE",
            Self::NotFound(_) => "NOT_FOUND",
            Self::EngineUnavailable(_) => "ENGINE_UNAVAILABLE",
            Self::ModuleUnavailable(_) => "MODULE_UNAVAILABLE",
            Self::Io(_) => "IO_ERROR",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn native_error(&self) -> NativeError {
        NativeError {
            code: self.code(),
            message: self.to_string(),
            details: None,
        }
    }

    pub fn module_unavailable(module: &str) -> Self {
        Self::ModuleUnavailable(format!(
            "{module} is not available yet. Complete the corresponding VeriFrame module first."
        ))
    }
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let error = self.native_error();
        let mut state = serializer.serialize_struct("NativeError", 3)?;
        state.serialize_field("code", error.code)?;
        state.serialize_field("message", &error.message)?;
        state.serialize_field("details", &error.details)?;
        state.end()
    }
}

impl From<std::io::Error> for AppError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(value: anyhow::Error) -> Self {
        Self::Internal(value.to_string())
    }
}

use std::path::{Path, PathBuf};

use directories::ProjectDirs;

use crate::errors::AppError;

#[derive(Debug, Clone)]
pub struct AppPaths {
    app_data_dir: PathBuf,
}

impl AppPaths {
    pub fn new() -> Result<Self, AppError> {
        let project_dirs = ProjectDirs::from("com", "Kairais", "VeriFrame").ok_or_else(|| {
            AppError::Internal("Unable to resolve platform application data directory.".into())
        })?;

        Ok(Self {
            app_data_dir: project_dirs.data_dir().to_path_buf(),
        })
    }

    pub fn from_base_for_tests(base: impl Into<PathBuf>) -> Self {
        Self {
            app_data_dir: base.into(),
        }
    }

    pub fn app_data_dir(&self) -> &Path {
        &self.app_data_dir
    }

    pub fn temp_dir(&self) -> PathBuf {
        self.app_data_dir.join("temp")
    }

    pub fn reports_dir(&self) -> PathBuf {
        self.app_data_dir.join("reports")
    }

    pub fn logs_dir(&self) -> PathBuf {
        self.app_data_dir.join("logs")
    }

    pub fn models_dir(&self) -> PathBuf {
        self.app_data_dir.join("models")
    }

    pub fn database_path(&self) -> PathBuf {
        self.app_data_dir.join("veriframe.sqlite3")
    }

    pub fn ensure_all(&self) -> Result<(), AppError> {
        std::fs::create_dir_all(&self.app_data_dir)?;
        std::fs::create_dir_all(self.temp_dir())?;
        std::fs::create_dir_all(self.reports_dir())?;
        std::fs::create_dir_all(self.logs_dir())?;
        std::fs::create_dir_all(self.models_dir())?;

        Ok(())
    }
}

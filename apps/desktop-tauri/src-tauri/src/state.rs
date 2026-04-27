use std::collections::HashMap;
use std::sync::Arc;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::app_paths::AppPaths;
use crate::engine::sidecar::SidecarManager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisRunRecord {
    pub run_id: String,
    pub request_id: Option<String>,
    pub source_path: Option<String>,
    pub workflow: String,
    pub status: String,
    pub percent: u8,
    pub message: String,
    pub created_at: String,
    pub updated_at: String,
}

impl AnalysisRunRecord {
    pub fn new(source_path: Option<String>, workflow: Option<String>) -> Self {
        let now = Utc::now().to_rfc3339();

        Self {
            run_id: format!("run_{}", Uuid::new_v4().simple()),
            request_id: None,
            source_path,
            workflow: workflow.unwrap_or_else(|| "visual_audit".to_string()),
            status: "queued".to_string(),
            percent: 0,
            message: "Analysis run created locally and is ready for engine submission.".into(),
            created_at: now.clone(),
            updated_at: now,
        }
    }
}

#[derive(Debug)]
pub struct AppState {
    pub paths: AppPaths,
    pub sidecar: SidecarManager,
    pub analysis_runs: Arc<Mutex<HashMap<String, AnalysisRunRecord>>>,
}

impl AppState {
    pub fn new(paths: AppPaths) -> Self {
        Self {
            sidecar: SidecarManager::new(paths.clone()),
            paths,
            analysis_runs: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

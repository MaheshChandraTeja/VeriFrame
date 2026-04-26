use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::errors::AppError;
use crate::security::path_guard::validate_existing_image_file;
use crate::state::{AnalysisRunRecord, AppState};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAnalysisRunRequest {
    pub source_path: Option<String>,
    pub workflow: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisProgress {
    pub run_id: String,
    pub status: String,
    pub percent: u8,
    pub message: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn create_analysis_run(
    state: State<'_, AppState>,
    request: CreateAnalysisRunRequest,
) -> Result<AnalysisRunRecord, AppError> {
    if let Some(source_path) = &request.source_path {
        validate_existing_image_file(source_path)?;
    }

    let run = AnalysisRunRecord::new(request.source_path, request.workflow);
    let mut runs = state.analysis_runs.lock().await;
    runs.insert(run.run_id.clone(), run.clone());

    Ok(run)
}

#[tauri::command]
pub async fn submit_analysis_request(
    state: State<'_, AppState>,
    request: Value,
) -> Result<Value, AppError> {
    let Some(client) = state.sidecar.client().await else {
        return Err(AppError::EngineUnavailable(
            "Python engine is not running. Start the engine after Module 4 is implemented.".into(),
        ));
    };

    client.post_json("/analysis", &request).await
}

#[tauri::command]
pub async fn get_analysis_progress(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<AnalysisProgress, AppError> {
    let runs = state.analysis_runs.lock().await;
    let run = runs
        .get(&run_id)
        .ok_or_else(|| AppError::NotFound(format!("Analysis run not found: {run_id}")))?;

    Ok(AnalysisProgress {
        run_id: run.run_id.clone(),
        status: run.status.clone(),
        percent: run.percent,
        message: run.message.clone(),
        updated_at: run.updated_at.clone(),
    })
}

#[tauri::command]
pub async fn cancel_analysis(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<AnalysisProgress, AppError> {
    let mut runs = state.analysis_runs.lock().await;
    let run = runs
        .get_mut(&run_id)
        .ok_or_else(|| AppError::NotFound(format!("Analysis run not found: {run_id}")))?;

    run.status = "cancelled".into();
    run.percent = 0;
    run.message = "Analysis was cancelled locally.".into();
    run.updated_at = Utc::now().to_rfc3339();

    Ok(AnalysisProgress {
        run_id: run.run_id.clone(),
        status: run.status.clone(),
        percent: run.percent,
        message: run.message.clone(),
        updated_at: run.updated_at.clone(),
    })
}

#[tauri::command]
pub async fn load_analysis_result(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    let runs = state.analysis_runs.lock().await;
    let run = runs
        .get(&run_id)
        .ok_or_else(|| AppError::NotFound(format!("Analysis run not found: {run_id}")))?;

    serde_json::to_value(run).map_err(|error| AppError::Internal(error.to_string()))
}

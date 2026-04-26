use serde::Serialize;
use tauri::State;

use crate::engine::sidecar::EngineStatus;
use crate::errors::AppError;
use crate::state::AppState;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineLogsResponse {
    pub lines: Vec<String>,
}

#[tauri::command]
pub async fn engine_status(state: State<'_, AppState>) -> Result<EngineStatus, AppError> {
    Ok(state.sidecar.status().await)
}

#[tauri::command]
pub async fn start_engine(state: State<'_, AppState>) -> Result<EngineStatus, AppError> {
    state.sidecar.start().await
}

#[tauri::command]
pub async fn stop_engine(state: State<'_, AppState>) -> Result<EngineStatus, AppError> {
    state.sidecar.stop().await
}

#[tauri::command]
pub async fn restart_engine(state: State<'_, AppState>) -> Result<EngineStatus, AppError> {
    state.sidecar.restart().await
}

#[tauri::command]
pub async fn get_engine_logs(
    state: State<'_, AppState>,
    tail: Option<usize>,
) -> Result<EngineLogsResponse, AppError> {
    Ok(EngineLogsResponse {
        lines: state.sidecar.logs(tail).await,
    })
}

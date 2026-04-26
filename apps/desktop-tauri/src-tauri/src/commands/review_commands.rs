use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::errors::AppError;
use crate::state::AppState;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRegionCorrectionRequest {
    pub run_id: String,
    pub correction: Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFindingReviewRequest {
    pub run_id: String,
    pub review: Value,
}

#[tauri::command]
pub async fn get_review_session(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    let Some(client) = state.sidecar.client().await else {
        return Err(AppError::EngineUnavailable(
            "Python engine is not running. Start the local engine before reviewing.".into(),
        ));
    };

    client.get_json(&format!("/review/{run_id}")).await
}

#[tauri::command]
pub async fn save_region_correction(
    state: State<'_, AppState>,
    request: SaveRegionCorrectionRequest,
) -> Result<Value, AppError> {
    let Some(client) = state.sidecar.client().await else {
        return Err(AppError::EngineUnavailable(
            "Python engine is not running. Start the local engine before saving corrections.".into(),
        ));
    };

    client
        .post_json(
            &format!("/review/{}/regions", request.run_id),
            &request.correction,
        )
        .await
}

#[tauri::command]
pub async fn save_finding_review(
    state: State<'_, AppState>,
    request: SaveFindingReviewRequest,
) -> Result<Value, AppError> {
    let Some(client) = state.sidecar.client().await else {
        return Err(AppError::EngineUnavailable(
            "Python engine is not running. Start the local engine before saving review decisions.".into(),
        ));
    };

    client
        .post_json(
            &format!("/review/{}/findings", request.run_id),
            &request.review,
        )
        .await
}

#[tauri::command]
pub async fn export_review_dataset(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    let Some(client) = state.sidecar.client().await else {
        return Err(AppError::EngineUnavailable(
            "Python engine is not running. Start the local engine before exporting datasets.".into(),
        ));
    };

    client
        .post_json(&format!("/review/{run_id}/export-dataset"), &serde_json::json!({}))
        .await
}

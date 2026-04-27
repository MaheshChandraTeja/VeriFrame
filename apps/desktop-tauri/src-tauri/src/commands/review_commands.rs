use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;

use crate::errors::AppError;
use crate::state::AppState;

const DEFAULT_ENGINE_PORT: u16 = 32187;
const DEFAULT_DEV_TOKEN: &str = "dev-token";

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
    engine_get_json(&state, &format!("/review/{run_id}")).await
}

#[tauri::command]
pub async fn save_region_correction(
    state: State<'_, AppState>,
    request: SaveRegionCorrectionRequest,
) -> Result<Value, AppError> {
    engine_post_json(
        &state,
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
    engine_post_json(
        &state,
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
    engine_post_json(
        &state,
        &format!("/review/{run_id}/export-dataset"),
        &json!({}),
    )
    .await
}

async fn engine_get_json(state: &State<'_, AppState>, path: &str) -> Result<Value, AppError> {
    if let Some(client) = state.sidecar.client().await {
        match client.get_json(path).await {
            Ok(value) => return Ok(value),
            Err(error) => {
                tracing::warn!(
                    path,
                    error = %error,
                    "Managed review request failed; trying external local engine"
                );
            }
        }
    }

    external_request(reqwest::Method::GET, path, None).await
}

async fn engine_post_json(
    state: &State<'_, AppState>,
    path: &str,
    body: &Value,
) -> Result<Value, AppError> {
    if let Some(client) = state.sidecar.client().await {
        match client.post_json(path, body).await {
            Ok(value) => return Ok(value),
            Err(error) => {
                tracing::warn!(
                    path,
                    error = %error,
                    "Managed review request failed; trying external local engine"
                );
            }
        }
    }

    external_request(reqwest::Method::POST, path, Some(body)).await
}

async fn external_request(
    method: reqwest::Method,
    path: &str,
    body: Option<&Value>,
) -> Result<Value, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|error| AppError::EngineUnavailable(error.to_string()))?;

    let mut request = client
        .request(method, external_url(path))
        .header("x-veriframe-token", DEFAULT_DEV_TOKEN);

    if let Some(body) = body {
        request = request.json(body);
    }

    let response = request.send().await.map_err(|error| {
        AppError::EngineUnavailable(format!(
            "Local review engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
        ))
    })?;

    let status = response.status();

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();

        return Err(AppError::EngineUnavailable(format!(
            "Local review engine request failed with status {status}: {body}"
        )));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| AppError::EngineUnavailable(error.to_string()))
}

fn external_url(path: &str) -> String {
    format!(
        "http://127.0.0.1:{}/{}",
        DEFAULT_ENGINE_PORT,
        path.trim_start_matches('/')
    )
}

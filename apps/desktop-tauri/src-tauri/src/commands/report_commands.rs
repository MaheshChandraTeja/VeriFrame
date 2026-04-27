use serde_json::{json, Value};
use tauri::State;

use crate::errors::AppError;
use crate::state::AppState;

const DEFAULT_ENGINE_PORT: u16 = 32187;
const DEFAULT_DEV_TOKEN: &str = "dev-token";

#[tauri::command]
pub async fn list_reports(state: State<'_, AppState>) -> Result<Value, AppError> {
    engine_get_json(&state, "/reports").await
}

#[tauri::command]
pub async fn export_report_json(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    export_report(state, run_id, "json").await
}

#[tauri::command]
pub async fn export_report_html(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    export_report(state, run_id, "html").await
}

#[tauri::command]
pub async fn export_evidence_map(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    export_report(state, run_id, "evidence_map").await
}

#[tauri::command]
pub async fn export_audit_receipt(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    export_report(state, run_id, "audit_receipt").await
}

#[tauri::command]
pub async fn delete_report(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    engine_delete_json(&state, &format!("/reports/{run_id}")).await
}

async fn export_report(
    state: State<'_, AppState>,
    run_id: String,
    format: &str,
) -> Result<Value, AppError> {
    engine_post_json(
        &state,
        &format!("/reports/{run_id}/export"),
        &json!({ "format": format }),
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
                    "Managed report request failed; trying external development engine"
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
                    "Managed report export failed; trying external development engine"
                );
            }
        }
    }

    external_request(reqwest::Method::POST, path, Some(body)).await
}

async fn engine_delete_json(state: &State<'_, AppState>, path: &str) -> Result<Value, AppError> {
    if let Some(client) = state.sidecar.client().await {
        match client.delete_json(path).await {
            Ok(value) => return Ok(value),
            Err(error) => {
                tracing::warn!(
                    path,
                    error = %error,
                    "Managed report delete failed; trying external development engine"
                );
            }
        }
    }

    external_request(reqwest::Method::DELETE, path, None).await
}

async fn external_request(
    method: reqwest::Method,
    path: &str,
    body: Option<&Value>,
) -> Result<Value, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
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
            "Report engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
        ))
    })?;

    let status = response.status();

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();

        return Err(AppError::EngineUnavailable(format!(
            "Report engine request failed with status {status}: {body}"
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

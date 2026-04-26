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
    export_report(&state, run_id, "json").await
}

#[tauri::command]
pub async fn export_report_html(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    export_report(&state, run_id, "html").await
}

#[tauri::command]
pub async fn export_evidence_map(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    export_report(&state, run_id, "evidence_map").await
}

#[tauri::command]
pub async fn export_audit_receipt(
    state: State<'_, AppState>,
    run_id: String,
) -> Result<Value, AppError> {
    export_report(&state, run_id, "audit_receipt").await
}

async fn export_report(
    state: &State<'_, AppState>,
    run_id: String,
    format: &str,
) -> Result<Value, AppError> {
    let path = format!("/reports/{run_id}/export");
    let body = json!({ "format": format });

    engine_post_json(state, &path, &body).await
}

async fn engine_get_json(state: &State<'_, AppState>, path: &str) -> Result<Value, AppError> {
    if let Some(client) = state.sidecar.client().await {
        match client.get_json(path).await {
            Ok(value) => return Ok(value),
            Err(error) => {
                tracing::warn!(
                    path,
                    error = %error,
                    "Managed engine request failed; trying external development engine"
                );
            }
        }
    }

    external_get_json(path).await
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
                    "Managed engine request failed; trying external development engine"
                );
            }
        }
    }

    external_post_json(path, body).await
}

async fn external_get_json(path: &str) -> Result<Value, AppError> {
    let client = external_client()?;
    let response = client
        .get(external_url(path))
        .header("x-veriframe-token", DEFAULT_DEV_TOKEN)
        .send()
        .await
        .map_err(|error| {
            AppError::EngineUnavailable(format!(
                "Reports engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
            ))
        })?;

    parse_external_response(response).await
}

async fn external_post_json(path: &str, body: &Value) -> Result<Value, AppError> {
    let client = external_client()?;
    let response = client
        .post(external_url(path))
        .header("x-veriframe-token", DEFAULT_DEV_TOKEN)
        .json(body)
        .send()
        .await
        .map_err(|error| {
            AppError::EngineUnavailable(format!(
                "Reports engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
            ))
        })?;

    parse_external_response(response).await
}

fn external_client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|error| AppError::EngineUnavailable(error.to_string()))
}

fn external_url(path: &str) -> String {
    format!(
        "http://127.0.0.1:{}/{}",
        DEFAULT_ENGINE_PORT,
        path.trim_start_matches('/')
    )
}

async fn parse_external_response(response: reqwest::Response) -> Result<Value, AppError> {
    let status = response.status();

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();

        return Err(AppError::EngineUnavailable(format!(
            "Reports engine request failed with status {status}: {body}"
        )));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| AppError::EngineUnavailable(error.to_string()))
}

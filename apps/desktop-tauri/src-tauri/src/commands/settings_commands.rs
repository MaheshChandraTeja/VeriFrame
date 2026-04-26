use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;

use crate::errors::AppError;
use crate::state::AppState;

const DEFAULT_ENGINE_PORT: u16 = 32187;
const DEFAULT_DEV_TOKEN: &str = "dev-token";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsUpdateRequest {
    pub values: Value,
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<Value, AppError> {
    engine_get_json(&state, "/settings").await
}

#[tauri::command]
pub async fn update_settings(
    state: State<'_, AppState>,
    request: SettingsUpdateRequest,
) -> Result<Value, AppError> {
    engine_put_json(
        &state,
        "/settings",
        &json!({
            "values": request.values
        }),
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
                    "Managed settings request failed; trying external development engine"
                );
            }
        }
    }

    external_get_json(path).await
}

async fn engine_put_json(
    state: &State<'_, AppState>,
    path: &str,
    body: &Value,
) -> Result<Value, AppError> {
    if let Some(client) = state.sidecar.client().await {
        match client.put_json(path, body).await {
            Ok(value) => return Ok(value),
            Err(error) => {
                tracing::warn!(
                    path,
                    error = %error,
                    "Managed settings update failed; trying external development engine"
                );
            }
        }
    }

    external_put_json(path, body).await
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
                "Settings engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
            ))
        })?;

    parse_external_response(response).await
}

async fn external_put_json(path: &str, body: &Value) -> Result<Value, AppError> {
    let client = external_client()?;
    let response = client
        .put(external_url(path))
        .header("x-veriframe-token", DEFAULT_DEV_TOKEN)
        .json(body)
        .send()
        .await
        .map_err(|error| {
            AppError::EngineUnavailable(format!(
                "Settings engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
            ))
        })?;

    parse_external_response(response).await
}

fn external_client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(8))
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
            "Settings engine request failed with status {status}: {body}"
        )));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| AppError::EngineUnavailable(error.to_string()))
}

pub fn normalize_setting_key(key: &str) -> String {
    key.trim().replace("__", ".").replace(' ', "")
}

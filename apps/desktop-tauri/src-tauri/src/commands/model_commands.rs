use serde::Deserialize;
use serde_json::{json, Value};
use tauri::State;

use crate::errors::AppError;
use crate::state::AppState;

const DEFAULT_ENGINE_PORT: u16 = 32187;
const DEFAULT_DEV_TOKEN: &str = "dev-token";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelOperationRequest {
    pub model_id: String,
    pub warmup: Option<bool>,
}

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Value, AppError> {
    engine_get_json(&state, "/models").await
}

#[tauri::command]
pub async fn load_model(
    state: State<'_, AppState>,
    request: ModelOperationRequest,
) -> Result<Value, AppError> {
    engine_post_json(
        &state,
        "/models/load",
        &json!({
            "modelId": request.model_id,
            "warmup": request.warmup.unwrap_or(false)
        }),
    )
    .await
}

#[tauri::command]
pub async fn unload_model(
    state: State<'_, AppState>,
    request: ModelOperationRequest,
) -> Result<Value, AppError> {
    engine_post_json(
        &state,
        "/models/unload",
        &json!({
            "modelId": request.model_id,
            "warmup": request.warmup.unwrap_or(false)
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
                    "Managed model request failed; trying external development engine"
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
                    "Managed model request failed; trying external development engine"
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
                "Model engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
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
                "Model engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}: {error}"
            ))
        })?;

    parse_external_response(response).await
}

fn external_client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
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
            "Model engine request failed with status {status}: {body}"
        )));
    }

    response
        .json::<Value>()
        .await
        .map_err(|error| AppError::EngineUnavailable(error.to_string()))
}

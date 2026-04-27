use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

use crate::errors::AppError;
use crate::security::path_guard::validate_existing_image_file;
use crate::state::{AnalysisRunRecord, AppState};

const DEFAULT_ENGINE_PORT: u16 = 32187;
const DEFAULT_DEV_TOKEN: &str = "dev-token";

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
    if let Some(client) = state.sidecar.client().await {
        match client.post_json("/analysis", &request).await {
            Ok(value) => return Ok(value),
            Err(error) => {
                tracing::warn!(
                    error = %error,
                    "Managed analysis engine request failed; trying external local engine"
                );
            }
        }
    }

    external_json_request(reqwest::Method::POST, "/analysis", Some(&request)).await
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
    if let Some(client) = state.sidecar.client().await {
        match client.get_json(&format!("/analysis/{run_id}")).await {
            Ok(value) => return Ok(value),
            Err(error) => {
                tracing::warn!(
                    run_id,
                    error = %error,
                    "Managed analysis result load failed; trying external local engine"
                );
            }
        }
    }

    match external_json_request(
        reqwest::Method::GET,
        &format!("/analysis/{run_id}"),
        None,
    )
    .await
    {
        Ok(value) => Ok(value),
        Err(engine_error) => {
            let runs = state.analysis_runs.lock().await;
            let run = runs.get(&run_id).ok_or(engine_error)?;
            serde_json::to_value(run).map_err(|error| AppError::Internal(error.to_string()))
        }
    }
}

async fn external_json_request(
    method: reqwest::Method,
    path: &str,
    body: Option<&Value>,
) -> Result<Value, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
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
            "Local analysis engine is not reachable at 127.0.0.1:{DEFAULT_ENGINE_PORT}. Start VeriFrame Engine and try again. Details: {error}"
        ))
    })?;

    let status = response.status();

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();

        return Err(AppError::EngineUnavailable(format!(
            "Local analysis engine request failed with status {status}: {body}"
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

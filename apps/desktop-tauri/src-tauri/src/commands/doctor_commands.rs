use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use serde_json::{json, Value};
use tauri::State;

use crate::errors::AppError;
use crate::state::AppState;

const DEFAULT_LOG_TAIL: usize = 200;
const MAX_LOG_TAIL: usize = 1000;
const DEFAULT_ENGINE_PORT: u16 = 32187;

#[tauri::command]
pub async fn check_engine(state: State<'_, AppState>) -> Result<Value, AppError> {
    if let Some(value) = try_engine_json(&state, "/doctor/check-engine").await {
        return Ok(value);
    }

    Ok(local_engine_check(&state).await)
}

#[tauri::command]
pub async fn check_database(state: State<'_, AppState>) -> Result<Value, AppError> {
    if let Some(value) = try_engine_json(&state, "/doctor/check-database").await {
        return Ok(value);
    }

    Ok(local_database_check(&state))
}

#[tauri::command]
pub async fn check_model_paths(state: State<'_, AppState>) -> Result<Value, AppError> {
    if let Some(value) = try_engine_json(&state, "/doctor/check-model-paths").await {
        return Ok(value);
    }

    Ok(local_model_paths_check(&state))
}

#[tauri::command]
pub async fn check_storage_permissions(state: State<'_, AppState>) -> Result<Value, AppError> {
    if let Some(value) = try_engine_json(&state, "/doctor/check-storage-permissions").await {
        return Ok(value);
    }

    Ok(local_storage_permissions_check(&state))
}

#[tauri::command]
pub async fn collect_system_info(state: State<'_, AppState>) -> Result<Value, AppError> {
    if let Some(value) = try_engine_json(&state, "/doctor/system-info").await {
        return Ok(value);
    }

    Ok(local_system_info(&state).await)
}

#[tauri::command]
pub async fn collect_doctor_checks(state: State<'_, AppState>) -> Result<Value, AppError> {
    if let Some(value) = try_engine_json(&state, "/doctor/checks").await {
        return Ok(value);
    }

    Ok(json!({
        "checks": [
            local_desktop_shell_check(&state),
            local_engine_check(&state).await,
            local_database_check(&state),
            local_model_paths_check(&state),
            local_storage_permissions_check(&state),
            local_logs_check(&state).await
        ]
    }))
}

#[tauri::command]
pub async fn get_engine_log_tail(state: State<'_, AppState>) -> Result<Value, AppError> {
    if let Some(value) = try_engine_json(&state, "/doctor/logs").await {
        return Ok(value);
    }

    Ok(local_log_tail(&state, DEFAULT_LOG_TAIL).await)
}

async fn try_engine_json(state: &State<'_, AppState>, path: &str) -> Option<Value> {
    let Some(client) = state.sidecar.client().await else {
        // Important: in dev, the user may run `pnpm dev:engine` manually.
        // Tauri did not spawn it, but it is still a valid local engine.
        return try_external_engine_json(DEFAULT_ENGINE_PORT, path).await;
    };

    match client.get_json(path).await {
        Ok(value) => Some(value),
        Err(_) => try_external_engine_json(DEFAULT_ENGINE_PORT, path).await,
    }
}

async fn try_external_engine_json(port: u16, path: &str) -> Option<Value> {
    let url = format!("http://127.0.0.1:{port}{path}");
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(900))
        .build()
        .ok()?;

    let request = client
        .get(url)
        .header("x-veriframe-token", "dev-token");

    let response = request.send().await.ok()?;

    if !response.status().is_success() {
        return None;
    }

    response.json::<Value>().await.ok()
}

async fn external_engine_health(port: u16) -> Option<Value> {
    try_external_engine_json(port, "/health").await
}

fn local_desktop_shell_check(state: &State<'_, AppState>) -> Value {
    let paths = &state.paths;
    json!({
        "checkId": "desktop.shell",
        "title": "Desktop shell",
        "status": "pass",
        "message": "The desktop shell is running and local app folders are available.",
        "details": {
            "appDataDir": path_to_string(paths.app_data_dir()),
            "reportsDir": path_to_string(&paths.reports_dir()),
            "logsDir": path_to_string(&paths.logs_dir()),
            "modelsDir": path_to_string(&paths.models_dir())
        }
    })
}

async fn local_engine_check(state: &State<'_, AppState>) -> Value {
    let status = state.sidecar.status().await;

    if status.running {
        return json!({
            "checkId": "engine.sidecar",
            "title": "Python engine",
            "status": "pass",
            "message": "The Python engine is running as a desktop-managed sidecar.",
            "details": {
                "mode": "desktop-managed",
                "running": true,
                "port": status.port,
                "pid": status.pid,
                "startedAt": status.started_at,
                "tokenIssued": status.token_issued,
                "logsPath": status.logs_path
            }
        });
    }

    if let Some(health) = external_engine_health(DEFAULT_ENGINE_PORT).await {
        return json!({
            "checkId": "engine.external",
            "title": "Python engine",
            "status": "pass",
            "message": "A local Python engine is already running on 127.0.0.1:32187. It was started outside the desktop shell, which is fine for development QA.",
            "details": {
                "mode": "external-dev-process",
                "running": true,
                "port": DEFAULT_ENGINE_PORT,
                "pid": null,
                "health": health,
                "logsPath": status.logs_path
            }
        });
    }

    json!({
        "checkId": "engine.sidecar",
        "title": "Python engine",
        "status": "warn",
        "message": "The Python engine is not running. Start it from the top bar or run an action that starts the sidecar.",
        "details": {
            "mode": "not-running",
            "running": false,
            "port": DEFAULT_ENGINE_PORT,
            "pid": null,
            "startedAt": null,
            "tokenIssued": false,
            "logsPath": status.logs_path
        }
    })
}

fn local_database_check(state: &State<'_, AppState>) -> Value {
    let database_path = state.paths.database_path();
    let parent = database_path.parent().map(Path::to_path_buf);

    let parent_exists = parent.as_ref().is_some_and(|path| path.exists());
    let database_exists = database_path.exists();

    let status = if parent_exists { "pass" } else { "warn" };
    let message = if database_exists {
        "The desktop database path exists. Engine migrations are checked once the Python engine is running."
    } else if parent_exists {
        "The database file has not been created yet. It will appear after the engine initializes storage."
    } else {
        "The database directory does not exist yet."
    };

    json!({
        "checkId": "database.path",
        "title": "Database path",
        "status": status,
        "message": message,
        "details": {
            "databasePath": path_to_string(&database_path),
            "databaseExists": database_exists,
            "parentExists": parent_exists
        }
    })
}

fn local_model_paths_check(state: &State<'_, AppState>) -> Value {
    let models_dir = state.paths.models_dir();
    let exists = models_dir.exists();

    json!({
        "checkId": "models.directory",
        "title": "Model directory",
        "status": if exists { "pass" } else { "warn" },
        "message": if exists {
            "The local model directory is available. Model registry details are checked by the Python engine."
        } else {
            "The local model directory is missing. The desktop shell can recreate it, but model loading may need setup."
        },
        "details": {
            "modelsDir": path_to_string(&models_dir),
            "exists": exists
        }
    })
}

fn local_storage_permissions_check(state: &State<'_, AppState>) -> Value {
    let paths = vec![
        ("appDataDir", state.paths.app_data_dir().to_path_buf()),
        ("reportsDir", state.paths.reports_dir()),
        ("logsDir", state.paths.logs_dir()),
        ("modelsDir", state.paths.models_dir()),
        ("tempDir", state.paths.temp_dir()),
    ];

    let mut checked = Vec::new();
    let mut failures = Vec::new();

    for (label, path) in paths {
        match check_writable(&path) {
            Ok(()) => checked.push(json!({
                "label": label,
                "path": path_to_string(&path),
                "writable": true
            })),
            Err(error) => {
                failures.push(json!({
                    "label": label,
                    "path": path_to_string(&path),
                    "error": error
                }));
            }
        }
    }

    json!({
        "checkId": "storage.permissions",
        "title": "Storage permissions",
        "status": if failures.is_empty() { "pass" } else { "fail" },
        "message": if failures.is_empty() {
            "The desktop app can write to local storage, reports, logs, models, and temp folders."
        } else {
            "One or more local app folders are not writable."
        },
        "details": {
            "checked": checked,
            "failures": failures
        }
    })
}

async fn local_logs_check(state: &State<'_, AppState>) -> Value {
    let log_tail = local_log_tail(state, 20).await;
    let line_count = log_tail
        .get("lines")
        .and_then(Value::as_array)
        .map_or(0, Vec::len);
    let path = log_tail
        .get("path")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();

    json!({
        "checkId": "logs.local",
        "title": "Local logs",
        "status": "pass",
        "message": if line_count > 0 {
            "Recent desktop or sidecar log lines are available."
        } else {
            "No recent log lines were found yet. This is normal before the engine writes output."
        },
        "details": {
            "lineCount": line_count,
            "path": path
        }
    })
}

async fn local_system_info(state: &State<'_, AppState>) -> Value {
    let engine_status = state.sidecar.status().await;
    let external_engine = external_engine_health(DEFAULT_ENGINE_PORT).await;

    json!({
        "runtime": "Tauri desktop shell",
        "os": std::env::consts::OS,
        "architecture": std::env::consts::ARCH,
        "processId": std::process::id(),
        "appDataDir": path_to_string(state.paths.app_data_dir()),
        "reportsDir": path_to_string(&state.paths.reports_dir()),
        "logsDir": path_to_string(&state.paths.logs_dir()),
        "modelsDir": path_to_string(&state.paths.models_dir()),
        "databasePath": path_to_string(&state.paths.database_path()),
        "engine": {
            "managedByDesktop": engine_status.running,
            "externalDevEngineDetected": external_engine.is_some(),
            "port": DEFAULT_ENGINE_PORT,
            "pid": engine_status.pid,
            "startedAt": engine_status.started_at,
            "tokenIssued": engine_status.token_issued,
            "health": external_engine
        }
    })
}

async fn local_log_tail(state: &State<'_, AppState>, limit: usize) -> Value {
    let safe_limit = limit.clamp(1, MAX_LOG_TAIL);
    let logs_dir = state.paths.logs_dir();
    let latest_file = latest_log_file(&logs_dir);

    let mut lines = Vec::new();

    if let Some(path) = latest_file.as_ref() {
        if let Ok(file_lines) = read_tail_lines(path, safe_limit) {
            lines.extend(file_lines);
        }
    }

    let remaining = safe_limit.saturating_sub(lines.len());
    if remaining > 0 {
        let sidecar_lines = state.sidecar.logs(Some(remaining)).await;
        lines.extend(sidecar_lines.into_iter().map(|line| sanitize_log_line(&line)));
    }

    let message = if lines.is_empty() {
        "No desktop or sidecar log lines are available yet."
    } else {
        "Showing recent desktop and sidecar log lines."
    };

    json!({
        "lines": lines,
        "path": latest_file
            .map(|path| path_to_string(&path))
            .unwrap_or_else(|| path_to_string(&logs_dir)),
        "message": message
    })
}

fn latest_log_file(logs_dir: &Path) -> Option<PathBuf> {
    let mut files = fs::read_dir(logs_dir)
        .ok()?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|path| path.is_file())
        .collect::<Vec<_>>();

    files.sort_by(|left, right| modified_time(left).cmp(&modified_time(right)));
    files.pop()
}

fn modified_time(path: &Path) -> SystemTime {
    path.metadata()
        .and_then(|metadata| metadata.modified())
        .unwrap_or(SystemTime::UNIX_EPOCH)
}

fn read_tail_lines(path: &Path, limit: usize) -> Result<Vec<String>, String> {
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let lines = text
        .lines()
        .rev()
        .take(limit)
        .map(sanitize_log_line)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>();

    Ok(lines)
}

fn check_writable(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| error.to_string())?;

    let probe = path.join(".veriframe-doctor-write-probe");
    fs::write(&probe, b"ok").map_err(|error| error.to_string())?;

    if let Err(error) = fs::remove_file(&probe) {
        return Err(error.to_string());
    }

    Ok(())
}

fn sanitize_log_line(line: &str) -> String {
    line.replace("dev-token", "[redacted-token]")
        .replace("x-veriframe-token", "[redacted-header]")
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

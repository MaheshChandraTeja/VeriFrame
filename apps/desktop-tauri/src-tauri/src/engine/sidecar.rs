use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Arc;

use chrono::Utc;
use serde::Serialize;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

use crate::app_paths::AppPaths;
use crate::errors::AppError;
use crate::security::token::SessionToken;

const DEFAULT_ENGINE_PORT: u16 = 32187;
const LOG_LIMIT: usize = 500;
const PACKAGED_SIDECAR_NAMES: &[&str] = &[
    "veriframe-engine-x86_64-pc-windows-msvc.exe",
    "veriframe-engine.exe",
    "veriframe-engine",
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub running: bool,
    pub port: u16,
    pub pid: Option<u32>,
    pub started_at: Option<String>,
    pub token_issued: bool,
    pub message: String,
    pub logs_path: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SidecarCommandSpec {
    pub program: String,
    pub args: Vec<String>,
    pub working_dir: Option<PathBuf>,
    pub python_path: Option<PathBuf>,
}

#[derive(Debug)]
struct SidecarInner {
    child: Option<Child>,
    port: u16,
    token: Option<SessionToken>,
    started_at: Option<String>,
    logs: VecDeque<String>,
}

#[derive(Debug, Clone)]
pub struct SidecarManager {
    paths: AppPaths,
    inner: Arc<Mutex<SidecarInner>>,
}

impl SidecarManager {
    pub fn new(paths: AppPaths) -> Self {
        Self {
            paths,
            inner: Arc::new(Mutex::new(SidecarInner {
                child: None,
                port: DEFAULT_ENGINE_PORT,
                token: None,
                started_at: None,
                logs: VecDeque::new(),
            })),
        }
    }

    pub async fn status(&self) -> EngineStatus {
        let mut inner = self.inner.lock().await;
        let running = is_child_running(&mut inner.child);
        let pid = inner.child.as_ref().and_then(Child::id);

        if !running {
            inner.child = None;
        }

        EngineStatus {
            running,
            port: inner.port,
            pid,
            started_at: inner.started_at.clone(),
            token_issued: inner.token.is_some(),
            message: if running {
                "Python engine sidecar is running.".into()
            } else {
                "Python engine sidecar is stopped.".into()
            },
            logs_path: self.paths.logs_dir().to_string_lossy().to_string(),
        }
    }

    pub async fn start(&self) -> Result<EngineStatus, AppError> {
        let mut inner = self.inner.lock().await;

        if is_child_running(&mut inner.child) {
            drop(inner);
            return Ok(self.status().await);
        }

        let token = SessionToken::generate();
        let spec = build_sidecar_command_spec(inner.port, token.expose_for_local_sidecar());

        tracing::info!(
            program = %spec.program,
            args = ?spec.args,
            working_dir = ?spec.working_dir,
            python_path = ?spec.python_path,
            "Starting VeriFrame Python sidecar"
        );

        let mut command = Command::new(&spec.program);
        command.args(&spec.args);
        command.stdout(Stdio::piped());
        command.stderr(Stdio::piped());

        if let Some(working_dir) = &spec.working_dir {
            command.current_dir(working_dir);
        }

        if let Some(python_path) = &spec.python_path {
            command.env("PYTHONPATH", python_path);
        }

        let mut child = command.spawn().map_err(|error| {
            AppError::EngineUnavailable(format!(
                "Unable to start the local Python engine using '{}'. {error}",
                spec.program
            ))
        })?;

        if let Some(stdout) = child.stdout.take() {
            spawn_log_reader("stdout", stdout, Arc::clone(&self.inner));
        }

        if let Some(stderr) = child.stderr.take() {
            spawn_log_reader("stderr", stderr, Arc::clone(&self.inner));
        }

        inner.started_at = Some(Utc::now().to_rfc3339());
        inner.token = Some(token);
        inner.child = Some(child);

        drop(inner);

        Ok(self.status().await)
    }

    pub async fn stop(&self) -> Result<EngineStatus, AppError> {
        let mut inner = self.inner.lock().await;

        if let Some(mut child) = inner.child.take() {
            tracing::info!("Stopping VeriFrame Python sidecar");

            if let Err(error) = child.kill().await {
                tracing::warn!(%error, "Unable to kill sidecar process cleanly");
            }

            let _ = child.wait().await;
        }

        inner.started_at = None;
        inner.token = None;

        drop(inner);

        Ok(self.status().await)
    }

    pub async fn restart(&self) -> Result<EngineStatus, AppError> {
        let _ = self.stop().await?;
        self.start().await
    }

    pub async fn logs(&self, tail: Option<usize>) -> Vec<String> {
        let inner = self.inner.lock().await;
        let limit = tail.unwrap_or(LOG_LIMIT).min(LOG_LIMIT);

        inner
            .logs
            .iter()
            .rev()
            .take(limit)
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    }

    pub async fn client(&self) -> Option<crate::engine::client::EngineClient> {
        let inner = self.inner.lock().await;

        inner.token.as_ref().map(|token| {
            crate::engine::client::EngineClient::new(
                inner.port,
                token.expose_for_local_sidecar().to_string(),
            )
        })
    }
}

pub fn build_sidecar_command_spec(port: u16, token: &str) -> SidecarCommandSpec {
    if let Ok(custom_command) = std::env::var("VERIFRAME_ENGINE_COMMAND") {
        let mut parts = custom_command
            .split_whitespace()
            .map(str::to_string)
            .collect::<Vec<_>>();

        if let Some(program) = parts.first().cloned() {
            parts.remove(0);
            parts.extend(default_engine_args(port, token));

            return SidecarCommandSpec {
                program,
                args: parts,
                working_dir: None,
                python_path: discover_dev_python_path(),
            };
        }
    }

    build_default_sidecar_command_spec(port, token)
}

pub fn build_default_sidecar_command_spec(port: u16, token: &str) -> SidecarCommandSpec {
    if let Some((program, working_dir)) = discover_packaged_sidecar() {
        return SidecarCommandSpec {
            program: program.to_string_lossy().to_string(),
            args: packaged_engine_args(port, token),
            working_dir,
            python_path: None,
        };
    }

    SidecarCommandSpec {
        program: "conda".to_string(),
        args: vec![
            "run".to_string(),
            "--no-capture-output".to_string(),
            "-n".to_string(),
            "veriframe".to_string(),
            "python".to_string(),
            "-m".to_string(),
            "veriframe_core.cli".to_string(),
            "serve".to_string(),
            "--host".to_string(),
            "127.0.0.1".to_string(),
            "--port".to_string(),
            port.to_string(),
            "--token".to_string(),
            token.to_string(),
        ],
        working_dir: None,
        python_path: discover_dev_python_path(),
    }
}

fn packaged_engine_args(port: u16, token: &str) -> Vec<String> {
    let mut args = vec!["serve".to_string()];
    args.extend(default_engine_args(port, token));
    args
}

fn default_engine_args(port: u16, token: &str) -> Vec<String> {
    vec![
        "--host".to_string(),
        "127.0.0.1".to_string(),
        "--port".to_string(),
        port.to_string(),
        "--token".to_string(),
        token.to_string(),
    ]
}

fn discover_packaged_sidecar() -> Option<(PathBuf, Option<PathBuf>)> {
    if let Ok(explicit) = std::env::var("VERIFRAME_ENGINE_EXE") {
        let path = PathBuf::from(explicit);
        if is_valid_sidecar_candidate(&path) {
            let working_dir = path.parent().map(Path::to_path_buf);
            return Some((path, working_dir));
        }
    }

    let mut candidates: Vec<(PathBuf, Option<PathBuf>)> = Vec::new();

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            push_sidecar_candidates(&mut candidates, exe_dir, exe_dir);
            push_sidecar_candidates(&mut candidates, &exe_dir.join("binaries"), exe_dir);
            push_sidecar_candidates(&mut candidates, &exe_dir.join("resources").join("binaries"), exe_dir);
            push_sidecar_candidates(&mut candidates, &exe_dir.join(".."), exe_dir);
            push_sidecar_candidates(
                &mut candidates,
                &exe_dir.join("..").join("resources").join("binaries"),
                exe_dir,
            );
        }
    }

    if let Ok(current_dir) = std::env::current_dir() {
        push_sidecar_candidates(&mut candidates, &current_dir, &current_dir);
        push_sidecar_candidates(&mut candidates, &current_dir.join("binaries"), &current_dir);
        push_sidecar_candidates(
            &mut candidates,
            &current_dir.join("resources").join("binaries"),
            &current_dir,
        );
    }

    candidates.into_iter().find(|(candidate, _)| {
        is_valid_sidecar_candidate(candidate)
    })
}

fn push_sidecar_candidates(candidates: &mut Vec<(PathBuf, Option<PathBuf>)>, dir: &Path, working_dir: &Path) {
    for name in PACKAGED_SIDECAR_NAMES {
        candidates.push((dir.join(name), Some(working_dir.to_path_buf())));
    }
}

fn is_valid_sidecar_candidate(path: &Path) -> bool {
    match path.metadata() {
        Ok(metadata) => metadata.is_file() && metadata.len() > 0,
        Err(_) => false,
    }
}

fn discover_dev_python_path() -> Option<PathBuf> {
    let mut roots: Vec<PathBuf> = Vec::new();

    if let Ok(explicit) = std::env::var("VERIFRAME_REPO_ROOT") {
        roots.push(PathBuf::from(explicit));
    }

    if let Ok(cwd) = std::env::current_dir() {
        roots.push(cwd.clone());

        for ancestor in cwd.ancestors() {
            roots.push(ancestor.to_path_buf());
        }
    }

    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        let manifest = PathBuf::from(manifest_dir);
        roots.push(manifest.clone());

        for ancestor in manifest.ancestors() {
            roots.push(ancestor.to_path_buf());
        }
    }

    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            roots.push(exe_dir.to_path_buf());

            for ancestor in exe_dir.ancestors() {
                roots.push(ancestor.to_path_buf());
            }
        }
    }

    roots
        .into_iter()
        .map(|root| root.join("engine").join("veriframe_core"))
        .find(|candidate| candidate.join("veriframe_core").join("__init__.py").exists())
}

fn is_child_running(child: &mut Option<Child>) -> bool {
    match child {
        Some(child) => match child.try_wait() {
            Ok(Some(_exit_status)) => false,
            Ok(None) => true,
            Err(error) => {
                tracing::warn!(%error, "Unable to check sidecar process status");
                false
            }
        },
        None => false,
    }
}

fn spawn_log_reader<R>(stream_name: &'static str, reader: R, inner: Arc<Mutex<SidecarInner>>)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(reader).lines();

        loop {
            match lines.next_line().await {
                Ok(Some(line)) => {
                    let mut inner = inner.lock().await;

                    if inner.logs.len() >= LOG_LIMIT {
                        inner.logs.pop_front();
                    }

                    inner.logs.push_back(format!("[{stream_name}] {line}"));
                }
                Ok(None) => break,
                Err(error) => {
                    tracing::warn!(%error, "Error while reading sidecar {stream_name}");
                    break;
                }
            }
        }
    });
}

use std::path::Path;
use std::sync::OnceLock;

use crate::errors::AppError;

static LOG_GUARD: OnceLock<tracing_appender::non_blocking::WorkerGuard> = OnceLock::new();

pub fn init_logging(log_dir: &Path) -> Result<(), AppError> {
    std::fs::create_dir_all(log_dir)?;

    let file_appender = tracing_appender::rolling::daily(log_dir, "veriframe-desktop.log");
    let (non_blocking_writer, guard) = tracing_appender::non_blocking(file_appender);

    let subscriber = tracing_subscriber::fmt()
        .with_writer(non_blocking_writer)
        .with_target(true)
        .with_thread_ids(true)
        .with_level(true)
        .finish();

    let _ = tracing::subscriber::set_global_default(subscriber);
    let _ = LOG_GUARD.set(guard);

    Ok(())
}

pub mod app_paths;
pub mod commands;
pub mod engine;
pub mod errors;
pub mod logging;
pub mod security;
pub mod state;

use commands::{
    analysis_commands::{
        cancel_analysis, create_analysis_run, get_analysis_progress, load_analysis_result,
        submit_analysis_request,
    },
    doctor_commands::{
        check_database, check_engine, check_model_paths, check_storage_permissions,
        collect_doctor_checks, collect_system_info, get_engine_log_tail,
    },
    engine_commands::{
        engine_status, get_engine_logs, restart_engine, start_engine, stop_engine,
    },
    file_commands::{
        open_report_location, reveal_in_file_manager, select_folder, select_images,
        validate_file_path,
    },
    model_commands::{list_models, load_model, unload_model},
    report_commands::{
        export_audit_receipt, export_evidence_map, export_report_html, export_report_json,
        list_reports,
    },
    review_commands::{
        export_review_dataset, get_review_session, save_finding_review, save_region_correction,
    },
    settings_commands::{get_settings, update_settings},
};
use state::AppState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let paths = app_paths::AppPaths::new()?;
            paths.ensure_all()?;

            logging::init_logging(&paths.logs_dir())?;

            tracing::info!(
                app_data_dir = %paths.app_data_dir().display(),
                "VeriFrame desktop shell starting"
            );

            app.manage(AppState::new(paths));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            engine_status,
            start_engine,
            stop_engine,
            restart_engine,
            get_engine_logs,
            select_images,
            select_folder,
            validate_file_path,
            open_report_location,
            reveal_in_file_manager,
            create_analysis_run,
            submit_analysis_request,
            get_analysis_progress,
            cancel_analysis,
            load_analysis_result,
            list_models,
            load_model,
            unload_model,
            list_reports,
            export_report_json,
            export_report_html,
            export_evidence_map,
            export_audit_receipt,
            get_review_session,
            save_region_correction,
            save_finding_review,
            export_review_dataset,
            get_settings,
            update_settings,
            check_engine,
            check_database,
            check_model_paths,
            check_storage_permissions,
            collect_system_info,
            collect_doctor_checks,
            get_engine_log_tail
        ])
        .run(tauri::generate_context!())
        .expect("failed to run VeriFrame desktop shell");
}

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS analysis_runs (
    run_id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL,
    status TEXT NOT NULL,
    workflow TEXT NOT NULL,
    source_path TEXT NOT NULL,
    input_hash TEXT,
    result_hash TEXT,
    config_hash TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    result_json TEXT NOT NULL,
    warnings_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS images (
    image_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    exif_present INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS findings (
    finding_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence REAL NOT NULL,
    region_ids_json TEXT NOT NULL DEFAULT '[]',
    evidence_refs_json TEXT NOT NULL DEFAULT '[]',
    recommendation TEXT NOT NULL,
    finding_json TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regions (
    region_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    label TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence REAL NOT NULL,
    bbox_json TEXT NOT NULL,
    mask_json TEXT,
    source_model_id TEXT NOT NULL,
    rationale TEXT NOT NULL,
    review_status TEXT NOT NULL,
    region_json TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS model_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    model_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    task TEXT NOT NULL,
    framework TEXT NOT NULL,
    device TEXT NOT NULL,
    config_hash TEXT NOT NULL,
    checkpoint_hash TEXT,
    labels_json TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    entry_id TEXT PRIMARY KEY,
    run_id TEXT,
    level TEXT NOT NULL,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    context_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS report_artifacts (
    artifact_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    format TEXT NOT NULL,
    path TEXT NOT NULL,
    sha256 TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);

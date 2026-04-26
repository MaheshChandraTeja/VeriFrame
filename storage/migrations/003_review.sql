PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS region_corrections (
    correction_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    region_id TEXT,
    action TEXT NOT NULL,
    original_region_json TEXT,
    corrected_region_json TEXT NOT NULL,
    label_before TEXT,
    label_after TEXT,
    box_before_json TEXT,
    box_after_json TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS finding_reviews (
    review_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    finding_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    notes TEXT,
    reviewer TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_exports (
    export_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    dataset_path TEXT NOT NULL,
    annotation_path TEXT NOT NULL,
    image_path TEXT,
    correction_count INTEGER NOT NULL,
    finding_review_count INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES analysis_runs(run_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_region_corrections_run_id ON region_corrections(run_id);
CREATE INDEX IF NOT EXISTS idx_region_corrections_region_id ON region_corrections(region_id);
CREATE INDEX IF NOT EXISTS idx_finding_reviews_run_id ON finding_reviews(run_id);
CREATE INDEX IF NOT EXISTS idx_finding_reviews_finding_id ON finding_reviews(finding_id);
CREATE INDEX IF NOT EXISTS idx_finding_reviews_decision ON finding_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_review_exports_run_id ON review_exports(run_id);

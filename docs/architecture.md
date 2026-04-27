# Architecture

<p align="center">
  <strong>VeriFrame is a local-first visual evidence analysis system built around clear boundaries, deterministic contracts, and inspectable outputs.</strong>
</p>

<p align="center">
  <img alt="Frontend" src="https://img.shields.io/badge/Frontend-Angular-DD0031?style=for-the-badge&logo=angular">
  <img alt="Desktop" src="https://img.shields.io/badge/Desktop-Tauri-24C8DB?style=for-the-badge&logo=tauri">
  <img alt="Engine" src="https://img.shields.io/badge/Engine-Python-3776AB?style=for-the-badge&logo=python">
  <img alt="ML" src="https://img.shields.io/badge/ML-TorchVision-EE4C2C?style=for-the-badge&logo=pytorch">
  <img alt="Storage" src="https://img.shields.io/badge/Storage-SQLite-003B57?style=for-the-badge&logo=sqlite">
  <img alt="Privacy" src="https://img.shields.io/badge/Local--Only-No%20Cloud-0ea5e9?style=for-the-badge">
</p>

---

## 1. Overview

**VeriFrame** is a desktop-first, local-only visual evidence analysis application.

It imports images, validates and preprocesses them, runs local TorchVision-compatible analysis, generates evidence overlays and findings, stores deterministic audit records, and supports human review/correction workflows.

The project is intentionally split into independent layers:

- **Angular UI** for interaction and visualization
- **Tauri desktop shell** for native boundaries and secure IPC
- **Python engine** for image processing, ML inference, reporting, review, and storage
- **SQLite** for local persistent records
- **Shared contracts** for schema-safe communication between layers
- **Local files** for report artifacts, model configs, checkpoints, overlays, and datasets

The architecture is designed to avoid the classic “frontend calls everything, backend knows nothing, and the filesystem is somehow everyone’s problem” tragedy. Humanity has suffered enough.

---

## 2. Design Goals

VeriFrame is built around five architectural goals.

### 2.1 Local-first operation

All normal workflows run on the user's machine.

No cloud upload is required for:

- importing images
- validating files
- extracting metadata
- preprocessing images
- running analysis
- generating reports
- creating audit receipts
- reviewing findings
- exporting local datasets

### 2.2 Clear trust boundaries

Each layer has a job.

Angular renders the app and talks to Tauri.  
Tauri owns native access and calls the local engine.  
The Python engine owns ML, storage, reports, and review logic.  
SQLite stores local state.

Angular does **not** call Python directly. Angular does **not** rummage through the filesystem like a caffeinated raccoon. Tauri mediates native behavior.

### 2.3 Deterministic contracts

Data passed between layers should be shaped by explicit contracts.

The TypeScript contracts in `packages/contracts` and Python Pydantic models in `engine/veriframe_core/veriframe_core/contracts` should stay aligned.

Every result should be understandable, serializable, and testable.

### 2.4 Human review over blind automation

VeriFrame does not pretend model output is holy scripture.

The user can inspect regions, update labels, adjust boxes, mark findings as valid/false positive/ignored/needs review, and export corrected datasets for future training.

### 2.5 Research-grade reproducibility

Every analysis run should preserve enough information to explain itself later:

- source image hash
- image metadata
- quality report
- model profile references
- findings
- detected regions
- report artifacts
- audit receipt
- config hash
- result hash
- artifact hashes

This is not legal notarization. It is local integrity and reproducibility. Less courtroom magic, more engineering.

---

## 3. High-Level System Diagram

```txt
┌─────────────────────────────────────────────────────────────────────┐
│                            VeriFrame App                            │
│                                                                     │
│  ┌──────────────────────────────┐                                   │
│  │ Angular UI                    │                                   │
│  │ - Dashboard                   │                                   │
│  │ - Import                      │                                   │
│  │ - Analysis                    │                                   │
│  │ - Reports                     │                                   │
│  │ - Models                      │                                   │
│  │ - Review                      │                                   │
│  │ - Settings                    │                                   │
│  │ - Doctor                      │                                   │
│  └───────────────┬──────────────┘                                   │
│                  │ Tauri invoke/event bridge                         │
│                  ▼                                                   │
│  ┌──────────────────────────────┐                                   │
│  │ Tauri Desktop Shell           │                                   │
│  │ - Native window               │                                   │
│  │ - App paths                   │                                   │
│  │ - Secure commands             │                                   │
│  │ - Path guard                  │                                   │
│  │ - Sidecar lifecycle           │                                   │
│  │ - Engine bridge               │                                   │
│  └───────────────┬──────────────┘                                   │
│                  │ localhost-only token-authenticated calls           │
│                  ▼                                                   │
│  ┌──────────────────────────────┐                                   │
│  │ Python VeriFrame Engine       │                                   │
│  │ - FastAPI local API           │                                   │
│  │ - Import/preprocessing        │                                   │
│  │ - TorchVision inference       │                                   │
│  │ - Reports                     │                                   │
│  │ - Review/corrections          │                                   │
│  │ - Dataset export              │                                   │
│  │ - Doctor checks               │                                   │
│  └───────┬──────────────┬───────┘                                   │
│          │              │                                           │
│          ▼              ▼                                           │
│  ┌─────────────┐  ┌──────────────────────────────┐                  │
│  │ SQLite DB   │  │ Local Artifacts               │                  │
│  │ - runs      │  │ - reports                     │                  │
│  │ - images    │  │ - overlays                    │                  │
│  │ - regions   │  │ - evidence maps               │                  │
│  │ - findings  │  │ - region crops                │                  │
│  │ - reviews   │  │ - exported datasets           │                  │
│  │ - settings  │  │ - logs                        │                  │
│  └─────────────┘  └──────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Repository Structure

```txt
VeriFrame/
  apps/
    ui-angular/
      src/
        app/
          core/
          shared/
          features/
            dashboard/
            import/
            analysis/
            reports/
            models/
            review/
            settings/
            doctor/
    desktop-tauri/
      src-tauri/
        src/
          commands/
          engine/
          security/
          app_paths.rs
          errors.rs
          logging.rs
          lib.rs
          main.rs

  engine/
    veriframe_core/
      veriframe_core/
        api/
        audit/
        contracts/
        datasets/
        doctor/
        importing/
        inference/
        models/
        pipeline/
        preprocessing/
        reports/
        review/
        runtime/
        settings/
        storage/
        training/
      tests/

  packages/
    contracts/
      src/
      schemas/
    shared-fixtures/
      analysis/
      images/

  storage/
    migrations/

  models/
    configs/
    model_cards/

  datasets/
    schemas/
    annotation_guides/

  tools/
    benchmark/
    dev/
    export/
    annotate/

  docs/
    architecture.md
    security-and-privacy.md
    model-training.md
    packaging.md
    testing.md
    performance.md
```

---

## 5. Layer Responsibilities

## 5.1 Angular UI

Location:

```txt
apps/ui-angular/
```

The Angular app is responsible for:

- rendering all user-facing workflows
- managing UI state
- calling Tauri through typed frontend services
- displaying engine/model/report/review status
- importing image previews
- showing evidence overlays and findings
- presenting report exports
- providing review/correction controls
- displaying settings and diagnostics

The Angular app should not:

- call the Python engine directly in production flows
- access arbitrary local filesystem paths
- know implementation details of Python modules
- create backend contract shapes ad hoc
- introduce cloud or telemetry SDKs

### Major Angular feature areas

| Feature | Purpose |
|---|---|
| Dashboard | App status, recent runs, engine/model overview |
| Import | Image staging, validation preview, analysis submission |
| Analysis | Evidence viewer, regions, findings, quality report |
| Reports | Local run list, report exports, delete report |
| Models | Model registry, load/unload state, device info |
| Review | Human correction workflow, finding review, dataset export |
| Settings | Privacy, model, storage, threshold, device preferences |
| Doctor | Diagnostics, logs, system info, environment checks |

### Frontend service rule

Components should talk to services, not to Tauri directly.

Good:

```txt
Component → Feature Service → TauriService → Tauri command
```

Bad:

```txt
Component → invoke("random_native_command")
```

The second version grows tentacles. Avoid.

---

## 5.2 Tauri Desktop Shell

Location:

```txt
apps/desktop-tauri/src-tauri/
```

Tauri owns the native desktop boundary.

Responsibilities:

- create desktop window
- resolve app data directories
- validate selected paths
- manage sidecar state
- expose safe commands to Angular
- bridge requests to the Python engine
- control report locations and file reveals
- return frontend-safe errors
- protect native operations from random UI improvisation

### Command groups

| Command module | Purpose |
|---|---|
| `engine_commands.rs` | start/stop/status/logs for local engine |
| `file_commands.rs` | image/folder selection and safe file validation |
| `analysis_commands.rs` | create run, submit analysis, progress, results |
| `report_commands.rs` | list/export/delete reports |
| `model_commands.rs` | list/load/unload model profiles |
| `review_commands.rs` | review sessions, corrections, dataset export |
| `settings_commands.rs` | read/write settings |
| `doctor_commands.rs` | diagnostics and system checks |

### Engine bridge pattern

Tauri should prefer the managed sidecar when available, but development and QA can also use an externally running engine on:

```txt
127.0.0.1:32187
```

This fallback is useful during testing. Production packaging should use the managed sidecar path where practical.

---

## 5.3 Python Engine

Location:

```txt
engine/veriframe_core/
```

The Python engine owns the core processing logic.

Responsibilities:

- expose localhost-only FastAPI routes
- validate local session token
- load settings
- initialize directories
- import and validate images
- extract metadata
- compute quality signals
- run model inference
- build findings
- generate evidence maps and overlays
- persist runs and artifacts
- manage review corrections
- export review datasets
- provide diagnostics
- support CLI smoke testing and benchmark tools

### API route groups

| Route group | Purpose |
|---|---|
| `/health` | engine health |
| `/version` | engine + contract version |
| `/capabilities` | local-only and feature capability status |
| `/analysis` | submit/load/progress/cancel analysis runs |
| `/models` | list/load/unload model profiles |
| `/reports` | list/export/delete reports |
| `/review` | load review session, save corrections, export dataset |
| `/settings` | read/write settings |
| `/doctor` | diagnostics and logs |

---

## 5.4 SQLite Storage

Location:

```txt
storage/migrations/
engine/veriframe_core/veriframe_core/storage/
```

SQLite stores structured local state.

Core tables:

- `analysis_runs`
- `images`
- `findings`
- `regions`
- `model_runs`
- `audit_logs`
- `report_artifacts`
- `settings`
- `region_corrections`
- `finding_reviews`

Storage should be initialized through the database module and migrations, not through scattered handwritten SQL hidden inside feature code like little landmines.

### Recommended database settings

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

---

## 5.5 Local Artifacts

Generated artifacts live under the local app data directory.

Typical Windows layout:

```txt
C:\Users\<user>\AppData\Roaming\VeriFrame\
  veriframe.sqlite3
  models\
  reports\
    <run_id>\
      analysis-result.json
      evidence-overlay.png
      evidence-map.json
      region-crops\
      exports\
  temp\
  logs\
```

Artifacts include:

- analysis result JSON
- HTML reports
- JSON reports
- evidence overlays
- region crops
- evidence maps
- audit receipts
- exported datasets
- logs

---

## 6. Data Flow

## 6.1 Import and Analysis Flow

```txt
User selects image
       │
       ▼
Angular Import Page
       │
       ▼
Tauri file command validates selected path
       │
       ▼
Angular creates AnalysisRequest contract
       │
       ▼
Tauri submit_analysis_request
       │
       ▼
Python /analysis endpoint
       │
       ▼
AnalysisPipeline
       │
       ├── ImportStage
       ├── QualityStage
       ├── DetectionStage
       ├── SegmentationStage
       ├── EvidenceStage
       └── FindingsStage
       │
       ▼
SQLite + local report artifacts
       │
       ▼
AnalysisResult returned to UI
       │
       ▼
Analysis page displays viewer, regions, findings, quality
```

---

## 6.2 Report Flow

```txt
Completed AnalysisResult
       │
       ▼
ReportBuilder
       │
       ├── evidence map
       ├── overlay image
       ├── region crops
       ├── audit receipt
       └── HTML/JSON exports
       │
       ▼
Local reports directory
       │
       ▼
Reports page
       │
       ├── export HTML
       ├── export JSON
       ├── export evidence map
       ├── export audit receipt
       └── delete report
```

---

## 6.3 Review Flow

```txt
AnalysisResult with regions/findings
       │
       ▼
Review page
       │
       ├── select region
       ├── move/resize box
       ├── change label
       ├── mark finding decision
       └── save review
       │
       ▼
ReviewRepository
       │
       ├── region_corrections
       └── finding_reviews
       │
       ▼
DatasetExporter
       │
       ├── images/
       ├── annotations/
       └── manifest.json
```

---

## 7. Analysis Pipeline

Location:

```txt
engine/veriframe_core/veriframe_core/pipeline/
```

The analysis pipeline is the core processing path.

### Pipeline stages

| Stage | Responsibility |
|---|---|
| Import | Validate source, load image metadata, normalize input path |
| Quality | Compute blur, brightness, contrast, glare, resolution adequacy |
| Detection | Run detection model profiles and produce regions |
| Segmentation | Run segmentation models where available |
| Evidence | Generate overlays, crops, and evidence maps |
| Findings | Convert regions/quality/model signals into findings |

### Design rules

- Each stage should be independently testable.
- Each stage should update progress.
- Each stage should support cancellation.
- Failures should produce structured errors.
- A broken model should not crash the entire application without explanation.
- Heuristic fallbacks must be clearly labeled as heuristic.
- Production evidence scoring should use trained checkpoints, not fallback regions wearing a fake moustache.

---

## 8. Contract Model

Contracts are the backbone of the system.

### TypeScript contracts

Location:

```txt
packages/contracts/src/
```

Used by:

- Angular UI
- test fixtures
- schema validation
- frontend services

### Python contracts

Location:

```txt
engine/veriframe_core/veriframe_core/contracts/
```

Used by:

- FastAPI validation
- pipeline
- reports
- review
- storage
- CLI tests

### JSON schemas

Location:

```txt
packages/contracts/schemas/
```

Important schemas:

- `analysis-request.schema.json`
- `analysis-result.schema.json`
- `audit-receipt.schema.json`

### Contract rule

Any change to a contract must update:

- TypeScript type
- Python Pydantic model
- JSON schema
- fixtures
- tests
- documentation where relevant

Contract drift is how APIs become haunted.

---

## 9. Model Registry Architecture

Location:

```txt
engine/veriframe_core/veriframe_core/models/
models/configs/
models/model_cards/
```

The model registry defines which profiles are available and how they behave.

### Supported profile families

| Profile | Purpose |
|---|---|
| `receipt_region_detector` | receipt blocks, prices, QR/barcode regions |
| `product_package_detector` | packaging, labels, product regions |
| `damage_detector` | package damage/tamper evidence |
| `display_panel_detector` | treadmill/device display regions |
| `general_object_detector` | general visual object scaffold |

### Model profile fields

A model profile should describe:

- `modelId`
- `name`
- `version`
- `task`
- `labels`
- `configPath`
- `checkpointPath`
- `checkpointRequired`
- `preprocessing`
- `outputParser`
- `description`

### Model cache

The engine keeps loaded models in memory.

Important behavior:

- restarting the engine clears the model cache
- models must be loaded again after restart
- UI must not assume loaded state survives process restart
- model load state should be visible in Dashboard and Models pages

---

## 10. Inference Architecture

Location:

```txt
engine/veriframe_core/veriframe_core/inference/
```

Inference runners wrap model-specific logic.

| Module | Purpose |
|---|---|
| `base.py` | common inference runner interface |
| `detection.py` | object detection runner |
| `segmentation.py` | instance segmentation runner |
| `classification.py` | image classification runner |
| `batch_runner.py` | batch inference with progress/cancellation |
| `thresholding.py` | confidence threshold utilities |
| `nms.py` | non-maximum suppression helpers |

### Output conversion

Raw TorchVision outputs should be converted into VeriFrame contracts through output parsers.

Expected conversion:

```txt
TorchVision tensors
       │
       ▼
Output parser
       │
       ▼
DetectedRegion / SegmentationMask / Finding
       │
       ▼
AnalysisResult
```

Raw tensors should not leak into the UI or report layer.

---

## 11. Report Architecture

Location:

```txt
engine/veriframe_core/veriframe_core/reports/
```

Reports convert structured analysis results into readable and exportable artifacts.

### Report modules

| Module | Purpose |
|---|---|
| `report_builder.py` | builds complete report object |
| `json_exporter.py` | exports structured JSON |
| `html_exporter.py` | exports human-readable HTML |
| `asset_writer.py` | writes overlays, crops, evidence maps |
| `templates/` | report HTML/CSS templates |

### Report artifacts

Reports may include:

- `visual-report.html`
- `visual-report.json`
- `evidence-overlay.png`
- `evidence-map.json`
- `region-crops/*.jpg`
- `audit-receipt.json`

### Report deletion

Deleting a report should remove:

- database records for the run
- generated report directory
- in-memory cached result when applicable

It should not silently claim success when nothing was deleted. That would be very “enterprise software,” and not in the flattering way.

---

## 12. Review Architecture

Location:

```txt
engine/veriframe_core/veriframe_core/review/
apps/ui-angular/src/app/features/review/
```

The review system allows the user to correct the machine output.

### Review capabilities

- load analysis result
- show annotation canvas
- select region
- move region
- resize region
- delete/reject region
- change label
- review finding
- save corrections
- export dataset

### Correction records

A region correction should include:

- correction ID
- run ID
- region ID
- action
- original region
- corrected region
- label before/after
- box before/after
- notes
- timestamps

### Finding review records

A finding review should include:

- review ID
- run ID
- finding ID
- decision
- notes
- reviewer
- timestamps

---

## 13. Dataset Export Architecture

Location:

```txt
engine/veriframe_core/veriframe_core/review/dataset_exporter.py
tools/annotate/
datasets/
```

Dataset export converts reviewed runs into training-ready data.

Expected output:

```txt
review-export-<timestamp>/
  images/
    <image_id>.jpg
  annotations/
    <image_id>.json
  manifest.json
  README.md
```

The export should include:

- source run IDs
- source image hashes
- label set
- correction counts
- schema version
- export timestamp
- model/profile references where available

Dataset export remains local. No background upload. The app is not a courier.

---

## 14. Settings & Doctor Architecture

### Settings

Settings cover:

- privacy behavior
- EXIF inclusion
- temp cleanup
- report output behavior
- default model profiles
- confidence threshold
- device preference
- storage limits

Settings are persisted locally and should be accessible through both UI and engine APIs.

### Doctor

Doctor checks cover:

- engine reachable
- database initialized
- model paths readable
- storage permissions
- logs readable
- system info
- selected device backend
- local-only status

Doctor should give actionable messages, not just “failed.” A diagnostic tool that only says “bad” deserves to be deleted by a magnet.

---

## 15. Error Handling

Errors should be structured and user-safe.

### Backend error shape

```json
{
  "detail": {
    "code": "ANALYSIS_FAILED",
    "message": "Analysis pipeline failed.",
    "details": "Detection model failed: ...",
    "requestId": "req_..."
  }
}
```

### Tauri error shape

Tauri should convert Rust/native errors into frontend-safe messages.

Frontend errors should:

- avoid raw stack traces
- avoid secret tokens
- show what failed
- suggest the next action
- preserve enough detail for debugging

Bad:

```txt
Internal Server Error
```

Better:

```txt
Local review engine request failed with status 404:
Analysis result not found for review: run_...
```

---

## 16. Testing Architecture

VeriFrame uses separate test surfaces.

| Layer | Test type |
|---|---|
| Contracts | schema validation, fixture validation |
| Angular | component/service/store tests |
| Tauri | command/path guard tests |
| Python engine | API, pipeline, storage, model, report, review tests |
| Golden files | report and contract stability |
| E2E | import → analyze → review → export flow |
| Benchmarks | inference, storage, pipeline latency |

### Core test commands

```powershell
pnpm test
pnpm --filter @veriframe/ui-angular test
pnpm --filter @veriframe/desktop-tauri check
pnpm test:engine
```

### Engine benchmark commands

```powershell
python tools/benchmark/benchmark_inference.py
python tools/benchmark/benchmark_pipeline.py --iterations 20
python tools/benchmark/benchmark_storage.py --iterations 5000
```

---

## 17. Security Architecture Summary

Security and privacy are not optional decorations.

The architecture enforces:

- no normal cloud workflow
- localhost-only engine binding
- local session token
- explicit import/export
- Tauri-native path boundary
- local SQLite storage
- deterministic audit receipts
- no telemetry
- no analytics SDKs
- clear user-triggered deletion

See:

```txt
docs/security-and-privacy.md
```

for the full threat model and privacy policy.

---

## 18. Performance Architecture

Performance priorities:

- keep UI responsive
- avoid blocking Angular rendering
- keep heavy work inside Python engine
- avoid repeated model loads
- cache loaded models
- use local SQLite efficiently
- run preprocessing in predictable stages
- generate artifacts once per run
- support CPU-first execution

### Practical targets

| Area | Target |
|---|---|
| UI navigation | no visible freeze |
| SQLite operations | millisecond-level local operations for small runs |
| Pipeline smoke test | stable latency across repeated runs |
| Model loading | explicit and visible |
| Report export | deterministic and repeatable |

---

## 19. Packaging Architecture

Production packaging should bundle:

- Angular production build
- Tauri desktop shell
- Python engine sidecar
- model configs
- documentation
- migrations
- default settings
- required assets/icons

Recommended packaged behavior:

```txt
User launches VeriFrame
       │
       ▼
Tauri starts local Python sidecar
       │
       ▼
Sidecar binds to 127.0.0.1
       │
       ▼
Tauri generates session token
       │
       ▼
Angular UI loads
       │
       ▼
User imports/analyzes/reviews locally
```

Development behavior may use an externally started engine:

```powershell
pnpm dev:engine
pnpm dev:desktop
```

---

## 20. Maintainer Guidelines

When adding or changing architecture:

1. Keep boundaries clean.
2. Reuse contracts.
3. Avoid direct cross-layer shortcuts.
4. Add tests with every feature.
5. Keep local-only posture intact.
6. Make errors actionable.
7. Document new workflows.
8. Avoid hardcoded absolute paths.
9. Do not introduce telemetry.
10. Do not silently upload anything.
11. Keep fallback behavior honest.
12. Prefer deterministic outputs over clever magic.

If a feature requires a paragraph of excuses, it probably needs a better boundary.

---

## 21. Authors

**Mahesh Chandra Teja Garnepudi**  
GitHub: `@MaheshChandraTeja`

**Sagarika Srivastava**  
GitHub: `@SagarikaSrivastava`

**Organization**  
Kairais Tech  
`https://www.kairais.com`

---

## 22. Closing Note

VeriFrame’s architecture is intentionally modular because visual evidence tools need to be inspectable, testable, and boring where it matters.

The UI can be sleek. The reports can be beautiful. The model pipeline can be powerful.

But the trust boundary should be painfully clear.

Local image in.  
Local analysis.  
Local report.  
Local audit receipt.  
Human review.  
No mystery cloud goblin.

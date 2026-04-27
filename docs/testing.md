# Testing

<p align="center">
  <strong>Testing VeriFrame from unit tests to full manual QA, with local-only behavior, reproducible reports, and human review treated as first-class release gates.</strong>
</p>

<p align="center">
  <img alt="Python Tests" src="https://img.shields.io/badge/Python-pytest-3776AB?style=for-the-badge&logo=python">
  <img alt="Angular Tests" src="https://img.shields.io/badge/Angular-Vitest-DD0031?style=for-the-badge&logo=angular">
  <img alt="Rust" src="https://img.shields.io/badge/Rust-cargo%20check-000000?style=for-the-badge&logo=rust">
  <img alt="QA" src="https://img.shields.io/badge/Manual%20QA-Full%20Plan-8b5cf6?style=for-the-badge">
  <img alt="Local Only" src="https://img.shields.io/badge/Privacy-Local--Only-0ea5e9?style=for-the-badge">
</p>

---

## 1. Overview

This document defines the testing strategy for **VeriFrame**, a local-first Angular + Tauri + Python TorchVision desktop application.

Testing must prove three things:

1. VeriFrame works functionally.
2. VeriFrame stays local-only.
3. VeriFrame produces reproducible records: reports, evidence maps, audit receipts, and reviewed datasets.

This testing strategy mirrors the full QA plan and turns it into a repeatable engineering workflow. Tests are not decorative. They are the thing standing between “production-ready” and “a pretty desktop app that panics when someone uploads a JPEG.” Tiny but important distinction.

---

## 2. Test Layers

VeriFrame uses layered testing.

```txt
Static checks
   │
   ▼
Unit tests
   │
   ▼
Service/store/component tests
   │
   ▼
Engine API tests
   │
   ▼
Storage/report/review tests
   │
   ▼
Benchmarks
   │
   ▼
Manual UI QA
   │
   ▼
Packaging QA
   │
   ▼
Release gate
```

### Test surfaces

| Layer | Tooling | Purpose |
|---|---|---|
| Python engine | `pytest` | API, pipeline, contracts, reports, review, storage |
| Angular UI | `Vitest` | components, services, stores, UI logic |
| Tauri/Rust | `cargo check` | command registration, native bridge, compile safety |
| Benchmarks | Python scripts | pipeline/storage/inference smoke performance |
| API manual QA | PowerShell + curl | protected endpoints, reports, review, settings |
| UI manual QA | Tauri dev app | real navigation and visual workflows |
| Privacy QA | PowerShell scans | local-only and no telemetry behavior |
| Packaging QA | Tauri/Angular build | production build readiness |

---

## 3. Expected Test Environment

| Item | Expected |
|---|---|
| OS | Windows 10/11 |
| Shell | PowerShell |
| Repo path | `F:\Projects-INT\VeriFrame` |
| Conda env | `veriframe` |
| Python | `3.11.x` |
| Node / PNPM | Node installed, PNPM `9.x` |
| Rust | Stable toolchain |
| Engine port | `127.0.0.1:32187` |
| Engine token | `dev-token` |

Start from repo root:

```powershell
cd F:\Projects-INT\VeriFrame
conda activate veriframe
```

Expected:

```txt
(veriframe) PS F:\Projects-INT\VeriFrame>
```

---

## 4. Quick Test Gate

Use this before every serious manual test session.

```powershell
pnpm test:engine
pnpm --filter @veriframe/ui-angular test
pnpm --filter @veriframe/desktop-tauri check
```

Expected:

```txt
Python engine tests: PASS
Angular UI tests:   PASS
Tauri Rust check:   PASS
```

If this fails, stop. Manual testing broken software is just cosplay with extra typing.

---

## 5. Preflight Checks

### 5.1 Tool versions

```powershell
python --version
pnpm --version
cargo --version
rustc --version
```

Expected:

- Python reports `3.11.x`
- PNPM reports valid version
- Cargo and Rust return valid versions
- No command fails

### 5.2 Repo structure

```powershell
Test-Path .\engine\veriframe_core
Test-Path .\apps\ui-angular
Test-Path .\apps\desktop-tauri
Test-Path .\packages\contracts
Test-Path .\storage\migrations
Test-Path .\models\configs
```

Expected:

```txt
True
True
True
True
True
True
```

---

## 6. Python Engine Tests

Run:

```powershell
pnpm test:engine
```

Expected:

- all tests pass
- no import errors
- no migration errors
- no schema validation errors
- no accidental missing route modules
- no broken fixtures

### Python test areas

| Area | Expected coverage |
|---|---|
| Config | paths, defaults, validation |
| Health API | `/health`, `/version`, `/capabilities` |
| Contracts | schema behavior and serialization |
| Importing | file validation, image loading, metadata |
| Quality | blur, brightness, contrast, glare |
| Model registry | config loading and profile validation |
| Output parsers | TorchVision-style output conversion |
| Pipeline | analysis pipeline smoke |
| Storage | migrations and repositories |
| Audit | receipt hash consistency |
| Reports | JSON/HTML/evidence/audit exports |
| Review | corrections, finding reviews, dataset export |
| Doctor | engine/database/model/storage checks |
| CLI | health/analyze/serve smoke behavior |

### Common Python failures

| Failure | Meaning | Fix |
|---|---|---|
| `ModuleNotFoundError` | missing module or wrong import path | restore file/import and rerun |
| Pydantic warning | config class issue | fix `model_config` in model class |
| migration error | database schema drift | update migrations/tests |
| schema validation error | contract drift | update TS/Python/schema together |
| API 500 | route lacks structured error handling | wrap and return clean detail |

---

## 7. Angular UI Tests

Run:

```powershell
pnpm --filter @veriframe/ui-angular test
```

Expected:

- all Vitest tests pass
- no component creation failures
- no Tauri mock failures
- no missing pipe imports
- no route/module import errors

### Angular test areas

| Area | Expected coverage |
|---|---|
| TauriService | typed invoke wrapper behavior |
| ThemeService | light/dark mode state |
| AnalysisStore | result, selected region, severity filters |
| ImportService | file selection and analysis request flow |
| ModelService | list/load/unload calls |
| ReportService | list/export/delete calls |
| SettingsService | read/write settings |
| DoctorService | checks/system info/logs |
| ReviewStore | selected region, edit mode, pending changes |
| Shared UI | buttons, badges, file dropzone |

### Common Angular failures

| Failure | Meaning | Fix |
|---|---|---|
| `Cannot find module` | route/component file missing | restore file/import |
| missing pipe | standalone import missing | add pipe to component imports |
| component compile error | template mismatch | fix template/types |
| stale UI after patch | dev server cache | restart desktop/dev server |
| fetch/CORS issue | Angular bypassing Tauri | route through TauriService |

---

## 8. Tauri/Rust Checks

Run:

```powershell
pnpm --filter @veriframe/desktop-tauri check
```

Expected:

```txt
Finished `dev` profile
```

### Rust check validates

- command modules exist
- command functions compile
- command macros are generated
- commands are registered in `invoke_handler`
- engine bridge code compiles
- Tauri state types compile
- errors convert properly

### Common Rust failures

| Failure | Meaning | Fix |
|---|---|---|
| `file not found for module` | module declared but file missing | create file or remove mod |
| `cannot find macro __cmd__...` | command missing `#[tauri::command]` or not imported | fix command registration |
| missing method | trait not imported | add needed trait import |
| dependency not found | missing Cargo dependency | update `Cargo.toml` |
| type mismatch | command/request shape drift | update structs and UI call |

---

## 9. Benchmark Smoke Tests

Benchmarks do not prove final ML performance. They prove the harness and pipeline are alive.

### 9.1 Storage benchmark

```powershell
python tools/benchmark/benchmark_storage.py --iterations 5000
```

Expected:

- JSON output
- no import errors
- no SQLite errors
- p95 read/write normally below a few milliseconds for tiny local operations

### 9.2 Pipeline benchmark

```powershell
python tools/benchmark/benchmark_pipeline.py --iterations 20
```

Expected:

- JSON output
- no pipeline failure
- no storage failure
- stable latency for current no-heavy-model pipeline

Important:

This is not the final TorchVision-heavy benchmark. When Faster R-CNN or Mask R-CNN is active, latency will increase. Physics remains annoyingly undefeated.

### 9.3 Inference utility benchmark

```powershell
python tools/benchmark/benchmark_inference.py
```

Expected:

- JSON output
- no import errors

Important:

This measures a tiny utility path, not full model inference.

---

## 10. Engine Startup Tests

### 10.1 Check port availability

```powershell
Get-NetTCPConnection -LocalPort 32187 -State Listen -ErrorAction SilentlyContinue
```

If occupied:

```powershell
$enginePid = (Get-NetTCPConnection -LocalPort 32187 -State Listen).OwningProcess
Get-CimInstance Win32_Process -Filter "ProcessId=$enginePid" | Select-Object ProcessId,CommandLine
```

Stop if needed:

```powershell
Stop-Process -Id $enginePid -Force
```

### 10.2 Start engine

```powershell
pnpm dev:engine
```

Expected:

```txt
Application startup complete.
```

Engine should bind to:

```txt
127.0.0.1:32187
```

### 10.3 Health endpoint

```powershell
curl.exe http://127.0.0.1:32187/health
```

Expected:

```json
{
  "ok": true,
  "engineName": "veriframe-core",
  "engineVersion": "0.1.0",
  "directoriesReady": true
}
```

### 10.4 Version endpoint

```powershell
curl.exe http://127.0.0.1:32187/version
```

Expected fields:

```txt
engineName
engineVersion
contractSchemaVersion
desktopProtocolVersion
```

### 10.5 Capabilities endpoint

```powershell
curl.exe http://127.0.0.1:32187/capabilities
```

Expected:

```json
{
  "localOnly": true,
  "telemetry": false,
  "cloudUpload": false
}
```

---

## 11. Token and Protected API Tests

Protected endpoints require:

```txt
x-veriframe-token: dev-token
```

### 11.1 Without token

```powershell
curl.exe http://127.0.0.1:32187/models
```

Expected:

- rejected
- no model registry data returned
- no stack trace

### 11.2 With token

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/models
```

Expected:

- model registry returned
- no auth error

---

## 12. Model Registry Tests

### 12.1 List models

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/models
```

Expected profiles:

```txt
general_object_detector
receipt_region_detector
product_package_detector
damage_detector
display_panel_detector
```

Each model should include:

- model ID
- task
- labels
- loadable state
- loaded state
- checkpoint status

### 12.2 Load model

Use PowerShell native JSON instead of curl string escaping, because PowerShell quotes JSON like it is trying to sabotage a space mission.

```powershell
$body = @{
  modelId = "general_object_detector"
  warmup = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/models/load" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- loaded `true`
- device usually `cpu`
- no model download
- no CUDA assumption

### 12.3 Unload model

```powershell
$body = @{
  modelId = "general_object_detector"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/models/unload" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- success
- no crash
- model removed from loaded models list

---

## 13. Settings Tests

### 13.1 Get settings

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/settings
```

Expected:

- settings returned
- `localOnly = true`
- `telemetry = false`

Expected keys:

```txt
privacy.includeExifByDefault
privacy.cleanupTempOnExit
privacy.telemetryEnabled
model.devicePreference
model.defaultConfidenceThreshold
model.defaultProfiles
storage.maxCacheSizeMb
storage.autoCleanupReports
storage.keepAuditReceiptsForever
```

### 13.2 Update settings

```powershell
$body = @{
  values = @{
    "model.defaultConfidenceThreshold" = 0.65
    "privacy.includeExifByDefault" = $false
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Method Put `
  -Uri "http://127.0.0.1:32187/settings" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Verify:

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/settings
```

Expected:

- changed values persisted
- telemetry remains disabled

---

## 14. Doctor Diagnostics Tests

### 14.1 Run all checks

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/doctor/checks
```

Expected checks:

```txt
engine
database
model_paths
storage_permissions
```

Expected status:

```txt
pass
```

`warn` is acceptable only if the explanation is useful. `fail` means investigate.

### 14.2 System info

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/doctor/system-info
```

Expected fields:

```txt
os
osVersion
architecture
pythonVersion
engineVersion
processId
device
appDataDir
databasePath
reportsDir
tempDir
diskTotalBytes
diskFreeBytes
```

### 14.3 Logs

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/doctor/logs
```

Expected:

- returns `lines`
- returns `path` or `null`
- no token exposure
- no raw secrets

---

## 15. Image Import Tests

Use:

```txt
packages/shared-fixtures/images/sample-receipt.jpg
```

If missing, use any small `.jpg` or `.png`.

### 15.1 Supported files

Test:

```txt
jpg
jpeg
png
webp
bmp
tif/tiff if enabled
```

Expected:

- accepted
- metadata detected
- dimensions detected
- SHA-256 generated

### 15.2 Unsupported files

Try:

```txt
.txt
.exe
.pdf
.zip
```

Expected:

- rejected
- clear error
- no crash
- no analysis run created

### 15.3 Corrupted image

```powershell
"not really an image" | Set-Content .\fake.jpg
```

Try importing `fake.jpg`.

Expected:

- rejected
- invalid/corrupted image message
- no analysis run created

Cleanup:

```powershell
Remove-Item .\fake.jpg
```

### 15.4 Oversized image

Use a large image if available.

Expected:

- rejected if above configured limit
- no memory crash
- clear error

---

## 16. Analysis Pipeline Tests

### 16.1 Submit analysis

```powershell
$imagePath = "F:\Projects-INT\VeriFrame\packages\shared-fixtures\images\sample-receipt.jpg"

$body = @{
  schemaVersion = "1.0.0"
  requestId = "qa_req_$([guid]::NewGuid().ToString('N'))"
  source = @{
    type = "image_file"
    path = $imagePath
    sha256 = $null
  }
  workflow = "visual_audit"
  requestedTasks = @("quality", "detection")
  modelProfileIds = @("receipt_region_detector")
  options = @{
    confidenceThreshold = 0.5
    maxImageSizePx = 4096
    includeExif = $false
    exportArtifacts = $true
  }
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 20

$result = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/analysis" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body

$result | ConvertTo-Json -Depth 30
```

Expected:

- `status = completed`
- `runId` exists
- `image` metadata exists
- `qualityReport` exists
- `auditReceipt` exists
- findings exist
- warnings are clear if a model was not loaded

Save:

```powershell
$runId = $result.runId
```

### 16.2 Load analysis result

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:32187/analysis/$runId" `
  -Headers @{ "x-veriframe-token" = "dev-token" }
```

Expected:

- same result loads
- no missing result error

### 16.3 Progress

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:32187/analysis/$runId/progress" `
  -Headers @{ "x-veriframe-token" = "dev-token" }
```

Expected:

```txt
status = completed
percent = 100
```

### 16.4 Evidence files

Use `/doctor/system-info` to find `reportsDir`.

Expected under:

```txt
<reportsDir>/<RUN_ID>/
```

Files:

```txt
analysis-result.json
evidence-overlay.png
evidence-map.json
region-crops/       # if regions exist
```

---

## 17. SQLite Storage Tests

### 17.1 Database exists

Use:

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/doctor/system-info
```

Find:

```txt
databasePath
```

Expected:

- database file exists
- file size > 0 after at least one analysis

### 17.2 Tables

Optional with SQLite CLI:

```powershell
sqlite3 <databasePath> ".tables"
```

Expected tables:

```txt
analysis_runs
images
findings
regions
model_runs
audit_logs
report_artifacts
settings
region_corrections
finding_reviews
review_exports
schema_migrations
```

### 17.3 Report listing uses storage

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/reports
```

Expected:

- completed run appears
- `findingCount` exists
- `regionCount` exists
- `artifactCount` exists
- `inputHash` exists
- `resultHash` exists
- `configHash` exists

---

## 18. Reports and Export Tests

Use a real run ID from analysis.

### 18.1 Get visual report

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/reports/$runId
```

Expected:

- report ID
- run ID
- image metadata
- quality report
- findings
- evidence map
- audit receipt

### 18.2 Export JSON

```powershell
$body = @{ format = "json" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/reports/$runId/export" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- path returned
- SHA-256 returned
- file exists
- JSON is valid

### 18.3 Export HTML

```powershell
$body = @{ format = "html" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/reports/$runId/export" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- HTML file exists
- browser opens it
- image details visible
- quality section visible
- findings visible
- regions visible if present
- audit receipt visible

### 18.4 Export evidence map

```powershell
$body = @{ format = "evidence_map" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/reports/$runId/export" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- JSON file exists
- image dimensions included
- regions list included, even if empty

### 18.5 Export audit receipt

```powershell
$body = @{ format = "audit_receipt" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/reports/$runId/export" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Expected receipt fields:

```txt
receiptId
runId
generatedAt
inputHash
resultHash
configHash
modelRefs
artifactHashes
signature
```

Expected signature algorithm:

```txt
sha256-local-integrity
```

### 18.6 Delete report

```powershell
Invoke-RestMethod `
  -Method Delete `
  -Uri "http://127.0.0.1:32187/reports/$runId" `
  -Headers @{ "x-veriframe-token" = "dev-token" }
```

Expected:

- `ok = true`
- report directory removed if present
- follow-up `/reports` no longer shows the run

Use a disposable test run. Do not delete your only useful report and then act surprised. The app did exactly what you asked.

---

## 19. Human Review Tests

Use:

```txt
/review/<RUN_ID>
```

or API calls.

### 19.1 Get review session

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:32187/review/$runId" `
  -Headers @{ "x-veriframe-token" = "dev-token" }
```

Expected:

- `result` exists
- `session` exists
- `corrections` array exists
- `findingReviews` array exists
- counts exist

### 19.2 Save finding review

Pick a finding ID.

```powershell
$findingId = "<FINDING_ID>"
$now = (Get-Date).ToUniversalTime().ToString("o")

$review = @{
  reviewId = "qa_review_$([guid]::NewGuid().ToString('N'))"
  runId = $runId
  findingId = $findingId
  decision = "valid"
  notes = "QA review decision"
  reviewer = "manual-qa"
  createdAt = $now
  updatedAt = $now
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/review/$runId/findings" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $review
```

Expected:

- `ok = true`
- review appears after reload

### 19.3 Save region correction

Use a run with regions.

```powershell
$response = Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:32187/analysis/$runId" `
  -Headers @{ "x-veriframe-token" = "dev-token" }

$region = @($response.regions)[0]
$now = (Get-Date).ToUniversalTime().ToString("o")

$correctedRegion = @{
  regionId = $region.regionId
  label = "line_item_block"
  category = "line_item_block"
  confidence = $region.confidence
  bbox = @{
    x = $region.bbox.x + 5
    y = $region.bbox.y + 5
    width = [Math]::Max(10, $region.bbox.width - 10)
    height = [Math]::Max(10, $region.bbox.height - 10)
  }
  mask = $null
  sourceModelId = $region.sourceModelId
  rationale = "QA adjusted existing region label and bounding box."
  reviewStatus = "corrected"
}

$correction = @{
  correctionId = "qa_corr_$([guid]::NewGuid().ToString('N'))"
  runId = $runId
  regionId = $region.regionId
  action = "update"
  originalRegion = $region
  correctedRegion = $correctedRegion
  labelCorrection = @{
    before = $region.label
    after = "line_item_block"
  }
  boxCorrection = @{
    before = $region.bbox
    after = $correctedRegion.bbox
  }
  maskCorrection = $null
  notes = "QA existing-region correction test."
  createdAt = $now
  updatedAt = $now
} | ConvertTo-Json -Depth 30

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/review/$runId/regions" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $correction
```

Expected:

- `ok = true`
- correction appears after session reload
- correction count increases

### 19.4 Export review dataset

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/review/$runId/export-dataset" `
  -Headers @{ "x-veriframe-token" = "dev-token" }
```

Expected:

- dataset path returned
- annotation JSON exists
- manifest JSON exists
- image copied if source exists

Expected layout:

```txt
review-datasets/<RUN_ID>/
  images/
  annotations/
    <RUN_ID>.json
  manifest.json
```

---

## 20. Angular UI Manual QA

Start desktop app:

```powershell
pnpm dev:desktop
```

or use the configured package script.

### Routes to check

```txt
/dashboard
/import
/analysis/<RUN_ID>
/review/<RUN_ID>
/reports
/models
/settings
/doctor
```

### 20.1 App shell

Expected:

- sidebar loads
- topbar loads
- routes clickable
- no blank page
- no console crash

### 20.2 Dashboard

Expected:

- engine health card displays
- privacy/local-only card displays
- recent runs or empty state displays
- loaded model status is accurate

### 20.3 Import

Expected:

- drag/drop area displays
- selecting images adds queue entries
- image preview grid displays
- invalid files show validation error
- queue persists across tabs
- remove button works
- analyze button submits request
- app navigates to analysis page after run completes

### 20.4 Models

Expected:

- model profiles display
- status badges display
- load/unload buttons work
- checkpoint status is clear
- UI does not freeze permanently

### 20.5 Analysis

Expected:

- evidence viewer displays
- regions display if present
- findings list displays
- quality panel displays
- selecting region updates detail panel
- severity filter works
- link to review workspace works

### 20.6 Reports

Expected:

- reports list loads
- report cards display run ID/counts
- export buttons work
- delete report works
- custom delete dialog is readable
- View analysis link works
- Review link works

### 20.7 Review

Expected:

- annotation canvas loads
- regions display if available
- selecting region works
- move mode changes box
- resize mode changes box
- delete mode marks correction
- label editor changes label
- finding review buttons queue decisions
- Save review works
- Export dataset works

### 20.8 Settings

Expected:

- privacy settings load
- model settings load
- storage settings load
- saving updates backend
- reload preserves changed values
- telemetry remains disabled

### 20.9 Doctor

Expected:

- diagnostics run
- check cards display
- system info displays
- logs display
- pass/warn/fail badges display correctly

---

## 21. Local-Only Privacy Tests

### 21.1 Engine bind address

```powershell
Get-NetTCPConnection -LocalPort 32187 -State Listen
```

Expected:

```txt
LocalAddress = 127.0.0.1
```

Fail if bound to:

```txt
0.0.0.0
LAN IP
public IP
```

### 21.2 Telemetry scan

```powershell
Get-ChildItem . -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\|\\target\\|\\dist\\|\\.angular\\|\\release\\|\\preview\\|\\.git\\|__pycache__"
  } |
  Select-String `
    -SimpleMatch `
    -Pattern "telemetry","analytics","sentry","posthog","segment","amplitude","google-analytics","gtag","mixpanel"
```

Expected acceptable hits:

- docs saying telemetry is forbidden
- settings showing telemetry disabled
- local-only threat model references

Suspicious hits:

- analytics SDK imports
- tracking initialization
- external beacon calls
- API keys

### 21.3 Angular must not call Python directly

```powershell
Get-ChildItem .\apps\ui-angular\src -Recurse -File |
  Select-String `
    -SimpleMatch `
    -Pattern "127.0.0.1","localhost","fetch(","axios","http://","https://"
```

Expected:

- no direct engine HTTP calls from feature components/services
- Angular routes through Tauri service wrappers
- Angular `provideHttpClient(withFetch())` is acceptable by itself

### 21.4 Tauri owns native boundary

Expected:

- file selection goes through Tauri
- report open/reveal goes through Tauri
- Angular does not use raw filesystem APIs
- Python does not expose public network API

---

## 22. Negative and Failure Tests

### 22.1 Engine down behavior

Stop engine.

Open:

```txt
/models
/reports
/settings
/doctor
/import
/review/<RUN_ID>
```

Expected:

- clear error
- no crash
- no infinite spinner forever

### 22.2 Invalid run ID

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/analysis/does-not-exist
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/reports/does-not-exist
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/review/does-not-exist
```

Expected:

- clean not found error
- no stack trace leaked

### 22.3 Invalid export format

```powershell
$body = @{ format = "pdf" } | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:32187/reports/$runId/export" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body $body
```

Expected:

- request rejected
- clear validation error
- no crash

### 22.4 Invalid settings payload

```powershell
Invoke-RestMethod `
  -Method Put `
  -Uri "http://127.0.0.1:32187/settings" `
  -Headers @{ "x-veriframe-token" = "dev-token" } `
  -ContentType "application/json" `
  -Body '{"values":"not-an-object"}'
```

Expected:

- rejected
- clear validation error

---

## 23. File System Tests

### 23.1 Temp cleanup

```powershell
python tools/dev/clean_generated.py --temp
```

Expected:

- temp directory cleaned
- directory recreated
- reports untouched

### 23.2 Reports cleanup

Only run if comfortable deleting generated reports:

```powershell
python tools/dev/clean_generated.py --reports
```

Expected:

- reports directory cleaned
- directory recreated
- database may still contain old run records unless explicitly cleaned

---

## 24. Packaging Tests

### 24.1 Angular production build

```powershell
pnpm --filter @veriframe/ui-angular build
```

Expected:

- build succeeds
- output folder generated
- no TypeScript errors

### 24.2 Tauri build check

```powershell
pnpm --filter @veriframe/desktop-tauri check
```

Expected:

- Rust check succeeds

Optional:

```powershell
pnpm --filter @veriframe/desktop-tauri build
```

Expected:

- desktop package builds
- if icons/signing/bundle config are incomplete, record issue clearly

---

## 25. CI Tests

### 25.1 Workflow files exist

```powershell
Test-Path .\.github\workflows\ci.yml
Test-Path .\.github\workflows\build-desktop.yml
Test-Path .\.github\workflows\benchmark.yml
```

Expected:

```txt
True
True
True
```

### 25.2 CI stages

Expected in CI:

```txt
install dependencies
test Angular
test Python
check Rust
validate schemas
```

Recommended additional stages:

```txt
benchmark smoke
privacy scan
build desktop package
upload artifacts
```

---

## 26. Documentation Tests

```powershell
Test-Path .\docs\packaging.md
Test-Path .\docs\testing.md
Test-Path .\docs\model-training.md
Test-Path .\docs\performance.md
Test-Path .\docs\security-and-privacy.md
Test-Path .\docs\architecture.md
```

Expected:

```txt
True
True
True
True
True
True
```

Manual review should confirm:

- packaging docs explain Angular + Tauri + Python sidecar
- testing docs explain automated, API, UI, privacy, and packaging gates
- model training docs explain reviewed dataset flow
- performance docs explain benchmark expectations
- security docs explain local-only guarantees and limitations
- architecture docs explain boundaries

---

## 27. Final Release Gate

Before calling VeriFrame QA-passed:

```txt
[✅] Python engine tests pass
[✅] Angular UI tests pass
[✅] Tauri cargo check passes
[✅] Engine starts on 127.0.0.1 only
[✅] Health/version/capabilities endpoints work
[✅] Protected endpoints reject missing token
[✅] Model registry works
[✅] Settings read/write works
[✅] Doctor checks pass
[✅] Image import validates supported files
[✅] Invalid files are rejected cleanly
[✅] Analysis pipeline returns AnalysisResult
[✅] Analysis result is persisted
[✅] Reports list includes completed run
[✅] JSON export works
[✅] HTML export works
[✅] Evidence map export works
[✅] Audit receipt export works
[✅] Review session loads
[✅] Finding review saves
[✅] Region correction saves where regions exist
[✅] Review dataset export works
[✅] Angular dashboard works
[✅] Angular import page works
[✅] Angular models page works
[✅] Angular analysis page works
[✅] Angular reports page works
[✅] Angular review page works
[✅] Angular settings page works
[✅] Angular doctor page works
[✅] Benchmark scripts run
[✅] Docs exist
[✅] CI workflow files exist
```

---

## 28. QA Result Summary Template

| Area | Status | Notes |
|---|---|---|
| Environment | PASS |✅|
| Automated tests | PASS |✅|
| Engine API | PASS |✅|
| Security/token | PASS |✅|
| Model registry | PASS |✅|
| Import | PASS |✅|
| Analysis pipeline | PASS |✅|
| SQLite storage | PASS |✅|
| Reports/export | PASS |✅|
| Audit receipts | PASS |✅|
| Human review | PASS |✅|
| Dataset export | PASS |✅|
| Settings | PASS |✅|
| Doctor diagnostics | PASS |✅|
| Benchmarks | PASS |✅|
| Angular UI | PASS |✅|
| Tauri desktop | PASS |✅|
| Docs/CI | PASS |✅|

---

## 29. Known Baseline

Current benchmark baseline from QA:

```json
{
  "sqlite_storage": {
    "iterations": 5000,
    "write_p95_ms": 0.0045,
    "read_p95_ms": 0.0033
  },
  "full_pipeline_no_heavy_model": {
    "iterations": 20,
    "p50_ms": 55.9908,
    "p95_ms": 69.7304,
    "mean_ms": 57.8243
  }
}
```

Assessment:

```txt
PASS
```

Important:

Do not compare these directly to future model-loaded inference runs. Heavy TorchVision models will increase runtime. That is expected. A Faster R-CNN model does not care about our feelings.

---

## 30. Sign-Off Template

```txt
Tester: Sagarika Srivastava
Date:   2026-04-26
OS: Windows 10
Python: 3.11.7
Node:   25.9.0
PNPM:   9.15.9
Rust:   1.89.0
Engine Version: 1.0
Result: PASS
```

---

## 31. Authors

**Mahesh Chandra Teja Garnepudi**  
GitHub: `@MaheshChandraTeja`

**Sagarika Srivastava**  
GitHub: `@SagarikaSrivastava`

**Organization**  
Kairais Tech  
`https://www.kairais.com`

---

## 32. Closing Note

Testing VeriFrame is not just checking if buttons work.

It is checking whether a local visual evidence system can:

- accept real files
- reject bad files
- run locally
- protect endpoints
- produce reproducible reports
- preserve audit receipts
- support human review
- export reviewed datasets
- stay off the network
- survive packaging

That is the bar.

Anything less is just a slick UI wearing a lab coat and hoping nobody asks for logs.

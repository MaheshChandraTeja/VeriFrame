# Packaging

<p align="center">
  <strong>Packaging VeriFrame into a local-first desktop release with Angular, Tauri, Python, SQLite, and TorchVision-friendly engine boundaries.</strong>
</p>

<p align="center">
  <img alt="Angular" src="https://img.shields.io/badge/UI-Angular-DD0031?style=for-the-badge&logo=angular">
  <img alt="Tauri" src="https://img.shields.io/badge/Desktop-Tauri-24C8DB?style=for-the-badge&logo=tauri">
  <img alt="Python" src="https://img.shields.io/badge/Engine-Python-3776AB?style=for-the-badge&logo=python">
  <img alt="PyTorch" src="https://img.shields.io/badge/ML-PyTorch-EE4C2C?style=for-the-badge&logo=pytorch">
  <img alt="Local Only" src="https://img.shields.io/badge/Network-Localhost%20Only-0ea5e9?style=for-the-badge">
  <img alt="Telemetry" src="https://img.shields.io/badge/Telemetry-None-111827?style=for-the-badge">
</p>

---

## 1. Overview

**VeriFrame** packages as a desktop application with three major pieces:

```txt
Angular UI
   │
   ▼
Tauri desktop shell
   │
   ▼
Python VeriFrame engine sidecar
```

The packaged app must preserve VeriFrame’s core promise:

> Imported evidence stays local. Analysis runs locally. Reports are generated locally. Audit receipts are local integrity records.

Packaging is not just “make an `.exe` and hope the goblin behaves.” Packaging has to preserve the trust boundary, bundle the right artifacts, avoid leaking development shortcuts, and keep diagnostics useful when a machine inevitably decides to become a haunted appliance.

---

## 2. Packaging Goals

A production-grade VeriFrame package should:

- launch the Angular UI inside the Tauri desktop shell
- start or connect to the local Python engine sidecar
- bind the engine only to localhost
- use a session token between Tauri and Python
- initialize app directories on first launch
- initialize SQLite migrations
- include model configs and model cards
- include required icons and bundle metadata
- support local reports, logs, temp files, and model directories
- avoid analytics, telemetry, and cloud upload behavior
- give useful errors when the sidecar or runtime is missing
- pass all automated and manual release gates before distribution

The app should feel like a real local tool, not a science fair demo zip with six invisible prerequisites and a README praying for mercy.

---

## 3. Expected Development Environment

Recommended baseline:

| Item | Expected |
|---|---|
| OS | Windows 10/11 |
| Shell | PowerShell |
| Repo path | `F:\Projects-INT\VeriFrame` |
| Conda env | `veriframe` |
| Python | `3.11.x` |
| Node | LTS recommended |
| PNPM | `9.x` |
| Rust | Stable MSVC toolchain |
| Tauri | Tauri v2 |
| Engine host | `127.0.0.1` |
| Engine port | `32187` |
| Development token | `dev-token` |

Start from repo root:

```powershell
cd F:\Projects-INT\VeriFrame
conda activate veriframe
```

Expected prompt:

```txt
(veriframe) PS F:\Projects-INT\VeriFrame>
```

---

## 4. Release Build Anatomy

A packaged VeriFrame release should contain:

```txt
VeriFrame/
  VeriFrame.exe
  resources/
    engine/
      veriframe_core/
      python_runtime_or_launcher/
      pyproject.toml or packaged wheel metadata
    models/
      configs/
      model_cards/
      checkpoints/              # optional, if shipped
    migrations/
      001_init.sql
      002_indexes.sql
    compliance/
      security-and-privacy.md
      architecture.md
      testing.md
      model-training.md
```

Runtime-generated data should **not** live inside the install directory.

Runtime data belongs in the app data directory:

```txt
C:\Users\<user>\AppData\Roaming\VeriFrame\
  veriframe.sqlite3
  models\
  reports\
  temp\
  logs\
  review-datasets\
```

That separation matters. The install directory is for bundled application resources. The app data directory is for user-owned generated state. Mixing them is how uninstallers become tiny arsonists.

---

## 5. Build Pipeline

Recommended packaging pipeline:

```txt
Clean workspace
   │
   ▼
Install dependencies
   │
   ▼
Run automated tests
   │
   ├── Python engine tests
   ├── Angular UI tests
   └── Rust/Tauri check
   │
   ▼
Build Angular production output
   │
   ▼
Prepare Python sidecar
   │
   ▼
Validate Tauri config and icons
   │
   ▼
Build Tauri desktop package
   │
   ▼
Run packaged smoke test
   │
   ▼
Archive release artifacts
```

---

## 6. Preflight Before Packaging

Run these from repo root.

### 6.1 Tool versions

```powershell
python --version
pnpm --version
cargo --version
rustc --version
```

Expected:

- Python reports `3.11.x`
- PNPM reports a valid version
- Cargo and Rust report valid stable versions
- No command fails

### 6.2 Repository structure

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

### 6.3 Clean generated state

Optional before release validation:

```powershell
python tools/dev/clean_generated.py --temp
python tools/dev/clean_generated.py --reports
```

Use this carefully. It deletes generated artifacts. Computers are literal. They do not understand “oops.”

---

## 7. Automated Release Gate

Do not package if any of these fail.

### 7.1 Python engine tests

```powershell
pnpm test:engine
```

Expected:

```txt
passed
```

The engine tests should cover:

- config loading
- health API
- contracts
- image import
- quality signals
- model registry
- output parsing
- analysis pipeline
- storage migrations
- audit receipt generation
- report generation
- review repository
- dataset export
- doctor checks

### 7.2 Angular UI tests

```powershell
pnpm --filter @veriframe/ui-angular test
```

Expected:

```txt
Test Files  passed
Tests       passed
```

The UI tests should cover:

- Tauri service wrappers
- theme service
- analysis store
- import workflow
- model service
- report service
- settings service
- doctor service
- review store
- shared UI primitives

### 7.3 Tauri Rust check

```powershell
pnpm --filter @veriframe/desktop-tauri check
```

Expected:

```txt
Finished `dev` profile
```

This catches:

- missing Rust command modules
- unregistered command macros
- dependency errors
- syntax/type errors
- broken Tauri invoke handlers

A missing command module at this stage is not “almost packaged.” It is broken. The package does not receive a participation trophy.

---

## 8. Angular Production Build

Run:

```powershell
pnpm --filter @veriframe/ui-angular build
```

Expected:

- build succeeds
- output folder is generated
- no TypeScript errors
- no Angular template errors
- no missing component imports
- no route import failures

Typical output should include production assets under the configured Angular output directory.

### Production build checklist

| Check | Expected |
|---|---|
| TypeScript | no compile errors |
| Angular templates | no missing pipes/components |
| Route imports | all pages resolve |
| Bundle output | generated |
| Source maps | controlled by build mode |
| Dev-only text | removed or intentionally hidden |
| API assumptions | Angular uses Tauri services, not direct Python URLs |

---

## 9. Tauri Desktop Build

Run a check first:

```powershell
pnpm --filter @veriframe/desktop-tauri check
```

Then optional full build:

```powershell
pnpm --filter @veriframe/desktop-tauri build
```

or, depending on package scripts:

```powershell
pnpm dev:desktop
pnpm --filter @veriframe/desktop-tauri tauri build
```

Expected:

- Rust check succeeds
- Tauri config is valid
- icons exist
- Angular build output is available
- bundle generation completes
- installer or executable appears in Tauri target/release bundle output

### Common Tauri packaging problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `icons/icon.ico not found` | missing Windows icon | add icon and update `tauri.conf.json` |
| `package.metadata does not exist` | missing Rust package metadata | add metadata in `Cargo.toml` |
| Angular output not found | frontend build not run or wrong path | check `frontendDist` |
| command not found in UI | command not registered in `invoke_handler` | update `lib.rs` |
| sidecar not found | sidecar path missing/wrong | check bundle resources |
| blank window | dev/prod URL mismatch | check `devUrl` and `frontendDist` |
| engine not reachable | sidecar failed to start | inspect logs/doctor page |

---

## 10. Tauri Configuration Requirements

Config file:

```txt
apps/desktop-tauri/src-tauri/tauri.conf.json
```

Required packaging fields:

| Field | Purpose |
|---|---|
| identifier | app identity |
| productName | packaged app name |
| version | app version |
| windows | window title/size/theme |
| build.beforeDevCommand | starts Angular dev server |
| build.beforeBuildCommand | builds Angular for production |
| build.devUrl | dev server URL |
| build.frontendDist | Angular production output |
| bundle.icon | platform icons |
| bundle.resources | sidecar/resources/docs/models/migrations |

Recommended product identity:

```txt
Product: VeriFrame
Company/Org: Kairais Tech
Author: Mahesh Chandra Teja Garnepudi
```

---

## 11. Icons and Bundle Assets

Expected assets:

```txt
apps/desktop-tauri/src-tauri/icons/
  icon.ico
  icon.icns
  32x32.png
  128x128.png
  128x128@2x.png
```

Windows packaging usually requires:

```txt
icons/icon.ico
```

If this is missing, `tauri-build` can fail while generating the Windows resource file. The compiler is not being dramatic there. It genuinely needs the icon. Annoying, but fair.

### Icon quality checklist

- readable at small size
- no fake app-square frame baked into SVG unless intended
- transparent background for raw icon assets
- consistent with VeriFrame visual identity
- not overly detailed
- works in light/dark OS themes

---

## 12. Python Engine Packaging

The Python engine can be packaged in several ways.

### Option A: Managed Python environment

The app starts a known Python interpreter and module:

```txt
python -m veriframe_core.cli serve --host 127.0.0.1 --port <port> --token <token>
```

Pros:

- easier development
- simpler debugging
- conda/venv friendly

Cons:

- not self-contained
- user must have Python/env installed
- fragile for real distribution

### Option B: Frozen sidecar

Package the Python engine into a sidecar executable using a tool such as PyInstaller or Nuitka.

Pros:

- more self-contained
- easier for end users
- fewer environment surprises

Cons:

- larger package
- Torch/Pillow/OpenCV packaging can be grumpy
- needs careful hidden-import/resource handling

### Option C: Embedded runtime bundle

Ship a Python runtime plus the engine package and launch script.

Pros:

- more controllable than relying on system Python
- easier to update than a frozen binary

Cons:

- more packaging logic
- still fairly large
- must manage dependency paths carefully

For production-style packaging, Option B or C is usually better. Option A is fine for development QA, where we all pretend environments are stable because otherwise nobody gets anything done.

---

## 13. Python Engine Sidecar Contract

The sidecar must support:

```powershell
python tools/dev/run_engine.py serve --host 127.0.0.1 --port 32187 --token dev-token
```

Production equivalent should use:

- localhost-only host
- generated token
- controlled port or dynamic port
- app data directory
- log directory
- model directory
- database path

### Required engine endpoints

The packaged app relies on:

```txt
GET  /health
GET  /version
GET  /capabilities
GET  /models
POST /models/load
POST /models/unload
POST /analysis
GET  /analysis/{run_id}
GET  /analysis/{run_id}/progress
GET  /reports
GET  /reports/{run_id}
POST /reports/{run_id}/export
DELETE /reports/{run_id}
GET  /review/{run_id}
POST /review/{run_id}/regions
POST /review/{run_id}/findings
POST /review/{run_id}/export-dataset
GET  /settings
PUT  /settings
GET  /doctor/checks
GET  /doctor/system-info
GET  /doctor/logs
```

---

## 14. Localhost and Token Rules

The packaged engine must bind only to:

```txt
127.0.0.1
localhost
::1
```

It must refuse:

```txt
0.0.0.0
LAN IP
public IP
```

Development token:

```txt
dev-token
```

Production token:

```txt
generated per session
```

### Production note

Do not ship a production build that permanently relies on `dev-token`. Use an in-memory generated token passed from Tauri to the sidecar process. The string `dev-token` should be limited to development/QA mode.

A local token is not a magic fortress. It is a reasonable local guardrail. Do not write marketing poetry about it.

---

## 15. Model and Resource Packaging

Include:

```txt
models/configs/
models/model_cards/
datasets/schemas/
datasets/annotation_guides/
storage/migrations/
docs/
```

Optional:

```txt
models/checkpoints/
```

Checkpoint packaging depends on release size, license, and intended capability.

### Model config checklist

Each profile should have:

- `modelId`
- `name`
- `version`
- `task`
- `labels`
- `checkpointPath`
- `checkpointRequired`
- `description`

### Model card checklist

Each shipped checkpoint should include:

- purpose
- labels
- architecture
- training data summary
- limitations
- metrics
- license
- checkpoint hash

---

## 16. SQLite and Migration Packaging

Migrations live in:

```txt
storage/migrations/
```

The packaged engine must be able to find and apply migrations on first launch.

Expected first-run behavior:

```txt
App data directory created
SQLite database created
Migrations applied
Reports/temp/logs/models directories created
Doctor database check passes
```

Do not hardcode a developer machine path like:

```txt
F:\Projects-INT\VeriFrame\...
```

inside production runtime code. Hardcoded dev paths are tiny little sabotage notes to your future self.

---

## 17. Reports, Logs, Temp, and Review Dataset Directories

Runtime directories:

| Directory | Purpose |
|---|---|
| `reports/` | report artifacts and exports |
| `logs/` | local diagnostic logs |
| `temp/` | temporary generated files |
| `models/` | user/local model configs and checkpoints |
| `review-datasets/` | reviewed dataset exports |

The app should create these automatically.

Validation command:

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/doctor/system-info
```

Expected fields:

```txt
appDataDir
databasePath
reportsDir
tempDir
```

---

## 18. Release Smoke Test

After building a packaged desktop release, run this smoke test.

### 18.1 Launch app

Expected:

- window opens
- sidebar visible
- dashboard loads
- no blank screen
- no console crash

### 18.2 Engine health

Expected:

- engine starts or connects
- dashboard/doctor shows engine reachable
- `/health` succeeds if testing engine directly

### 18.3 Import and analyze

Use:

```txt
packages/shared-fixtures/images/sample-receipt.jpg
```

Expected:

- image stages successfully
- Analyze button works
- run completes
- analysis page opens
- quality panel appears
- findings list appears
- regions appear when available

### 18.4 Reports

Expected:

- Reports page lists completed run
- View analysis works
- Review link works
- export buttons work:
  - HTML
  - JSON
  - Evidence Map
  - Audit Receipt
- Delete report works and the card disappears

### 18.5 Review

Expected:

- review session loads
- annotation canvas loads
- regions display if available
- label change queues correction
- save review works
- export dataset works

### 18.6 Doctor

Expected:

- engine check passes
- database check passes
- model paths check passes
- storage permission check passes
- system info appears
- logs appear without secrets

---

## 19. Packaging QA Checklist

Run from the QA plan before release.

| Gate | Command | Expected |
|---|---|---|
| Python tests | `pnpm test:engine` | pass |
| Angular tests | `pnpm --filter @veriframe/ui-angular test` | pass |
| Rust check | `pnpm --filter @veriframe/desktop-tauri check` | pass |
| Angular build | `pnpm --filter @veriframe/ui-angular build` | pass |
| Tauri build check | `pnpm --filter @veriframe/desktop-tauri check` | pass |
| Optional package | `pnpm --filter @veriframe/desktop-tauri build` | installer/exe produced |
| Docs exist | `Test-Path .\docs\packaging.md` | true |
| Workflows exist | `Test-Path .\.github\workflows\ci.yml` | true |

---

## 20. Distribution Artifacts

A release should include:

```txt
VeriFrame-<version>-windows-x64.exe
VeriFrame-<version>-windows-x64.msi      # if generated
checksums.txt
release-notes.md
```

Optional:

```txt
VeriFrame-<version>-portable.zip
```

### Checksums

Generate checksums:

```powershell
Get-FileHash .\path\to\VeriFrame.exe -Algorithm SHA256
Get-FileHash .\path\to\VeriFrame.msi -Algorithm SHA256
```

Store in:

```txt
checksums.txt
```

---

## 21. Release Notes Template

```md
# VeriFrame v0.1.0

## Summary

Local-first desktop release for visual evidence analysis, report generation, audit receipts, and human review.

## Included

- Angular desktop UI
- Tauri native shell
- Python local engine
- SQLite storage
- Image import
- Analysis pipeline
- Report exports
- Audit receipts
- Human review
- Dataset export
- Settings
- Doctor diagnostics

## Known Limitations

- TorchVision model checkpoints may be scaffolded unless shipped separately.
- Audit receipts are local integrity records, not legal notarization.
- Heavy detection models will increase analysis latency.
- GPU acceleration is optional and not required.

## Verification

- Python tests: PASS
- Angular tests: PASS
- Rust check: PASS
- Manual QA: PASS
- Local-only check: PASS
```

---

## 22. Signing and Trust

For serious distribution, sign the installer/executable.

Windows options include:

- code signing certificate
- timestamp server
- signed installer
- signed portable executable where applicable

Unsigned builds are acceptable for internal QA. They are not ideal for public release because Windows SmartScreen will glare at the app like it owes money.

---

## 23. CI Packaging Workflow

Expected workflow file:

```txt
.github/workflows/build-desktop.yml
```

Recommended stages:

```txt
checkout
setup node
setup pnpm
setup rust
setup python
install dependencies
run engine tests
run Angular tests
run Rust check
build Angular
build Tauri package
upload artifacts
```

Optional:

```txt
generate checksums
upload release draft
run smoke test script
```

---

## 24. Troubleshooting

### Engine port already in use

```powershell
Get-NetTCPConnection -LocalPort 32187 -State Listen
$pid = (Get-NetTCPConnection -LocalPort 32187 -State Listen).OwningProcess
Stop-Process -Id $pid -Force
```

### Angular production build fails

Check:

- missing standalone component imports
- missing pipe imports
- broken route imports
- TypeScript strict errors
- stale generated code

### Tauri command not found

Check:

```txt
apps/desktop-tauri/src-tauri/src/lib.rs
apps/desktop-tauri/src-tauri/src/commands/mod.rs
```

The command must be:

- implemented
- exported in `commands/mod.rs`
- imported in `lib.rs`
- registered in `tauri::generate_handler!`

### Python module not found

Check:

- conda env active
- package path bootstrapped
- package installed editable if needed
- sidecar includes engine package
- hidden imports included in frozen package

### Model configs missing

Check:

```txt
models/configs/
```

and the packaged resource mapping in Tauri config.

### Reports page empty

Check:

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/reports
```

If API returns reports but UI does not, inspect Tauri bridge and frontend state.

### Review page empty

Check:

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/review/<RUN_ID>
```

If API returns regions but UI does not, inspect Tauri `review_commands.rs` and UI store mapping.

---

## 25. Production Readiness Checklist

```txt
[✅] All automated tests pass
[✅] Angular production build succeeds
[✅] Tauri Rust check succeeds
[✅] Tauri desktop package builds
[✅] App launches from packaged executable
[✅] Engine starts locally
[✅] Engine binds only to localhost
[✅] Session token is generated in production mode
[✅] No telemetry or analytics SDKs are bundled
[✅] Models/configs are included
[✅] Migrations are included
[✅] Reports can be generated
[✅] Reports can be exported
[✅] Reports can be deleted
[✅] Audit receipts are generated
[✅] Review page loads
[✅] Dataset export works
[✅] Settings persist
[✅] Doctor checks pass
[✅] Logs do not expose tokens
[✅] Release artifacts have checksums
[✅] Release notes are written
```

---

## 26. Authors

**Mahesh Chandra Teja Garnepudi**  
GitHub: `@MaheshChandraTeja`

**Sagarika Srivastava**  
GitHub: `@SagarikaSrivastava`

**Organization**  
Kairais Tech  
`https://www.kairais.com`

---

## 27. Closing Note

Packaging VeriFrame is not just a build command. It is the moment where architecture, privacy promises, local engine behavior, reports, tests, and human review all have to survive contact with a real machine.

The package should launch cleanly, analyze locally, explain itself clearly, and leave behind deterministic evidence artifacts.

No cloud goblin.  
No telemetry gremlin.  
No hidden upload tunnel.  
Just local evidence in, local audit out.

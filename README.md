<h1 align="center">VeriFrame</h1>

<p align="center">
  <b>Local-first visual audit engine for turning images into explainable evidence.</b><br/>
  On-device computer vision. Reviewable reports. Receipt-backed analysis.
</p>

<p align="center">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Angular%2021%20%2B%20Tauri%202-111827">
  <img alt="Engine" src="https://img.shields.io/badge/engine-Python%203.11%20%2B%20TorchVision-0F172A">
  <img alt="Desktop" src="https://img.shields.io/badge/desktop-Rust%20native%20shell-7C2D12">
  <img alt="Storage" src="https://img.shields.io/badge/storage-SQLite%20local-0F766E">
  <img alt="Privacy" src="https://img.shields.io/badge/privacy-no%20cloud%20upload-4C1D95">
  <img alt="Reports" src="https://img.shields.io/badge/reports-HTML%20%2B%20JSON%20%2B%20audit%20receipts-1D4ED8">
  <img alt="Status" src="https://img.shields.io/badge/status-active%20architecture-16A34A">
</p>

<p align="center">
  <a href="#-what-is-veriframe">Overview</a> •
  <a href="#-core-capabilities">Capabilities</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-testing">Testing</a> •
  <a href="#-authors">Authors</a>
</p>

---

## 📌 What Is VeriFrame?

**VeriFrame** is a local desktop system that analyzes real-world images and turns them into structured, reviewable evidence.

In simple terms:

> Upload an image. VeriFrame checks its quality, finds important regions, creates explainable findings, generates evidence artifacts, and records a local audit receipt so the result can be inspected later.

It is built for images where details matter:

- receipts
- product labels
- package photos
- delivery evidence
- damaged goods
- screenshots
- document-like images
- price labels
- device displays
- visual records that need a clear trail

The goal is not just to "run AI on an image." The goal is to make visual analysis **local, explainable, reproducible, and reviewable**.

No mandatory account.  
No required cloud upload.  
No remote black box quietly deciding what the image means.  

Just local analysis, clear evidence, and reports that can be checked.

---

## ✨ Why VeriFrame Exists

Images are often used as proof, but most tools treat them like static files or one-off model inputs.

That creates a trust gap.

If a system says something is damaged, suspicious, unreadable, low-quality, or review-worthy, the next questions are obvious:

- Where exactly is the issue?
- How confident is the system?
- Was the original image good enough?
- Which model or rule produced the result?
- Can a person correct the output?
- Can the report be exported?
- Can the result be reproduced later?
- Did the image stay on the local machine?

VeriFrame is designed around those questions.

It treats visual analysis as a pipeline:

```text
import -> fingerprint -> quality check -> detect -> segment -> explain -> persist -> report -> review
```

That pipeline turns a messy image into a structured local record with evidence, hashes, model references, and correction hooks.

---

## 🧠 Product Philosophy

VeriFrame is built around a few non-negotiables:

- **Local-first:** user images stay on the user's machine.
- **Explainable by default:** findings should say what, where, why, and how confident.
- **Evidence-centered:** reports should include regions, references, artifacts, and hashes.
- **Review-first:** human correction is part of the system, not an afterthought.
- **Contract-driven:** Angular, Tauri, Python, Rust, and tests share stable data shapes.
- **Reproducible:** completed runs should leave enough metadata to be checked later.
- **Practical:** the system should work with ordinary local files and realistic image conditions.

VeriFrame is both a usable product architecture and a systems project around trustworthy visual AI.

---

## 🚀 Core Capabilities

### 🖼️ Local Visual Audit

- Import user-selected image files through the desktop shell
- Validate supported image formats
- Extract metadata such as filename, dimensions, MIME type, size, and EXIF presence
- Compute SHA-256 fingerprints for source images
- Preserve input hashes for audit receipts and report exports

### 📷 Image Quality Analysis

VeriFrame checks whether the image is suitable for analysis before pretending the output is reliable.

- blur score
- brightness estimate
- contrast estimate
- glare risk classification
- resolution adequacy
- user-readable quality warnings

This is important because a bad image can make a good model look foolish.

### 🎯 Detection and Segmentation

The analysis engine is built around TorchVision-ready model stages:

- detection profiles
- segmentation profiles
- classification-ready contracts
- bounding boxes
- optional masks
- labels and categories
- confidence scores
- model references
- review status per detected region

Current model profile families include:

- general object detection
- receipt region detection
- product package detection
- package damage detection
- display panel detection

### 🧾 Evidence Reports

VeriFrame reports are generated from stored analysis data, not temporary UI state.

Supported export formats:

| Format | Purpose |
|---|---|
| HTML | Human-readable visual audit report |
| JSON | Structured report for tooling and integration |
| Evidence Map | Region coordinates, labels, confidence, and evidence references |
| Audit Receipt | Hashes, model refs, config refs, artifacts, and local integrity signature |

### 🔐 Audit Receipts

Each completed run can produce a local integrity receipt containing:

- run id
- receipt id
- generated timestamp
- input hash
- result hash
- config hash
- model references
- artifact hashes
- local signature value

Receipts are not legal notarization. They are local integrity records that make the analysis easier to verify, compare, reproduce, and challenge.

### 🧑‍⚖️ Review and Correction

Model output is not treated as sacred.

VeriFrame supports:

- region correction
- finding review
- review sessions
- accepted/corrected/rejected region states
- dataset export from reviewed runs
- annotation writing for future training loops

The project is designed so human review can improve future model behavior instead of being lost in screenshots and notes.

### 🩺 Doctor and Diagnostics

The Doctor module provides local system checks:

- engine health
- database status
- model path status
- storage permission status
- system information
- local log tailing with token redaction

This keeps the app debuggable when real machines, real files, and real environments get involved.

---

## 🧩 Main Workflows

### 🧾 Receipt and Product Verification

Use VeriFrame to inspect receipts, price labels, item blocks, package regions, and capture quality. The output helps establish whether the image is good enough for later extraction, reconciliation, or review.

### 📦 Package and Delivery Evidence

Analyze package photos for visible labels, product regions, possible damage zones, evidence overlays, and review-worthy areas.

### 🖥️ Screenshot and Document Review

Use visual audit workflows for screenshots, document-like images, forms, labels, and UI captures where regions and quality matter.

### 🔢 Device Display Parsing

Support photos of device panels such as meters, equipment screens, treadmill displays, scale displays, and other physical readouts.

### 🧪 Reviewed Dataset Creation

Corrected analysis runs can be exported into local dataset folders with images, annotations, corrections, finding reviews, and manifests.

---

## 🏗️ Architecture

VeriFrame is a monorepo with a clear split between interface, native boundary, analysis engine, contracts, storage, and reports.

```text
Angular UI
   │
   │ typed services
   ▼
Tauri Rust Desktop Shell
   │
   │ validated commands + local token
   ▼
Python TorchVision Sidecar
   │
   │ repositories + report builder
   ▼
SQLite Storage + Local Report Artifacts
```

### Frontend Layer

The Angular app owns the user-facing product experience:

- dashboard
- import
- analysis view
- review flow
- reports
- model management
- settings
- doctor diagnostics

The UI consumes shared TypeScript contracts from `packages/contracts` and reaches the system through the Tauri service layer.

### Native Desktop Layer

The Tauri shell owns the sensitive desktop boundary:

- file dialog access
- path validation
- local app directory management
- sidecar launch and supervision
- command bridge between Angular and Python
- local-only token handling
- Rust tests for native command behavior

Angular asks. Tauri validates. The filesystem does not become a free-for-all.

### Python Engine Layer

The Python sidecar owns the visual analysis pipeline:

- FastAPI localhost server
- image import
- metadata extraction
- quality checks
- TorchVision model loading
- detection and segmentation stages
- postprocessing
- finding generation
- evidence overlay and crop generation
- report building
- audit receipt generation
- review dataset export

### Storage Layer

SQLite stores the local record of analysis work:

- analysis runs
- images
- findings
- detected regions
- model runs
- report artifacts
- audit logs
- settings
- review corrections
- finding reviews

### Contracts Layer

Shared contracts keep the system stable across languages:

- TypeScript interfaces
- JSON Schemas
- Python Pydantic models
- golden contract tests
- report output tests

Main contract types include:

- `AnalysisRequest`
- `AnalysisResult`
- `ImageMetadata`
- `ImageQualityReport`
- `DetectedRegion`
- `Finding`
- `ModelInfo`
- `AuditReceipt`
- `VisualReport`
- `EvidenceMap`

---

## 🔄 Analysis Pipeline

```text
User-selected image
  -> file validation
  -> metadata extraction
  -> SHA-256 fingerprinting
  -> quality signal computation
  -> model profile selection
  -> detection
  -> segmentation
  -> evidence rendering
  -> region merging
  -> confidence calibration
  -> finding generation
  -> result persistence
  -> report artifact generation
  -> audit receipt generation
  -> review and correction
```

The pipeline is staged so each part can be tested independently and replaced without rewriting the full product.

---

## 📊 Feature Matrix

| Area | Capability | Status |
|---|---|---:|
| Import | image validation, metadata, hashing | ✅ |
| Quality | blur, brightness, contrast, glare, resolution | ✅ |
| Contracts | TypeScript types + JSON Schema + Pydantic | ✅ |
| Engine API | FastAPI localhost sidecar | ✅ |
| Desktop Shell | Tauri command boundary and path guard | ✅ |
| Storage | SQLite migrations and repositories | ✅ |
| Reports | HTML, JSON, evidence map, audit receipt exports | ✅ |
| Review | region corrections and finding reviews | ✅ |
| Dataset Export | reviewed run export pipeline | ✅ |
| Model Profiles | config-driven model registry | ✅ |
| Checkpoints | local checkpoint path support | 🚧 |
| OCR | future workflow expansion | 🧭 |
| Packaged Releases | desktop packaging hardening | 🧭 |

Legend:

- ✅ implemented or scaffolded in the active architecture
- 🚧 integration path exists, broader runtime usage pending
- 🧭 planned direction

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21, TypeScript, RxJS |
| Desktop Runtime | Tauri 2 |
| Native Shell | Rust |
| Engine | Python 3.11 |
| Computer Vision | PyTorch, TorchVision |
| Image Processing | OpenCV, Pillow, NumPy |
| API | FastAPI, Uvicorn |
| Contracts | TypeScript, JSON Schema, Pydantic |
| Storage | SQLite, SQL migrations, repository pattern |
| Reports | HTML exporter, JSON exporter, evidence map exporter |
| Testing | Vitest, Pytest, Rust tests |
| Linting | ESLint, Ruff |
| Formatting | Prettier, Ruff format |
| Package Management | pnpm workspaces, Conda |

---

## 📂 Repository Layout

```text
VeriFrame/
├─ apps/
│  ├─ ui-angular/                 Angular desktop UI
│  │  └─ src/app/
│  │     ├─ core/                 layout, theme, native bridge
│  │     ├─ features/             dashboard, import, analysis, review, reports
│  │     └─ shared/               UI components, pipes, utilities
│  │
│  └─ desktop-tauri/              Tauri desktop shell
│     └─ src-tauri/
│        ├─ src/commands/         native command surface
│        ├─ src/engine/           sidecar client and health logic
│        ├─ src/security/         path guard and token utilities
│        └─ tests/                Rust tests
│
├─ engine/
│  └─ veriframe_core/             Python engine package
│     ├─ veriframe_core/api/      FastAPI routes
│     ├─ veriframe_core/pipeline/ staged analysis pipeline
│     ├─ veriframe_core/models/   registry, cache, loader, warmup
│     ├─ veriframe_core/reports/  report builder and exporters
│     ├─ veriframe_core/storage/  SQLite database and repositories
│     ├─ veriframe_core/review/   correction and dataset export logic
│     └─ tests/                   engine test suite
│
├─ packages/
│  ├─ contracts/                  TypeScript types and JSON Schemas
│  └─ shared-fixtures/            sample images and analysis fixtures
│
├─ models/
│  ├─ configs/                    model profiles
│  ├─ checkpoints/                local checkpoint location
│  └─ model_cards/                model documentation
│
├─ datasets/
│  ├─ schemas/                    annotation schemas
│  ├─ samples/                    sample data area
│  └─ annotation_guides/          labeling guides
│
├─ storage/
│  └─ migrations/                 SQLite schema migrations
│
├─ tests/
│  ├─ golden/                     contract and report-output tests
│  └─ e2e/                        import-analyze-export specs
│
├─ tools/
│  ├─ benchmark/                  storage, pipeline, inference benchmarks
│  ├─ dev/                        local development helpers
│  └─ export/                     ONNX export tooling
│
└─ docs/                          architecture, privacy, testing, performance
```

---

## 📦 Data Model Focus

VeriFrame stores analysis as structured records rather than loose files.

Important entities:

| Entity | Meaning |
|---|---|
| Analysis Run | One submitted visual audit job |
| Image | Source metadata and SHA-256 fingerprint |
| Region | Detected visual area with bbox, label, confidence, and model source |
| Finding | Explainable issue, notice, warning, or recommendation |
| Model Run | Model metadata captured for the analysis |
| Report Artifact | Exported report/evidence file with hash and size |
| Audit Log | Local operational record |
| Review Correction | Human correction for a detected region |
| Finding Review | Human review status for a finding |

This structure is what allows reports, exports, review, and future training datasets to build on the same local truth.

---

## 🔐 Security and Privacy Model

VeriFrame is local-only by design.

### Guarantees

- no required cloud upload
- no telemetry dependency
- no mandatory account
- local engine binds to `127.0.0.1`
- sidecar requests require a session token
- Tauri owns native filesystem access
- Angular does not call Python directly
- reports stay local unless explicitly exported
- audit receipts are generated locally
- logs redact local IPC token values

### Trust Boundaries

```text
User-selected files
   │
   ▼
Tauri path validation boundary
   │
   ▼
Python sidecar processing boundary
   │
   ▼
SQLite/report artifact boundary
```

### What VeriFrame Protects

- receipts
- screenshots
- package and delivery photos
- labels
- documents
- display photos
- generated reports
- extracted metadata
- model outputs
- audit receipts
- reviewed annotations

See:

- `docs/local-only-threat-model.md`
- `docs/security-and-privacy.md`

---

## 🧾 Reports and Audit Artifacts

The HTML report is built to be readable by humans while preserving enough technical detail for inspection.

It includes:

- report title and run identity
- generated timestamp
- highest severity summary
- quality metrics
- findings grouped by severity
- detected region table
- evidence overlay preview when available
- model information
- audit receipt summary
- sanitized raw receipt payload

Export examples:

```text
visual-report.html
visual-report.json
evidence-map.json
audit-receipt.json
```

Reports are generated from persisted result data. If the UI disappears, the report can still be rebuilt from the stored run.

---

## 🧪 Testing Strategy

VeriFrame uses tests across the stack:

| Test Area | Tooling |
|---|---|
| Contract validation | Vitest + AJV |
| Angular components/services | Vitest + Angular test utilities |
| Python engine | Pytest |
| Storage migrations | Pytest |
| Report generation | Pytest + golden tests |
| Tauri commands | Rust tests |
| E2E workflow | import-analyze-export spec |

Representative coverage includes:

- `analysis-result.schema.json` validation
- report output generation
- HTML exporter contract behavior
- audit receipt generation
- image loading and file validation
- quality scoring
- model registry behavior
- database migrations
- Tauri path guard behavior
- report card UI behavior

---

## 🚀 Quick Start

### 1) Prerequisites

- Node.js `20.19.0+`
- pnpm `9+`
- Conda or Miniconda
- Rust stable toolchain
- Tauri v2 system prerequisites for your OS

### 2) Clone

```bash
git clone https://github.com/MaheshChandraTeja/VeriFrame.git
cd VeriFrame
```

### 3) Create Python Environment

```bash
conda env create -f environment.yml
conda activate veriframe
```

If the environment already exists:

```bash
conda env update -f environment.yml --prune
conda activate veriframe
```

### 4) Install Workspace Dependencies

```bash
pnpm install
```

### 5) Run the Angular UI

```bash
pnpm dev:ui
```

The Angular dev server binds to:

```text
http://127.0.0.1:4200
```

### 6) Run the Python Engine

```bash
pnpm dev:engine
```

The local sidecar binds to:

```text
http://127.0.0.1:32187
```

### 7) Run the Desktop App

```bash
pnpm dev:desktop
```

The desktop path is the intended full app flow because Tauri owns native file access, sidecar coordination, and security boundaries.

---

## 🧰 Useful Commands

### Development

```bash
pnpm dev:ui
pnpm dev:engine
pnpm dev:desktop
```

### Build

```bash
pnpm build
pnpm package
```

### Tests

```bash
pnpm test
pnpm test:contracts
pnpm test:ui
pnpm test:engine
pnpm test:desktop
```

### Lint and Format

```bash
pnpm lint
pnpm lint:ts
pnpm lint:py
pnpm format
pnpm format:check
```

### Conda Helpers

```bash
pnpm conda:create
pnpm conda:update
```

### Clean

```bash
pnpm clean
```

---

## 🧪 Testing

### Full Gate

```bash
pnpm test
```

### Contract Tests

```bash
pnpm test:contracts
```

### Angular Tests

```bash
pnpm test:ui
```

### Python Engine Tests

```bash
pnpm test:engine
```

### Desktop Tests

```bash
pnpm test:desktop
```

---

## 🔌 Local API Surface

The Python sidecar exposes a local API behind a session token.

Representative routes:

```text
GET  /health

POST /analysis
GET  /analysis/{run_id}
GET  /analysis/{run_id}/progress
POST /analysis/{run_id}/cancel

GET  /models
POST /models/load
POST /models/unload

GET  /reports
GET  /reports/{run_id}
POST /reports/{run_id}/export

GET  /review/{run_id}
POST /review/{run_id}/regions
POST /review/{run_id}/findings
POST /review/{run_id}/export-dataset

GET  /doctor/checks
GET  /doctor/check-engine
GET  /doctor/check-database
GET  /doctor/check-model-paths
GET  /doctor/check-storage-permissions
GET  /doctor/system-info
GET  /doctor/logs
```

In the desktop app, Angular should go through Tauri commands instead of calling the Python engine directly.

---

## 🤖 Model Profiles

Model configs live in:

```text
models/configs/
```

Model cards live in:

```text
models/model_cards/
```

Current config examples:

| Config | Purpose |
|---|---|
| `general-object-detector.json` | general visual region detection |
| `receipt-region-detector.json` | receipt-oriented region detection |
| `product-package-detector.json` | product/package region detection |
| `package-damage-detector.json` | package damage workflow |
| `display-panel-detector.json` | device display region detection |

Large model checkpoints should be handled as local assets and referenced from model profiles. The audit receipt can record checkpoint hashes when present.

---

## 📚 Documentation

Project docs:

```text
docs/architecture.md
docs/local-only-threat-model.md
docs/security-and-privacy.md
docs/testing.md
docs/performance.md
docs/model-training.md
docs/packaging.md
docs/agent-coding-rules.md
```

Annotation guides:

```text
datasets/annotation_guides/receipt-annotation.md
datasets/annotation_guides/package-damage-annotation.md
```

Model cards:

```text
models/model_cards/general-object-detector.md
models/model_cards/receipt-region-detector.md
```

---

## 📈 Performance Notes

VeriFrame is CPU-first by default.

Performance depends on:

- image size
- selected model
- checkpoint availability
- CPU/GPU device selection
- preprocessing settings
- number of generated artifacts

Benchmark helpers:

```bash
python tools/benchmark/benchmark_storage.py
python tools/benchmark/benchmark_pipeline.py
python tools/benchmark/benchmark_inference.py
```

Current target areas:

- fast image metadata extraction
- sub-second quality checks for typical images
- responsive local report listing
- predictable report generation
- measurable inference latency by model profile

---

## 🧭 Roadmap

### Completed / Implemented Architecture

- [x] Angular app shell
- [x] Tauri desktop shell
- [x] Python FastAPI sidecar
- [x] Shared TypeScript contracts
- [x] JSON Schema validation
- [x] Python Pydantic contract layer
- [x] SQLite migrations and repositories
- [x] image import and hashing
- [x] quality analysis
- [x] staged analysis pipeline
- [x] detection and segmentation stage structure
- [x] evidence maps and overlay infrastructure
- [x] report builder
- [x] HTML and JSON exporters
- [x] audit receipt generation
- [x] model registry and cache
- [x] review correction storage
- [x] dataset export scaffold
- [x] Doctor diagnostics
- [x] benchmark script area

### Next Directions

- [ ] richer trained checkpoint workflows
- [ ] OCR adapter layer for document/display workflows
- [ ] improved visual overlay editing
- [ ] stronger fixture datasets
- [ ] more golden report snapshots
- [ ] deeper benchmark reporting
- [ ] packaged desktop release profiles
- [ ] stronger accessibility pass on UI pages
- [ ] expanded model cards and evaluation notes
- [ ] richer reviewed-dataset training utilities

---

## 🧬 Research Motivation

VeriFrame explores a practical question:

> **How can visual AI systems produce results that are local, explainable, reproducible, and useful under messy real-world image conditions?**

Modern computer vision can detect, classify, and segment impressive things, but many tools fail to explain their outputs in a way people can trust.

VeriFrame approaches the problem as a full system:

- local execution
- explicit trust boundaries
- quality scoring before analysis
- versioned contracts
- model references
- persistent results
- evidence artifacts
- audit receipts
- human review
- dataset export

That makes the project useful as both a practical application and a foundation for studying reliable visual evidence pipelines.

---

## 🏁 Current Status

VeriFrame is in active product architecture development.

The repository already contains:

- multi-app workspace layout
- Angular UI surfaces
- Tauri command layer
- Python engine package
- FastAPI route modules
- SQLite persistence
- report generation code
- review correction pipeline
- model profile scaffolding
- tests across contracts, UI, engine, and desktop layers

Some model-heavy workflows depend on local checkpoints and future training/evaluation work. The architecture is designed so those additions can fit into the existing contracts and reporting pipeline.

---

## 🤝 Contributing

Contributions are welcome in areas that improve reliability, clarity, and real-world usefulness:

- image quality heuristics
- model profile configs
- output parser correctness
- report design
- evidence overlay behavior
- review workflow improvements
- dataset export structure
- storage reliability
- UI accessibility
- fixtures and golden tests
- benchmark coverage
- documentation polish

Suggested workflow:

1. Fork the repository
2. Create a feature branch
3. Keep changes scoped
4. Add tests where practical
5. Include screenshots for UI changes
6. Include sample inputs/outputs for analysis changes
7. Open a pull request with a concise explanation

---

## 👥 Authors

**Mahesh Chandra Teja Garnepudi**  
**Sagarika Srivastava**

Built at **Kairais Tech**

---

## 🏢 About

**Organization**  
**Kairais Tech**  
https://www.kairais.com

VeriFrame follows the same local-first engineering direction as projects such as **Vyre**, **Tempo**, **VeriCent**, **Nodus**, and **ZeroTrace**: practical systems, clear trust boundaries, local data ownership, and evidence-backed outputs.

---

## 📄 License

VeriFrame is proprietary software unless otherwise specified.

Third-party dependencies are licensed under their respective terms and used in compliance.

---

## ⭐ Closing Note

VeriFrame is built around a simple idea:

> **Images used as evidence should be processed locally, explained clearly, reviewed honestly, and backed by records that can be checked later.**

That turns visual AI from a black-box answer into a traceable workflow.

**VeriFrame** — visual evidence, locally framed.

# VeriFrame Architecture

VeriFrame is a local-first desktop visual audit system. It separates UI, native access, ML inference, storage, and contracts into clear modules.

## High-Level Architecture

```txt
Angular UI
   |
   | typed frontend services
   v
Tauri Rust shell
   |
   | secure commands + localhost token
   v
Python TorchVision sidecar
   |
   | repositories + report builder
   v
SQLite storage + local report artifacts
```

## Angular UI

The Angular application owns presentation and user interaction only.

Responsibilities:

- route users through dashboard, import, analysis, reports, models, settings, and doctor pages
- display image previews, analysis results, findings, evidence maps, and report summaries
- call typed Angular services
- never access Python directly
- never access the filesystem directly except through approved Tauri commands

Angular must consume shared TypeScript contracts from `packages/contracts`.

## Tauri Rust Shell

Tauri owns the native desktop boundary.

Responsibilities:

- launching and stopping the Python sidecar
- managing local app directories
- validating file paths
- opening native file dialogs
- exposing secure commands to Angular
- relaying analysis requests to the sidecar
- handling local-only IPC tokens
- collecting desktop diagnostics

Tauri is the gatekeeper. Angular asks. Tauri validates. The filesystem does not become a buffet.

## Python TorchVision Sidecar

The Python sidecar owns visual analysis.

Responsibilities:

- loading TorchVision models
- preprocessing images
- running detection, segmentation, and classification
- generating explainable findings
- building evidence overlays
- writing report artifacts
- producing audit receipts
- exposing localhost-only API endpoints to Tauri

The sidecar must bind only to `127.0.0.1` and must require a per-session token from Tauri.

## SQLite Storage

SQLite stores local application state and analysis data.

Stored entities:

- analysis runs
- image metadata
- detected regions
- findings
- model runs
- audit events
- report artifacts
- settings

SQLite should use WAL mode in later storage modules for better reliability.

## Contract Schemas

Contracts are shared across the system.

```txt
packages/contracts/src/types/
packages/contracts/schemas/
```

The TypeScript contracts define frontend-safe types. JSON Schemas define cross-language validation rules. Python Pydantic models must match these schemas in later modules.

Rules:

- do not duplicate contract shapes in Angular
- do not invent Python-only response fields without updating schemas
- every exported analysis result must validate against `analysis-result.schema.json`
- every audit receipt must validate against `audit-receipt.schema.json`

## Local-Only IPC

Local IPC follows this path:

```txt
Angular service -> Tauri command -> Python localhost sidecar -> Tauri command -> Angular service
```

Direct Angular-to-Python calls are forbidden. This keeps auth, process control, error translation, and path validation inside the native layer.

## Report Pipeline

The report pipeline will follow this flow:

```txt
Image import
  -> metadata extraction
  -> quality analysis
  -> model inference
  -> region postprocessing
  -> finding generation
  -> evidence asset rendering
  -> SQLite persistence
  -> audit receipt generation
  -> JSON/HTML export
```

Reports must be generated from stored analysis data, not ephemeral UI state. If a report cannot be reproduced, it is just a screenshot with delusions of credibility.

## Data Flow

```txt
User selects image
  -> Tauri validates path
  -> Python imports image
  -> image hash is computed
  -> models run locally
  -> results are normalized into shared contracts
  -> results are persisted
  -> evidence assets are generated
  -> audit receipt is generated
  -> Angular displays result
```

## Failure Handling

Failures must be explicit and user-safe.

Examples:

- unsupported image type
- unreadable file
- model missing
- model failed to load
- insufficient memory
- invalid schema
- storage unavailable
- sidecar offline
- analysis cancelled

Errors should include stable machine-readable codes and human-readable messages.

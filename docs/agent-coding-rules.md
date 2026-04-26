# Agent Coding Rules

This project is designed to be implemented by humans and AI coding agents without gradually turning into architectural soup. Follow these rules strictly.

## Rule 1: Reuse Shared Contracts

All cross-module data shapes must come from:

```txt
packages/contracts/src/types
packages/contracts/schemas
```

Do not create duplicate versions of:

- `AnalysisRequest`
- `AnalysisResult`
- `DetectedRegion`
- `AuditReceipt`
- `VisualReport`
- `Finding`
- `StoredAnalysisRun`

If a contract needs to change, update:

1. TypeScript type
2. JSON Schema
3. fixture data
4. tests
5. later Python Pydantic model

## Rule 2: Do Not Hardcode Absolute Paths

Never write paths like:

```txt
C:\Users\...
/Users/name/...
/home/name/...
F:\Projects-INT\...
```

Use app path services, environment variables, or test fixtures.

## Rule 3: Do Not Bypass the Tauri Service Layer

Angular must never call native APIs directly from random components.

Allowed:

```txt
Angular component -> Angular service -> Tauri service wrapper -> Tauri command
```

Forbidden:

```txt
Angular component -> raw invoke()
Angular component -> Python API
Angular component -> filesystem
```

## Rule 4: Do Not Call Python Directly from Angular

Python is controlled by Tauri. Tauri owns the sidecar lifecycle, token, ports, and error translation.

Forbidden:

```txt
fetch("http://127.0.0.1:xxxx/analysis")
```

from Angular components or services unless wrapped through a future approved native bridge. For now, do not do it.

## Rule 5: Do Not Introduce Cloud Dependencies

No cloud SDKs in core modules.

Forbidden by default:

- AWS SDK
- GCP SDK
- Azure SDK
- Sentry
- Segment
- PostHog
- remote logging
- analytics beacons
- hosted model inference APIs

Future cloud integrations, if any, must be optional plugins and disabled by default.

## Rule 6: Write Tests for Every Module

Every module must include tests.

Minimum expectations:

- contract tests
- service tests
- schema validation tests
- pipeline tests
- repository tests
- export tests
- smoke tests

A module without tests is not finished. It is merely confident, which is worse.

## Rule 7: Keep ML Logic Out of UI

Angular displays results. Python produces results.

Do not implement detection, scoring, thresholding, or report generation in Angular.

## Rule 8: Keep Report Generation Out of UI

Reports must be generated from stored analysis data by the engine/report layer.

Angular may trigger exports and display export status.

## Rule 9: Model Outputs Must Be Normalized

Raw TorchVision outputs must be converted into shared contracts before leaving the engine.

No raw tensors, NumPy arrays, or model-specific field names should cross the API boundary.

## Rule 10: Every Analysis Run Needs an Audit Receipt

The audit receipt is part of the product identity.

Every completed analysis run must eventually include:

- run id
- input hash
- result hash
- model refs
- config hash
- artifact hashes
- generated timestamp

## Rule 11: Fail Explicitly

Do not swallow errors.

Use typed error codes for:

- invalid input
- missing file
- unsupported image
- model unavailable
- sidecar offline
- storage failure
- schema validation failure
- cancelled analysis

## Rule 12: Keep Modules Replaceable

The project should allow these replacements later:

- Angular UI can change without rewriting Python
- Python model runner can change without rewriting Angular
- SQLite can be migrated without changing contracts
- Tauri commands can evolve without changing business logic

That is called architecture. Humanity occasionally attempts it.

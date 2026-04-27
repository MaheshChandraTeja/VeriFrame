# Security & Privacy

<p align="center">
  <strong>Local-first visual evidence analysis, built for inspectability, reproducibility, and user control.</strong>
</p>

<p align="center">
  <img alt="Local First" src="https://img.shields.io/badge/Local--First-Yes-0ea5e9?style=for-the-badge">
  <img alt="Telemetry" src="https://img.shields.io/badge/Telemetry-None-111827?style=for-the-badge">
  <img alt="Cloud Upload" src="https://img.shields.io/badge/Cloud%20Upload-No-ef4444?style=for-the-badge">
  <img alt="Audit Receipts" src="https://img.shields.io/badge/Audit%20Receipts-Deterministic-8b5cf6?style=for-the-badge">
  <img alt="Storage" src="https://img.shields.io/badge/Storage-Local%20SQLite-0284c7?style=for-the-badge">
</p>

---

## Overview

**VeriFrame** is designed around one simple security promise:

> Your evidence stays on your machine unless you explicitly export it.

VeriFrame analyzes local images, receipts, product/package photos, device displays, and other visual evidence using a local desktop workflow. The application uses an Angular frontend, a Tauri desktop shell, a Python engine, TorchVision-compatible inference modules, local SQLite storage, and deterministic report generation.

The security model is intentionally boring in the best possible way: no hidden upload path, no background telemetry, no account dependency, no analytics SDK quietly judging your clicks like a nosy raccoon in a trench coat.

VeriFrame treats visual evidence as sensitive by default. Imported files may contain receipts, addresses, order details, device readings, product identifiers, timestamps, or private contextual clues. Because of that, the system is designed around local processing, explicit user actions, reproducible outputs, and inspectable audit trails.

---

## Project Identity

| Field | Details |
|---|---|
| Project | **VeriFrame** |
| Category | Local-first visual evidence analysis and audit tooling |
| Primary focus | Image import, preprocessing, TorchVision inference, human review, audit receipts, reports, and dataset export |
| Privacy posture | Local-only by design |
| Storage model | Local SQLite database + local report artifacts |
| Engine boundary | Local Python engine bound to loopback only |
| Desktop shell | Tauri |
| Frontend | Angular |
| ML stack | Python, PyTorch, TorchVision, OpenCV, Pillow |
| Author | **Mahesh Chandra Teja Garnepudi** |
| GitHub | `@MaheshChandraTeja` |
| Co-author pattern used across related projects | **Sagarika Srivastava** |
| Organization | **Kairais Tech** |
| Website | `https://www.kairais.com` |

---

## Security Principles

VeriFrame follows a small set of non-negotiable design rules.

### 1. Local-first execution

All normal analysis workflows are expected to run locally:

- image import
- image validation
- metadata extraction
- quality checks
- TorchVision inference
- report generation
- audit receipt creation
- review/correction storage
- dataset export

The Python engine is a local process. The desktop shell communicates with it through localhost-only IPC or HTTP loopback.

No normal workflow requires cloud storage, remote inference, online accounts, or background synchronization.

### 2. No telemetry

VeriFrame does not intentionally collect or transmit:

- usage analytics
- clickstream data
- model usage statistics
- image metadata
- crash telemetry
- feature usage events
- report contents
- imported filenames
- audit receipt hashes

If diagnostics are needed, they should be user-triggered and local-first. Logs should be written locally and reviewed/exported only when the user chooses.

### 3. Explicit import, explicit export

VeriFrame should never silently scan arbitrary folders.

The user must explicitly select files, import images, export reports, export datasets, or delete artifacts. This keeps the trust boundary clear and prevents the app from becoming one of those “helpful” tools that starts rummaging through your disk like it pays rent.

### 4. Deterministic evidence records

Every completed analysis run should be reproducible enough to inspect later.

A run should preserve:

- input hash
- normalized image metadata
- selected workflow
- model profile references
- analysis configuration hash
- generated findings
- detected regions
- generated artifacts
- report paths
- audit receipt
- local integrity signature

The goal is not legal notarization. VeriFrame audit receipts are local integrity records, not a magical courtroom wand. They help show what the system saw, what it produced, and which artifacts belong to the run.

### 5. Human review over blind automation

Model output is treated as evidence support, not unquestionable truth.

VeriFrame includes review flows so users can:

- inspect detected regions
- correct labels
- adjust bounding boxes
- mark findings as valid or false positive
- save corrections
- export reviewed data for future fine-tuning

Machine output should be editable and explainable. Otherwise we are just building a confident screenshot oracle, and society has suffered enough.

---

## Local-Only Architecture

```txt
┌─────────────────────────────────────────────────────────────┐
│                         User Device                         │
│                                                             │
│  ┌───────────────────┐       ┌───────────────────────────┐  │
│  │ Angular Frontend  │       │ Tauri Desktop Shell        │  │
│  │ UI only           │──────▶│ Native boundary + IPC      │  │
│  └───────────────────┘       └─────────────┬─────────────┘  │
│                                            │                │
│                                            ▼                │
│                            ┌───────────────────────────┐    │
│                            │ Python VeriFrame Engine   │    │
│                            │ 127.0.0.1 only            │    │
│                            └─────────────┬─────────────┘    │
│                                          │                  │
│        ┌─────────────────────────────────┼───────────────┐  │
│        ▼                                 ▼               ▼  │
│  Local SQLite DB                 Local Reports       Local Models
│  runs, findings,                 HTML/JSON,          TorchVision
│  reviews, logs                   overlays, crops     checkpoints
└─────────────────────────────────────────────────────────────┘
```

### Component boundaries

| Component | Responsibility | Security rule |
|---|---|---|
| Angular UI | Display state, collect user actions, render pages | Must not directly access Python or arbitrary filesystem paths |
| Tauri shell | Own native commands, path validation, IPC, app directories | Must validate paths and mediate privileged actions |
| Python engine | Import, preprocess, analyze, report, store, review | Must bind only to loopback and require a local session token |
| SQLite database | Persist runs, findings, regions, reviews, settings | Must remain local |
| Reports directory | Store generated evidence artifacts | Must remain local unless user exports |
| Models directory | Store model configs/checkpoints | Must not trigger automatic remote downloads without explicit user action |

---

## Network Security

### Default network posture

VeriFrame should not initiate external network traffic during normal use.

Allowed local communication:

```txt
127.0.0.1:<engine-port>
localhost:<engine-port>
::1:<engine-port>
```

Disallowed by default:

```txt
0.0.0.0 binding
LAN binding
public network binding
cloud upload endpoints
analytics endpoints
remote OCR services
remote inference services
background update beacons
```

### Python engine binding

The Python engine must refuse to bind to non-localhost interfaces. Valid hosts:

- `127.0.0.1`
- `localhost`
- `::1`

Invalid hosts:

- `0.0.0.0`
- LAN IP addresses
- public IP addresses

### Local session token

Tauri and the Python engine should use a per-session local API token.

The token is not meant to be a substitute for OS process isolation, but it prevents casual cross-process calls from unauthenticated local clients. It should be generated at startup, kept in memory, and rotated when the engine restarts.

Development builds may use a fixed token such as `dev-token`, but production builds should use a generated session token.

---

## Data Inventory

VeriFrame may process or store the following local data.

| Data type | Example | Stored? | Notes |
|---|---|---:|---|
| Imported image path | `sample-receipt.jpg` | Yes | Stored to link run records to local evidence |
| Image hash | SHA-256 | Yes | Used for identity and audit receipts |
| Image metadata | dimensions, MIME type, size | Yes | EXIF is excluded unless enabled |
| EXIF metadata | camera/device/location-like metadata | Optional | Should be disabled by default |
| Quality report | blur, brightness, glare, contrast | Yes | Used for analysis confidence |
| Detected regions | boxes, labels, confidence | Yes | Editable during review |
| Segmentation masks | encoded mask metadata | Optional | Only when relevant |
| Findings | severity, recommendation, evidence refs | Yes | User-facing review output |
| Model info | profile ID, version, device | Yes | Needed for reproducibility |
| Audit receipt | input hash, result hash, config hash | Yes | Local integrity record |
| Report artifacts | HTML, JSON, overlays, crops | Yes | Stored under local reports directory |
| Review corrections | changed labels, boxes, decisions | Yes | Used for review and dataset export |
| Logs | local diagnostic events | Yes | Should avoid secrets and raw image content |

---

## What VeriFrame Does Not Collect

VeriFrame should not collect or transmit:

- personal account information
- emails
- passwords
- payment credentials
- analytics identifiers
- advertising identifiers
- raw imported images to external services
- report artifacts to external services
- model outputs to external services
- usage telemetry
- hidden crash dumps
- hidden diagnostics packages

If a future feature needs external connectivity, it must be opt-in, clearly documented, and disabled by default.

---

## File Handling

### Supported image input

The importer should only accept explicit visual evidence formats such as:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`
- `.bmp`
- `.tif`
- `.tiff`

### File validation requirements

Before analysis, the importer should validate:

- file exists
- file is readable
- file extension is supported
- MIME type is supported
- file size is within limit
- image can be opened safely
- image dimensions are valid
- image is not obviously corrupted
- image path is allowed by path guard rules

### Unsafe path handling

The desktop shell must reject:

- directory traversal tricks
- system directories where possible
- unsupported file types
- suspicious path aliases
- paths outside explicit user selection
- attempts to overwrite protected app files

The frontend should never bypass Tauri path validation. Angular does not get to become a filesystem goblin.

---

## Metadata & EXIF Policy

Image metadata can be sensitive. EXIF may include camera details, timestamps, orientation, software tags, and in some cases location-like data.

VeriFrame should follow this policy:

| Metadata | Default behavior |
|---|---|
| Filename | Stored |
| File size | Stored |
| Width/height | Stored |
| MIME type | Stored |
| SHA-256 hash | Stored |
| EXIF presence flag | Stored |
| Raw EXIF values | Not stored unless user enables it |
| GPS metadata | Never included in reports by default |
| Device/camera metadata | Excluded by default |
| Report display of EXIF | Off by default |

If EXIF inclusion is enabled, the UI should clearly tell the user what will be included before export.

---

## Storage Security

### Local database

VeriFrame uses local SQLite storage for:

- analysis runs
- images
- findings
- regions
- model runs
- audit logs
- report artifacts
- review corrections
- finding reviews
- settings

Recommended SQLite settings:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

### App data directories

Typical storage layout:

```txt
VeriFrame/
  veriframe.sqlite3
  models/
  reports/
    <run_id>/
      analysis-result.json
      evidence-overlay.png
      evidence-map.json
      region-crops/
      exports/
  temp/
  logs/
```

### Encryption status

Current storage is local-first. If full database encryption is not enabled yet, the project should state that clearly.

Recommended future hardening:

- SQLCipher or platform-backed encryption
- OS keychain integration
- encrypted report bundles
- encrypted dataset exports
- passphrase-protected portable archives

No security document should pretend encryption exists before it does. That is not optimism; that is compliance cosplay.

---

## Audit Receipts

Audit receipts are VeriFrame’s local integrity record for an analysis run.

A receipt should include:

| Field | Purpose |
|---|---|
| `receiptId` | Unique receipt identifier |
| `runId` | Links receipt to analysis run |
| `generatedAt` | Creation timestamp |
| `inputHash` | SHA-256 hash of original input |
| `resultHash` | Hash of normalized analysis result |
| `configHash` | Hash of relevant analysis settings |
| `modelRefs` | Model profile/version references |
| `artifactHashes` | Hashes for overlays, reports, maps, crops |
| `signature.algorithm` | Local integrity algorithm |
| `signature.value` | Deterministic local signature/hash |

### What audit receipts prove

Audit receipts help show:

- which input file was analyzed
- which local artifacts belong to the run
- whether report artifacts changed
- which model/config references were used
- when the local run was generated

### What audit receipts do not prove

Audit receipts do **not** prove:

- legal authenticity
- external notarization
- identity of the user
- that an image was not edited before import
- that a third party independently verified the evidence

That distinction matters. “Local integrity” and “legal notarization” are not the same animal, no matter how many badges we stick on the README.

---

## Model Security

### Model loading

Model profiles should define:

- model ID
- task type
- expected labels
- input size
- preprocessing rules
- checkpoint path
- checkpoint requirement
- output parser

### Checkpoint policy

Model checkpoints should be treated as executable-adjacent artifacts. They are not plain images or text files.

Recommended policy:

- Load checkpoints only from the configured local models directory.
- Do not auto-download checkpoints in production without explicit user approval.
- Store model metadata and version information.
- Hash checkpoints before use.
- Record model references in audit receipts.
- Fail clearly when checkpoints are missing.
- Prefer safe serialization formats where practical.

### CPU-first execution

VeriFrame should work without CUDA. GPU acceleration may be optional, but security and reliability must not depend on GPU availability.

Default device behavior:

```txt
auto → CPU fallback
cpu  → always CPU
cuda → use only if available
mps  → use only if available
```

Hardware optimism is how laptops become space heaters. Let us not.

---

## Human Review & Dataset Export

Review features are security-sensitive because they turn model outputs into curated training data.

The review workflow should preserve:

- original region
- corrected region
- label before/after
- bounding box before/after
- finding decision
- reviewer identity or local reviewer label
- timestamps
- notes
- run ID
- source image hash

Dataset export must be explicit.

A dataset export should include:

```txt
dataset/
  images/
  annotations/
  manifest.json
  README.md
```

The manifest should include:

- export timestamp
- source run IDs
- image hashes
- annotation schema version
- label set
- correction counts
- tool version

Dataset export should never silently upload to training services. Export is a local file operation unless the user explicitly moves it elsewhere.

---

## Logging Policy

Logs are useful. Logs are also where privacy goes to die if nobody is watching the adults.

VeriFrame logs should include:

- stage names
- run IDs
- status changes
- engine health checks
- validation failures
- local error summaries
- timing metrics
- safe path summaries where needed

VeriFrame logs should avoid:

- raw image contents
- full EXIF dumps
- secrets
- tokens
- unnecessarily long absolute paths in user-facing errors
- personal data extracted from receipts or images
- model inputs or outputs unless explicitly in a local debug artifact

### Token handling

Local engine tokens should not be printed in normal logs.

Development logs may show that authentication is enabled, but not the token value.

---

## Deletion & Cleanup

Users should be able to delete:

- staged import items
- generated reports
- report artifacts
- temporary files
- local review corrections where supported
- exported datasets where managed by the app

Cleanup tooling should be idempotent and clear.

Good cleanup output:

```txt
VeriFrame cleanup complete
============================

Selected targets:
  - Reports: C:\Users\<user>\AppData\Roaming\VeriFrame\reports

Already clean:
  - Reports: C:\Users\<user>\AppData\Roaming\VeriFrame\reports

Status: OK
```

Bad cleanup output:

```txt
{'removed': ['some/path']}
```

Technically valid. Emotionally abandoned.

---

## Threat Model

### In scope

| Threat | Mitigation |
|---|---|
| Accidental upload of evidence | No cloud upload paths in normal workflows |
| Telemetry leakage | No telemetry dependencies or analytics calls |
| Unsafe file import | Extension, MIME, size, and image validation |
| Directory traversal | Tauri path guard and explicit file selection |
| Review data corruption | SQLite persistence and deterministic correction records |
| Report tampering after generation | Artifact hashes and audit receipts |
| Missing model checkpoints | Clear model registry status and loadability checks |
| Engine exposed to LAN | Localhost-only binding |
| UI directly accessing Python/filesystem | Tauri service boundary |
| Silent EXIF leakage | EXIF excluded by default |
| Overconfident model output | Human review and correction workflow |

### Out of scope

| Threat | Current position |
|---|---|
| Compromised operating system | Cannot defend against fully compromised host |
| Malicious user with filesystem access | Local files can be modified by users with sufficient OS permissions |
| Legal notarization | Audit receipts are local integrity records only |
| Advanced malware inspection of app memory | Not currently addressed |
| Enterprise key management | Future hardening area |
| Full database encryption | Future hardening area unless explicitly implemented |

---

## Secure Development Rules

Contributors and coding agents should follow these rules:

1. Do not introduce cloud dependencies.
2. Do not add telemetry SDKs.
3. Do not call Python directly from Angular.
4. Do not bypass the Tauri service layer.
5. Do not hardcode absolute developer paths.
6. Do not expose the Python engine beyond localhost.
7. Do not log secrets or local session tokens.
8. Do not include raw EXIF in reports by default.
9. Do not treat heuristic/model output as final truth.
10. Do not invent new contract shapes without updating schemas and tests.
11. Do not make destructive actions silent.
12. Do not hide failures behind generic “something went wrong” messages.
13. Do not add background network behavior without a documented security review.
14. Do not store sensitive temporary artifacts longer than necessary.
15. Do not ship demo shortcuts as production behavior. The goblin must remain in the lab.

---

## Security Testing Checklist

### Local-only checks

```powershell
Get-NetTCPConnection -LocalPort 32187 -State Listen
```

Expected:

```txt
LocalAddress = 127.0.0.1
State        = Listen
```

The engine should not listen on:

```txt
0.0.0.0
LAN IP
public IP
```

### Source scan for network usage

```powershell
Get-ChildItem `
  .\apps\ui-angular\src, .\apps\desktop-tauri\src-tauri\src, .\engine\veriframe_core\veriframe_core `
  -Recurse -File |
  Select-String `
    -SimpleMatch `
    -Pattern "127.0.0.1","localhost","fetch(","axios","http://","https://"
```

Acceptable hits:

- local loopback calls
- Angular local HTTP client setup
- documentation strings
- local engine health checks

Suspicious hits:

- external API URLs
- analytics URLs
- remote upload endpoints
- tracking scripts

### Telemetry scan

```powershell
Get-ChildItem . -Recurse -File |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\|\\target\\|\\dist\\|\\.angular\\|\\release\\|\\preview\\|\\.git\\|__pycache__"
  } |
  Select-String `
    -SimpleMatch `
    -Pattern "telemetry","analytics","sentry","posthog","segment","amplitude","google-analytics","gtag","mixpanel"
```

Acceptable hits:

- docs saying telemetry is forbidden
- settings showing telemetry disabled
- local-only threat model references

Suspicious hits:

- imports from analytics SDKs
- initialization calls
- external beacon calls
- API keys
- `navigator.sendBeacon`

### Engine health check

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/health
```

Expected:

```json
{
  "ok": true,
  "engineName": "veriframe-core",
  "directoriesReady": true
}
```

### Capability check

```powershell
curl.exe -H "x-veriframe-token: dev-token" http://127.0.0.1:32187/capabilities
```

Expected posture:

```json
{
  "localOnly": true,
  "telemetry": false,
  "cloudUpload": false
}
```

### Report deletion check

```powershell
$reports = Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:32187/reports" `
  -Headers @{ "x-veriframe-token" = "dev-token" }

$runId = $reports.reports[0].runId

Invoke-RestMethod `
  -Method Delete `
  -Uri "http://127.0.0.1:32187/reports/$runId" `
  -Headers @{ "x-veriframe-token" = "dev-token" }
```

Expected:

```txt
ok = True
reportDirectory = True
```

---

## Dependency Policy

Dependencies should be chosen carefully.

### Allowed dependency traits

- maintained
- documented
- widely used
- compatible with local-first architecture
- no mandatory account requirement
- no automatic telemetry
- no hidden network behavior
- license-compatible

### Dependency review questions

Before adding a package, ask:

1. Does it make network requests?
2. Does it collect telemetry?
3. Does it require an account?
4. Does it write files outside app directories?
5. Does it handle sensitive input?
6. Does it have native code?
7. Does it affect startup or runtime permissions?
8. Does it change the trust boundary?

If nobody can answer those questions, the dependency can wait outside until it learns manners.

---

## Known Limitations

VeriFrame should be honest about what is implemented and what is planned.

| Area | Current posture |
|---|---|
| Local-only processing | Core design requirement |
| Telemetry | Not allowed |
| Cloud upload | Not part of normal workflow |
| Audit receipts | Local integrity records |
| Legal notarization | Not provided |
| Model explainability | Findings and regions are inspectable; deeper attribution is future work |
| Database encryption | Recommended future hardening unless implemented |
| Checkpoint verification | Recommended hardening |
| Secure deletion | OS-level secure deletion is not guaranteed |
| Multi-user isolation | Depends on OS user account isolation |
| Malicious local admin | Out of scope |

---

## Future Hardening Roadmap

The following improvements would strengthen VeriFrame further:

- encrypted SQLite database
- platform keychain integration
- encrypted report bundles
- signed model manifests
- checkpoint hash verification before loading
- user-visible dependency inventory
- SBOM generation
- reproducible build notes
- sandbox permission documentation
- automated privacy scan in CI
- local-only network regression tests
- stricter delete endpoint behavior for missing run IDs
- redaction options for exported reports
- configurable log retention
- secure temporary file cleanup
- optional passphrase-protected dataset exports

---

## Maintainer Notes

Security and privacy are not decorative sections for VeriFrame. They are part of the architecture.

This project’s related work follows a consistent pattern:

- local-first processing
- explicit import/export
- deterministic reports
- explainable output
- review-first UX
- platform boundaries
- strong modular separation
- clear degradation when a feature is unsupported

That pattern is intentional. Users should be able to inspect the system’s behavior and understand why it produced a result. No fog machine. No black box theater. No “trust us bro” pipeline wearing a lab coat.

---

## Authors

**Mahesh Chandra Teja Garnepudi**  
GitHub: `@MaheshChandraTeja`

**Sagarika Srivastava**  
GitHub: `@SagarikaSrivastava`

**Organization**  
Kairais Tech  
`https://www.kairais.com`

---

## Closing Note

VeriFrame exists because visual evidence is becoming easier to generate, harder to trust, and more important to verify.

The answer is not blind automation. The answer is local processing, inspectable evidence, deterministic reports, human review, and clear security boundaries.

Receipts for reality. Locally. Clearly. Without uploading your life to somebody else’s dashboard.

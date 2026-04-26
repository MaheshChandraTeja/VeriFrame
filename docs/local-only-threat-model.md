# Local-Only Threat Model

VeriFrame is designed as a local-first application. This document defines what that means, what threats are considered, and what engineering rules protect the user.

## Privacy Commitments

VeriFrame must follow these commitments:

- no cloud upload
- no telemetry
- all inference local
- sidecar binds to `127.0.0.1` only
- temporary files are cleaned
- reports stay on device
- model outputs stay on device
- audit receipts are generated locally
- user images are not copied outside the configured local app data directory unless explicitly exported

## Assets Protected

VeriFrame handles sensitive visual data, including:

- receipts
- product labels
- delivery photos
- screenshots
- documents
- device displays
- possible personal information visible in images
- generated reports
- audit receipts
- extracted metadata
- model outputs

## Trust Boundaries

```txt
User-selected files
   |
   v
Tauri path validation boundary
   |
   v
Python sidecar processing boundary
   |
   v
SQLite/report artifact boundary
```

Angular is not trusted with raw filesystem power. Tauri validates access before passing work to Python.

## Network Policy

The default network policy is simple:

```txt
No external network access is required.
```

The Python sidecar must bind only to:

```txt
127.0.0.1
```

The sidecar must not bind to:

```txt
0.0.0.0
public LAN IPs
remote interfaces
```

Any future feature requiring internet access must be:

- optional
- disabled by default
- isolated behind a clear permission boundary
- documented in this threat model
- tested so local-only mode remains intact

## Telemetry Policy

VeriFrame must not collect or transmit telemetry.

Forbidden by default:

- usage analytics
- crash uploads
- model result uploads
- image uploads
- report uploads
- hidden update pings
- remote logging

Local logs are allowed. They must avoid storing unnecessary sensitive data.

## Temporary Files

Temporary files must be written only to approved local temp directories.

Rules:

- use per-run temp directories
- clean temp files after successful analysis
- clean temp files after failed analysis when safe
- never write temp files to the source image directory without explicit user export
- do not include raw EXIF metadata in exported reports unless enabled

## Reports

Reports stay on device.

Report exports are user-initiated. The application may write to:

- configured reports directory
- user-selected export directory
- app data report cache

Reports must not be sent anywhere.

## Audit Receipts

Audit receipts are local integrity records. They are not legal notarization, blockchain magic, or mystical proof emitted by a cryptographic wizard in a hoodie.

They should include:

- input hash
- result hash
- artifact hashes
- model references
- config hash
- generated timestamp

## Threats Considered

### Accidental Cloud Leakage

Mitigation:

- no cloud SDKs in core modules
- no telemetry dependencies
- docs and tests enforce local-only assumptions

### Unsafe File Access

Mitigation:

- Tauri path guard
- no direct Angular filesystem access
- explicit user selection

### Sidecar Exposure

Mitigation:

- bind only to `127.0.0.1`
- per-session token
- reject unauthenticated local requests

### Sensitive Metadata Exposure

Mitigation:

- EXIF stripped from reports by default
- metadata fields made explicit
- user-controlled export behavior

### Reproducibility Loss

Mitigation:

- shared contracts
- model cards
- config hashes
- audit receipts
- deterministic report builders where possible

## Out of Scope

Module 1 does not yet implement:

- encryption at rest
- sandboxing
- signed model downloads
- secure auto-updates
- PDF export
- legal evidence notarization

These may be added later, but the local-only foundation must not be weakened.

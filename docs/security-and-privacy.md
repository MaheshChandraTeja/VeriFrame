# Security and Privacy

VeriFrame is local-only by design.

## Guarantees

- No cloud upload
- No telemetry
- Engine binds to `127.0.0.1`
- Tauri owns filesystem access
- Angular does not call Python directly
- Audit receipts remain local

## Limitations

Audit receipts are integrity records, not legal notarization. They prove local consistency of hashes and artifacts. They do not prove universal truth, because sadly cryptography has not eliminated human nonsense.

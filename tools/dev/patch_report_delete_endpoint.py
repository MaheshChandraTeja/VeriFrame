from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
target = ROOT / "engine" / "veriframe_core" / "veriframe_core" / "api" / "routes_reports.py"

if not target.exists():
    raise SystemExit(f"routes_reports.py not found: {target}")

text = target.read_text(encoding="utf-8")

if "async def delete_report" in text:
    print("delete_report endpoint already present.")
    raise SystemExit(0)

snippet = '''
@router.delete("/{run_id}")
async def delete_report(request: Request, run_id: str) -> dict[str, object]:
    """Delete a persisted report run and generated report artifacts."""
    import shutil
    import sqlite3
    from pathlib import Path

    settings = request.app.state.settings
    deleted: dict[str, object] = {
        "databaseRows": {},
        "reportDirectory": False,
        "memoryCache": False,
    }

    if hasattr(request.app.state, "analysis_results"):
        deleted["memoryCache"] = request.app.state.analysis_results.pop(run_id, None) is not None

    database_path = getattr(settings, "database_path", None)
    if database_path and Path(database_path).exists():
        conn = sqlite3.connect(str(database_path))
        try:
            for table in [
                "report_artifacts",
                "audit_logs",
                "model_runs",
                "regions",
                "findings",
                "images",
                "analysis_runs",
            ]:
                try:
                    cursor = conn.execute(f"DELETE FROM {table} WHERE run_id = ?", (run_id,))
                    deleted["databaseRows"][table] = cursor.rowcount
                except sqlite3.OperationalError:
                    deleted["databaseRows"][table] = "table_missing_or_no_run_id"
            conn.commit()
        finally:
            conn.close()

    reports_dir = getattr(settings, "reports_dir", None)
    if reports_dir:
        report_dir = Path(reports_dir) / run_id
        if report_dir.exists():
            shutil.rmtree(report_dir)
            deleted["reportDirectory"] = True

    return {
        "ok": True,
        "runId": run_id,
        "deleted": deleted,
    }
'''

target.write_text(text.rstrip() + "\n\n" + snippet.lstrip(), encoding="utf-8")
print(f"Patched {target}")

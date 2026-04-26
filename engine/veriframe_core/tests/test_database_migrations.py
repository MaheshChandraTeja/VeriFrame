from pathlib import Path

from veriframe_core.storage.database import Database


def test_database_migrations_create_tables(tmp_path: Path) -> None:
    db = Database(database_path=tmp_path / "test.sqlite3")
    applied = db.initialize()

    assert "001_init" in applied
    assert "002_indexes" in applied

    with db.connection() as connection:
        tables = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }

    assert "analysis_runs" in tables
    assert "images" in tables
    assert "findings" in tables
    assert "regions" in tables
    assert "audit_logs" in tables
    assert "report_artifacts" in tables


def test_database_migrations_are_idempotent(tmp_path: Path) -> None:
    db = Database(database_path=tmp_path / "test.sqlite3")
    first = db.initialize()
    second = db.initialize()

    assert first
    assert second == []

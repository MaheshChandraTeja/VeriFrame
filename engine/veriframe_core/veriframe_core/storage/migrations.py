from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import sqlite3


@dataclass(frozen=True, slots=True)
class Migration:
    version: str
    path: Path
    sql: str


class MigrationRunner:
    def __init__(self, migrations_dir: str | Path | None = None) -> None:
        self.migrations_dir = Path(migrations_dir) if migrations_dir else default_migrations_dir()

    def load_migrations(self) -> list[Migration]:
        if not self.migrations_dir.exists():
            raise FileNotFoundError(f"Migration directory does not exist: {self.migrations_dir}")

        migrations: list[Migration] = []

        for path in sorted(self.migrations_dir.glob("*.sql")):
            version = path.stem
            migrations.append(
                Migration(
                    version=version,
                    path=path,
                    sql=path.read_text(encoding="utf-8"),
                )
            )

        return migrations

    def apply(self, connection: sqlite3.Connection) -> list[str]:
        ensure_schema_table(connection)
        applied = applied_versions(connection)
        newly_applied: list[str] = []

        for migration in self.load_migrations():
            if migration.version in applied:
                continue

            connection.executescript(migration.sql)
            connection.execute(
                "INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)",
                (migration.version, now_iso()),
            )
            newly_applied.append(migration.version)

        connection.commit()
        return newly_applied


def ensure_schema_table(connection: sqlite3.Connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        """
    )
    connection.commit()


def applied_versions(connection: sqlite3.Connection) -> set[str]:
    rows = connection.execute("SELECT version FROM schema_migrations").fetchall()
    return {str(row[0]) for row in rows}


def default_migrations_dir() -> Path:
    repo_root = find_repo_root()
    return repo_root / "storage" / "migrations"


def find_repo_root() -> Path:
    current = Path(__file__).resolve()

    for parent in current.parents:
        if (parent / "package.json").exists() and (parent / "engine").exists():
            return parent

    return current.parents[4]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

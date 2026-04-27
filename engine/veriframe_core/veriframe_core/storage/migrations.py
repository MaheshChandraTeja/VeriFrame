from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import os
import sqlite3
import sys


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
    override = os.getenv("VERIFRAME_MIGRATIONS_DIR")
    if override:
        return Path(override).expanduser().resolve()

    candidates: list[Path] = []

    # PyInstaller onefile mode extracts bundled data into sys._MEIPASS.
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass:
        meipass_root = Path(meipass).resolve()
        candidates.extend(
            [
                meipass_root / "storage" / "migrations",
                meipass_root / "resources" / "storage" / "migrations",
            ]
        )

    # Packaged portable/install mode may place resources beside the executable.
    if getattr(sys, "frozen", False):
        exe_dir = Path(sys.executable).resolve().parent
        candidates.extend(
            [
                exe_dir / "resources" / "storage" / "migrations",
                exe_dir / "storage" / "migrations",
            ]
        )

    # Dev/source-tree mode.
    repo_root = find_repo_root()
    candidates.extend(
        [
            repo_root / "storage" / "migrations",
            Path.cwd().resolve() / "resources" / "storage" / "migrations",
            Path.cwd().resolve() / "storage" / "migrations",
        ]
    )

    for candidate in candidates:
        if candidate.exists() and candidate.is_dir():
            return candidate

    searched = "\n".join(f"  - {candidate}" for candidate in candidates)
    raise FileNotFoundError(
        "Migration directory does not exist. Searched:\n"
        f"{searched}"
    )


def find_repo_root() -> Path:
    search_roots: list[Path] = []

    try:
        search_roots.append(Path(__file__).resolve())
    except Exception:
        pass

    try:
        search_roots.append(Path.cwd().resolve())
    except Exception:
        pass

    for start in search_roots:
        for parent in [start, *start.parents]:
            if (parent / "package.json").exists() and (parent / "engine").exists():
                return parent

    return Path.cwd().resolve()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

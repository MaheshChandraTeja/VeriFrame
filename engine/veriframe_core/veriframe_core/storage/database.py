from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
import sqlite3
from typing import Iterator

from veriframe_core.config import EngineSettings, load_settings
from veriframe_core.storage.migrations import MigrationRunner


class Database:
    def __init__(
        self,
        database_path: str | Path | None = None,
        *,
        settings: EngineSettings | None = None,
        migrations_dir: str | Path | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        self.database_path = Path(database_path) if database_path else self.settings.database_path
        if self.database_path is None:
            raise ValueError("database_path could not be resolved.")

        self.database_path = self.database_path.expanduser().resolve()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.migration_runner = MigrationRunner(migrations_dir)

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute("PRAGMA synchronous = NORMAL")
        connection.execute("PRAGMA busy_timeout = 5000")
        return connection

    def initialize(self) -> list[str]:
        with self.connection() as connection:
            return self.migration_runner.apply(connection)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        connection = self.connect()
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

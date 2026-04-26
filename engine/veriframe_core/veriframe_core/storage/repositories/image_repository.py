from __future__ import annotations

import sqlite3

from veriframe_core.contracts.analysis import ImageMetadata


class ImageRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def upsert(self, *, run_id: str, image: ImageMetadata) -> None:
        self.connection.execute(
            """
            INSERT INTO images (
                image_id,
                run_id,
                file_name,
                sha256,
                mime_type,
                width,
                height,
                size_bytes,
                exif_present
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(image_id) DO UPDATE SET
                run_id = excluded.run_id,
                file_name = excluded.file_name,
                sha256 = excluded.sha256,
                mime_type = excluded.mime_type,
                width = excluded.width,
                height = excluded.height,
                size_bytes = excluded.size_bytes,
                exif_present = excluded.exif_present
            """,
            (
                image.imageId,
                run_id,
                image.fileName,
                image.sha256,
                image.mimeType,
                image.width,
                image.height,
                image.sizeBytes,
                1 if image.exifPresent else 0,
            ),
        )

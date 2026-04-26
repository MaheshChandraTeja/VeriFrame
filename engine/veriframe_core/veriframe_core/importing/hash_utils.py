from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageOps


def compute_sha256(path: str | Path, *, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def compute_bytes_sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def compute_perceptual_hash_placeholder(image: Image.Image, *, hash_size: int = 8) -> str:
    grayscale = ImageOps.grayscale(image)
    resized = grayscale.resize((hash_size, hash_size), Image.Resampling.LANCZOS)
    pixels = list(resized.getdata())
    average = sum(pixels) / len(pixels)
    bits = "".join("1" if pixel >= average else "0" for pixel in pixels)
    return f"{int(bits, 2):0{hash_size * hash_size // 4}x}"

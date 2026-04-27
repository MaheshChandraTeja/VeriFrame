import os
import sys
from pathlib import Path

def _add_dll_dir(path: Path) -> None:
    try:
        if path.exists() and path.is_dir():
            os.environ["PATH"] = str(path) + os.pathsep + os.environ.get("PATH", "")
            if hasattr(os, "add_dll_directory"):
                os.add_dll_directory(str(path))
    except Exception:
        pass

if hasattr(sys, "_MEIPASS"):
    root = Path(sys._MEIPASS)

    _add_dll_dir(root)

    for child in root.rglob("*"):
        if child.is_dir():
            try:
                if any(p.suffix.lower() == ".dll" for p in child.iterdir() if p.is_file()):
                    _add_dll_dir(child)
            except Exception:
                pass
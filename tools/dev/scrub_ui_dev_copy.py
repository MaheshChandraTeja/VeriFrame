from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP = ROOT / "apps" / "ui-angular" / "src" / "app"

REPLACEMENTS = {
    "Module 2": "Dashboard",
    "Module 5 · Import workspace": "Import workspace",
    "Module 5": "Import workspace",
    "Module 6": "Model registry",
    "Module 7": "Analysis workspace",
    "Module 8": "Reports",
    "Module 9": "Review workspace",
    "Module 10 · Doctor": "System diagnostics",
    "Module 10": "Local settings",
}

def main() -> int:
    changed: list[Path] = []

    for path in APP.rglob("*"):
        if path.suffix not in {".ts", ".html", ".scss"}:
            continue

        original = path.read_text(encoding="utf-8")
        updated = original

        for before, after in REPLACEMENTS.items():
            updated = updated.replace(before, after)

        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed.append(path)

    for path in changed:
        print(path.relative_to(ROOT))

    print({"changed": len(changed)})
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

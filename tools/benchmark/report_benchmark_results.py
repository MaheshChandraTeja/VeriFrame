from __future__ import annotations

import argparse
import json
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate benchmark markdown from JSON files.")
    parser.add_argument("inputs", nargs="+")
    parser.add_argument("--output", default="benchmark-results.md")
    args = parser.parse_args(argv)

    rows = []
    for item in args.inputs:
        payload = json.loads(Path(item).read_text(encoding="utf-8"))
        rows.append(payload)

    lines = ["# VeriFrame Benchmark Results", "", "| Benchmark | Iterations | Summary |", "|---|---:|---|"]
    for row in rows:
        lines.append(
            f"| {row.get('benchmark')} | {row.get('iterations')} | `{json.dumps(row, sort_keys=True)[:180]}` |"
        )

    Path(args.output).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

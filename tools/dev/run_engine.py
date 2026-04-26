from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    repo_root = Path(__file__).resolve().parents[2]
    engine_src = repo_root / "engine" / "veriframe_core"

    if str(engine_src) not in sys.path:
        sys.path.insert(0, str(engine_src))

    from veriframe_core.cli import main as cli_main

    return cli_main(sys.argv[1:])


if __name__ == "__main__":
    raise SystemExit(main())

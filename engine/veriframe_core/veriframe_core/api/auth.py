from __future__ import annotations

import hmac

from fastapi import Header, Request

from veriframe_core.errors import UnauthorizedError


def validate_local_token(expected: str | None, candidate: str | None) -> bool:
    if not expected:
        return True

    if not candidate:
        return False

    return hmac.compare_digest(expected, candidate)


async def require_local_token(
    request: Request,
    x_veriframe_token: str | None = Header(default=None),
) -> None:
    expected = getattr(request.app.state, "session_token", None)

    if not validate_local_token(expected, x_veriframe_token):
        raise UnauthorizedError("Invalid or missing VeriFrame local session token.")

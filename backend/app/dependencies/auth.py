"""
Clerk JWT verification dependency for FastAPI.

Usage
-----
    from app.dependencies.auth import get_optional_user, get_required_user

    # Route that works for guests AND signed-in users:
    @router.post("/generate")
    async def generate(req: ..., user: Optional[dict] = Depends(get_optional_user)):
        clerk_user_id = user["sub"] if user else None

    # Route that requires a signed-in user:
    @router.get("/me")
    async def me(user: dict = Depends(get_required_user)):
        return {"clerk_user_id": user["sub"]}

Token payload fields (subset)
------------------------------
    sub          — Clerk user ID  (e.g. "user_2abc...")
    email        — primary email address
    exp / iat    — standard JWT expiry / issued-at timestamps
"""

import logging
import os
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWKS client — initialised once, caches signing keys automatically
# ---------------------------------------------------------------------------
_CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
_JWKS_URL: str = "https://api.clerk.com/v1/jwks"

_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    """Return the singleton PyJWKClient, creating it on first call."""
    global _jwks_client
    if _jwks_client is None:
        if not _CLERK_SECRET_KEY:
            logger.warning(
                "CLERK_SECRET_KEY is not set — JWT verification will always fail."
            )
        _jwks_client = PyJWKClient(
            _JWKS_URL,
            headers={"Authorization": f"Bearer {_CLERK_SECRET_KEY}"},
        )
    return _jwks_client


# ---------------------------------------------------------------------------
# Internal decode helper
# ---------------------------------------------------------------------------

def _decode_token(token: str) -> dict:
    """
    Verify and decode a Clerk-issued JWT.
    Raises jwt.PyJWTError (or subclass) on any verification failure.
    """
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        # Clerk JWTs may not include an 'aud' claim — skip that check
        options={"verify_aud": False},
    )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict]:
    """
    Returns the decoded Clerk JWT payload when a valid Bearer token is present.
    Returns None when no token is provided (guest / unauthenticated request).
    Never raises — invalid tokens are treated as "no user".
    """
    if not credentials:
        return None
    try:
        return _decode_token(credentials.credentials)
    except Exception as exc:
        logger.warning("JWT verification failed: %s", exc)
        return None


async def get_required_user(
    user: Optional[dict] = Depends(get_optional_user),
) -> dict:
    """
    Returns the decoded Clerk JWT payload when a valid Bearer token is present.
    Raises HTTP 401 when no valid token is provided.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

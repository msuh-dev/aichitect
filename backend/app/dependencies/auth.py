"""
Clerk JWT verification dependency for FastAPI.

How verification works
──────────────────────
1. Decode the JWT WITHOUT signature verification to read the `iss` (issuer) claim.
2. Derive the public JWKS URL: {iss}/.well-known/jwks.json
   — This endpoint is publicly accessible, no secret key required.
   — It is always correct for both development and production Clerk instances.
3. Fetch (and cache) the signing key matching the token's `kid` header.
4. Verify the token properly with the fetched key.

This approach is more reliable than using api.clerk.com/v1/jwks because
the issuer URL is embedded in every token and always points to the right
key set for the instance that issued it.

Usage
─────
    from app.dependencies.auth import get_optional_user, get_required_user

    # Works for both guests and signed-in users:
    @router.post("/generate")
    async def generate(req: ..., user: Optional[dict] = Depends(get_optional_user)):
        clerk_user_id = user["sub"] if user else None

    # Requires a signed-in user — raises 401 otherwise:
    @router.get("/me")
    async def me(user: dict = Depends(get_required_user)):
        return {"clerk_user_id": user["sub"]}
"""

import logging
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# Cache JWKS clients by issuer URL — one client per Clerk instance
_jwks_clients: dict[str, PyJWKClient] = {}


def _get_jwks_client(issuer: str) -> PyJWKClient:
    """Return (and cache) a PyJWKClient for the given issuer's public JWKS URL."""
    if issuer not in _jwks_clients:
        jwks_url = f"{issuer}/.well-known/jwks.json"
        logger.info("Creating JWKS client for: %s", jwks_url)
        _jwks_clients[issuer] = PyJWKClient(jwks_url)
    return _jwks_clients[issuer]


def _decode_token(token: str) -> dict:
    """
    Verify and decode a Clerk-issued JWT.

    Step 1 — Peek at the payload (no signature check) to extract `iss`.
    Step 2 — Fetch the correct public JWKS for that issuer.
    Step 3 — Verify the signature and return the full payload.

    Raises jwt.PyJWTError (or subclass) on any failure.
    """
    # Step 1: read issuer without verifying signature
    unverified = jwt.decode(
        token,
        options={"verify_signature": False},
        algorithms=["RS256"],
    )
    issuer: str = unverified.get("iss", "")
    if not issuer:
        raise ValueError("JWT is missing the 'iss' (issuer) claim")

    # Step 2: get the signing key from the issuer's public JWKS
    client = _get_jwks_client(issuer)
    signing_key = client.get_signing_key_from_jwt(token)

    # Step 3: full verification
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options={"verify_aud": False},  # Clerk JWTs have no 'aud' claim by default
    )


# ── FastAPI dependencies ──────────────────────────────────────────────────────

_bearer = HTTPBearer(auto_error=False)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict]:
    """
    Returns the decoded Clerk JWT payload when a valid Bearer token is present.
    Returns None for unauthenticated requests — never raises.
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
    Returns the decoded Clerk JWT payload.
    Raises HTTP 401 when no valid token is present.
    """
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

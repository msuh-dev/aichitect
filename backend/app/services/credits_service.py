"""
Credit management service.

Flow for each generation request
─────────────────────────────────
1. check_credits()   — read DB, return whether user can generate + how
2. [generation runs]
3. deduct_credit()   — subtract one credit only after success

Separating check from deduct means a failed generation never costs a credit.

Credit priority order
─────────────────────
1. Admin bypass (ADMIN_EMAIL env var) — unlimited, no DB write
2. Purchased credits — decremented first when > 0
3. Free tier — incremented free_credits_used up to FREE_DESIGNS_PER_MONTH
4. None — return 402

Email handling
──────────────
The standard Clerk session JWT only contains `sub` (user ID). Email is NOT
included by default. On first sight of a new user we call the Clerk REST API
to fetch their primary email and store it in Supabase. All subsequent requests
just look it up from the DB — the Clerk API is called at most once per user.
"""

import os
import logging
from datetime import datetime
from typing import Tuple

import httpx

from app.services.supabase_service import get_supabase

logger = logging.getLogger(__name__)

FREE_CREDITS_PER_MONTH: int = int(os.getenv("FREE_DESIGNS_PER_MONTH", "3"))
CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")

# Comma-separated list of admin emails, e.g. "alice@example.com,bob@example.com"
# Admins bypass all credit checks and show "Admin · ∞" in the header badge.
_raw_admins = os.getenv("ADMIN_EMAILS", os.getenv("ADMIN_EMAIL", ""))
ADMIN_EMAILS: set[str] = {e.strip().lower() for e in _raw_admins.split(",") if e.strip()}


# ── Clerk API helper ──────────────────────────────────────────────────────────

def _fetch_email_from_clerk(clerk_user_id: str) -> str:
    """
    Fetch the user's primary email from the Clerk REST API.
    Called exactly once per new user — result is stored in Supabase.
    Returns empty string on any failure (non-fatal).
    """
    if not CLERK_SECRET_KEY:
        return ""
    try:
        resp = httpx.get(
            f"https://api.clerk.com/v1/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            timeout=5.0,
        )
        data = resp.json()
        primary_id = data.get("primary_email_address_id", "")
        for email_obj in data.get("email_addresses", []):
            if email_obj["id"] == primary_id:
                return email_obj["email_address"]
    except Exception as exc:
        logger.warning("Could not fetch email from Clerk API for %s: %s", clerk_user_id, exc)
    return ""


# ── DB helpers ────────────────────────────────────────────────────────────────

def _current_month() -> str:
    return datetime.now().strftime("%Y-%m")


def _ensure_user(clerk_user_id: str) -> str:
    """
    Guarantee a row exists in the `users` table for this Clerk user.
    Returns the stored email (fetched from Clerk API on first creation).

    Self-healing: if the row exists but email is empty (can happen if the
    Clerk API call failed on first creation), fetch and store it now.
    """
    sb = get_supabase()
    existing = (
        sb.table("users")
        .select("email")
        .eq("clerk_user_id", clerk_user_id)
        .execute()
    )
    if existing.data:
        stored_email = existing.data[0]["email"]
        if stored_email:
            return stored_email
        # Row exists but email is blank — heal it
        email = _fetch_email_from_clerk(clerk_user_id)
        if email:
            sb.table("users").update({"email": email}).eq(
                "clerk_user_id", clerk_user_id
            ).execute()
            logger.info("Healed missing email for user: %s (%s)", clerk_user_id, email)
        return email

    # First time we've seen this user — fetch their email from Clerk
    email = _fetch_email_from_clerk(clerk_user_id)
    sb.table("users").insert(
        {"clerk_user_id": clerk_user_id, "email": email}
    ).execute()
    logger.info("Created new user in DB: %s (%s)", clerk_user_id, email or "no email")
    return email


def _get_or_create_credits(clerk_user_id: str) -> dict:
    """
    Fetch the user_credits row, creating it with free-tier defaults if absent.
    Also resets free_credits_used when a new calendar month begins.
    """
    sb = get_supabase()
    current_month = _current_month()

    result = (
        sb.table("user_credits")
        .select("*")
        .eq("clerk_user_id", clerk_user_id)
        .execute()
    )

    if not result.data:
        insert = sb.table("user_credits").insert(
            {
                "clerk_user_id": clerk_user_id,
                "purchased_credits": 0,
                "free_credits_used": 0,
                "free_reset_month": current_month,
            }
        ).execute()
        return insert.data[0]

    credits = result.data[0]

    # Monthly rollover
    if credits["free_reset_month"] != current_month:
        updated = (
            sb.table("user_credits")
            .update({"free_credits_used": 0, "free_reset_month": current_month})
            .eq("clerk_user_id", clerk_user_id)
            .execute()
        )
        credits = updated.data[0]
        logger.info("Monthly reset applied for user: %s", clerk_user_id)

    return credits


# ── Public API ────────────────────────────────────────────────────────────────

def check_credits(clerk_user_id: str) -> Tuple[bool, str, dict]:
    """
    Determine whether the user may generate.

    Returns
    ───────
    (allowed, credit_type, credits_record)

    allowed      bool   — True if generation is permitted
    credit_type  str    — "admin" | "purchased" | "free" | "none"
    credits_record dict — the raw user_credits row (empty dict for admin)
    """
    # Ensure user exists and get their stored email for the admin check
    email = _ensure_user(clerk_user_id)

    # Admin bypass
    if email.lower() in ADMIN_EMAILS:
        return True, "admin", {}

    credits = _get_or_create_credits(clerk_user_id)

    if credits["purchased_credits"] > 0:
        return True, "purchased", credits

    free_remaining = FREE_CREDITS_PER_MONTH - credits["free_credits_used"]
    if free_remaining > 0:
        return True, "free", credits

    return False, "none", credits


def deduct_credit(clerk_user_id: str, credit_type: str, credits: dict) -> None:
    """
    Subtract one credit. Call this ONLY after a successful generation.
    """
    if credit_type == "admin":
        return

    sb = get_supabase()

    if credit_type == "purchased":
        sb.table("user_credits").update(
            {"purchased_credits": credits["purchased_credits"] - 1}
        ).eq("clerk_user_id", clerk_user_id).execute()

    elif credit_type == "free":
        sb.table("user_credits").update(
            {"free_credits_used": credits["free_credits_used"] + 1}
        ).eq("clerk_user_id", clerk_user_id).execute()

    logger.info(
        "Credit deducted — user: %s  type: %s",
        clerk_user_id, credit_type,
    )


def get_credits_summary(clerk_user_id: str) -> dict:
    """
    Return plan name + credit counts for the header badge.
    """
    email = _ensure_user(clerk_user_id)

    if email.lower() in ADMIN_EMAILS:
        return {"plan": "Admin", "credits_remaining": 999, "credits_total": 999}

    credits = _get_or_create_credits(clerk_user_id)

    if credits["purchased_credits"] > 0:
        return {
            "plan": "Paid",
            "credits_remaining": credits["purchased_credits"],
            "credits_total": credits["purchased_credits"],
        }

    remaining = max(0, FREE_CREDITS_PER_MONTH - credits["free_credits_used"])
    return {
        "plan": "Free",
        "credits_remaining": remaining,
        "credits_total": FREE_CREDITS_PER_MONTH,
    }

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
"""

import os
import logging
from datetime import datetime
from typing import Tuple

from app.services.supabase_service import get_supabase

logger = logging.getLogger(__name__)

FREE_CREDITS_PER_MONTH: int = int(os.getenv("FREE_DESIGNS_PER_MONTH", "3"))
ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _current_month() -> str:
    return datetime.now().strftime("%Y-%m")


def _ensure_user(clerk_user_id: str, email: str) -> None:
    """Insert user row if it doesn't exist yet. Safe to call on every request."""
    sb = get_supabase()
    existing = (
        sb.table("users")
        .select("clerk_user_id")
        .eq("clerk_user_id", clerk_user_id)
        .execute()
    )
    if not existing.data:
        sb.table("users").insert(
            {"clerk_user_id": clerk_user_id, "email": email}
        ).execute()
        logger.info("Created new user: %s", clerk_user_id)


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
        # First generation ever — create the record
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

    # Monthly rollover — reset free usage when a new month begins
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

def check_credits(
    clerk_user_id: str, email: str
) -> Tuple[bool, str, dict]:
    """
    Determine whether the user may generate.

    Returns
    ───────
    (allowed, credit_type, credits_record)

    allowed      bool   — True if generation is permitted
    credit_type  str    — "admin" | "purchased" | "free" | "none"
    credits_record dict — the raw user_credits row (empty dict for admin)
    """
    # ── Admin bypass ──────────────────────────────────────────────────────────
    if ADMIN_EMAIL and email == ADMIN_EMAIL:
        return True, "admin", {}

    # ── DB lookup ─────────────────────────────────────────────────────────────
    _ensure_user(clerk_user_id, email)
    credits = _get_or_create_credits(clerk_user_id)

    if credits["purchased_credits"] > 0:
        return True, "purchased", credits

    free_remaining = FREE_CREDITS_PER_MONTH - credits["free_credits_used"]
    if free_remaining > 0:
        return True, "free", credits

    return False, "none", credits


def deduct_credit(
    clerk_user_id: str, credit_type: str, credits: dict
) -> None:
    """
    Subtract one credit. Call this ONLY after a successful generation.

    credit_type must be the value returned by check_credits().
    """
    if credit_type == "admin":
        return  # Admins are never charged

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
        "Credit deducted — user: %s  type: %s  purchased_before: %s  free_used_before: %s",
        clerk_user_id,
        credit_type,
        credits.get("purchased_credits", "n/a"),
        credits.get("free_credits_used", "n/a"),
    )


def get_credits_summary(clerk_user_id: str, email: str) -> dict:
    """
    Return plan name + credit counts for the header badge.

    Response shape
    ──────────────
    {
        "plan":              str  — display name ("Free", "Paid", "Admin")
        "credits_remaining": int  — credits left right now
        "credits_total":     int  — total for this period / pack
    }
    """
    if ADMIN_EMAIL and email == ADMIN_EMAIL:
        return {"plan": "Admin", "credits_remaining": 999, "credits_total": 999}

    _ensure_user(clerk_user_id, email)
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

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies.auth import get_optional_user, get_required_user
from app.models.design import (
    DesignRequest,
    DesignResponse,
    SuggestRequirementsRequest,
    SuggestRequirementsResponse,
)
from app.services.ai_service import get_ai_service, is_credits_exhausted
from app.services.credits_service import (
    check_credits,
    deduct_credit,
    get_credits_summary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["design"])

MODEL_DISPLAY_NAMES = {
    "claude-haiku-4-5-20251001": "Claude Haiku",
    "claude-sonnet-4-6": "Claude Sonnet",
    "claude-opus-4-6": "Claude Opus",
}


def _get_model_label() -> str:
    provider = os.getenv("AI_PROVIDER", "claude").lower()
    if provider == "mock":
        return "Mock mode"
    if is_credits_exhausted():
        return "Mock mode"
    model = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
    return MODEL_DISPLAY_NAMES.get(model, model)


# ── Generate ──────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=DesignResponse)
async def generate_design(
    request: DesignRequest,
    user: dict = Depends(get_required_user),
):
    """
    Generate a system design document.

    Requires authentication. Credit is deducted AFTER a successful generation
    so that a failed AI call never costs the user a credit.
    """
    clerk_user_id: str = user["sub"]

    # ── Credit check ──────────────────────────────────────────────────────────
    try:
        allowed, credit_type, credits_record = check_credits(clerk_user_id)
    except Exception as exc:
        logger.error("Credit check failed for %s: %s", clerk_user_id, exc)
        raise HTTPException(
            status_code=503,
            detail="Credit service temporarily unavailable. Please try again.",
        )

    if not allowed:
        raise HTTPException(
            status_code=402,
            detail="No credits remaining. Visit /pricing to get more.",
        )

    # ── Generation ────────────────────────────────────────────────────────────
    try:
        ai_service = get_ai_service()
        content = ai_service.generate_design(request)
    except EnvironmentError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error("Design generation error for %s: %s", clerk_user_id, exc)
        raise HTTPException(
            status_code=500, detail="Design generation failed. Please try again."
        )

    # ── Deduct credit (only on success) ───────────────────────────────────────
    try:
        deduct_credit(clerk_user_id, credit_type, credits_record)
    except Exception as exc:
        # Log but don't fail the request — user already got their design
        logger.error(
            "Credit deduction failed for %s (type=%s): %s",
            clerk_user_id, credit_type, exc,
        )

    return DesignResponse(
        success=True, content=content, model_used=_get_model_label()
    )


# ── Suggest requirements ──────────────────────────────────────────────────────

@router.post("/suggest-requirements", response_model=SuggestRequirementsResponse)
async def suggest_requirements(
    request: SuggestRequirementsRequest,
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    Suggest form field values from a system description.
    No credit cost — this is a lightweight helper call.
    """
    try:
        ai_service = get_ai_service()
        suggestion = ai_service.suggest_requirements(request.system_name)
        return SuggestRequirementsResponse(
            success=True,
            requirements=suggestion["requirements"],
            daily_active_users=suggestion.get("daily_active_users"),
            read_write_ratio=suggestion.get("read_write_ratio"),
            geographic_scope=suggestion.get("geographic_scope"),
            reasoning=suggestion.get("reasoning"),
        )
    except EnvironmentError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error("Suggestion error: %s", exc)
        raise HTTPException(
            status_code=500, detail="Suggestion failed. Please try again."
        )


# ── Credits ───────────────────────────────────────────────────────────────────

@router.get("/credits")
async def get_credits(user: Optional[dict] = Depends(get_optional_user)):
    """
    Return the authenticated user's current plan and remaining credits.
    Returns guest defaults when called without a valid token.
    """
    if not user:
        return {"plan": "Guest", "credits_remaining": 0, "credits_total": 0}

    clerk_user_id: str = user["sub"]

    try:
        return get_credits_summary(clerk_user_id)
    except Exception as exc:
        logger.error("Credits summary failed for %s: %s", clerk_user_id, exc)
        # Graceful fallback — badge will still render with defaults
        return {"plan": "Free", "credits_remaining": 0, "credits_total": 3}


# ── Utility ───────────────────────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "AIchitect API"}


@router.get("/config")
async def get_config():
    return {"model_label": _get_model_label()}

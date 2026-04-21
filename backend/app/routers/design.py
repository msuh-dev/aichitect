import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.dependencies.auth import get_optional_user
from app.models.design import DesignRequest, DesignResponse, SuggestRequirementsRequest, SuggestRequirementsResponse
from app.services.ai_service import get_ai_service, is_credits_exhausted

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
    # If Claude was configured but billing ran out, show the fallback label so
    # the user knows why they're seeing generic output.
    if is_credits_exhausted():
        return "Mock mode"
    model = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
    return MODEL_DISPLAY_NAMES.get(model, model)


@router.post("/generate", response_model=DesignResponse)
async def generate_design(
    request: DesignRequest,
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    Accept a structured design request and return a full system design document.
    `user` is the decoded Clerk JWT payload when the caller is authenticated,
    or None for guest/unauthenticated requests.
    Credit enforcement will be added in Phase 4.
    """
    # Phase 4 will call: clerk_user_id = user["sub"] if user else None
    try:
        ai_service = get_ai_service()
        content = ai_service.generate_design(request)
        return DesignResponse(success=True, content=content, model_used=_get_model_label())
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Design generation failed: {str(e)}")


@router.post("/suggest-requirements", response_model=SuggestRequirementsResponse)
async def suggest_requirements(
    request: SuggestRequirementsRequest,
    user: Optional[dict] = Depends(get_optional_user),
):
    """
    Given a system description, suggest values for all form fields plus a brief reasoning string.
    Always uses Haiku internally — fast and cheap for this classification task.
    `user` is available here for future rate-limiting; not enforced yet.
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
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestion failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "AIchitect API"}


@router.get("/config")
async def get_config():
    """Return the current AI provider configuration so the UI can display it."""
    return {"model_label": _get_model_label()}


@router.get("/credits")
async def get_credits(user: Optional[dict] = Depends(get_optional_user)):
    """
    Return the authenticated user's current plan and remaining credits.

    Phase 4 will replace the stub values below with a real Supabase lookup.
    For now this returns free-tier defaults, which is accurate for all new
    accounts (no one has purchased credits yet).

    Response shape:
        plan              str   — display name of the active plan
        credits_remaining int   — credits available right now
        credits_total     int   — total credits for the current period/pack
    """
    if not user:
        # Unauthenticated — guest users share the free allowance by IP (Phase 4)
        return {"plan": "Guest", "credits_remaining": 3, "credits_total": 3}

    # Authenticated but credits not yet tracked in DB — return free-tier defaults.
    # Phase 4 will: look up user_credits in Supabase, return real values.
    return {"plan": "Free", "credits_remaining": 3, "credits_total": 3}

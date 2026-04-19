import os
from fastapi import APIRouter, HTTPException
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
async def generate_design(request: DesignRequest):
    """
    Accept a structured design request and return a full system design document.
    """
    try:
        ai_service = get_ai_service()
        content = ai_service.generate_design(request)
        return DesignResponse(success=True, content=content, model_used=_get_model_label())
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Design generation failed: {str(e)}")


@router.post("/suggest-requirements", response_model=SuggestRequirementsResponse)
async def suggest_requirements(request: SuggestRequirementsRequest):
    """
    Given a system description, suggest values for all form fields plus a brief reasoning string.
    Always uses Haiku internally — fast and cheap for this classification task.
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

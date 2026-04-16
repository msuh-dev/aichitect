from fastapi import APIRouter, HTTPException
from app.models.design import DesignRequest, DesignResponse
from app.services.ai_service import get_ai_service

router = APIRouter(prefix="/api", tags=["design"])


@router.post("/generate", response_model=DesignResponse)
async def generate_design(request: DesignRequest):
    """
    Accept a structured design request and return a full system design document.
    """
    try:
        ai_service = get_ai_service()
        content = ai_service.generate_design(request)
        return DesignResponse(success=True, content=content)
    except EnvironmentError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Design generation failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "AIchitect API"}

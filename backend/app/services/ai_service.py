"""
AI Service — Abstraction Layer
------------------------------
All AI calls go through this module. The underlying model (Claude, Llama, etc.)
can be swapped by changing the implementation class without touching any other
part of the application.

Migration path:
  MVP    → ClaudeAIService  (Anthropic API, per-token billing)
  Growth → OllamaAIService  (self-hosted open-source LLM, fixed server cost)
  Scale  → FineTunedService (fine-tuned model on own data)
"""

import os
from abc import ABC, abstractmethod
from pathlib import Path

import anthropic

from app.models.design import DesignRequest


# ---------------------------------------------------------------------------
# Abstract base — all AI providers must implement this interface
# ---------------------------------------------------------------------------

class AIService(ABC):
    @abstractmethod
    def generate_design(self, request: DesignRequest) -> str:
        """
        Given a DesignRequest, return the full system design as a markdown string.
        Raises an exception on failure.
        """
        pass


# ---------------------------------------------------------------------------
# Claude implementation (MVP)
# ---------------------------------------------------------------------------

class ClaudeAIService(AIService):
    MODEL = "claude-sonnet-4-6"
    MAX_TOKENS = 4096

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY is not set in environment variables.")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.system_prompt = self._load_system_prompt()

    def _load_system_prompt(self) -> str:
        prompt_path = Path(__file__).parent.parent / "prompts" / "system_prompt.txt"
        return prompt_path.read_text(encoding="utf-8")

    def _build_user_message(self, request: DesignRequest) -> str:
        req_labels = {
            "high_availability": "High Availability",
            "low_latency": "Low Latency",
            "strong_consistency": "Strong Consistency",
            "eventual_consistency": "Eventual Consistency",
            "real_time_updates": "Real-Time Updates",
            "file_media_storage": "File / Media Storage",
            "search": "Search",
            "geolocation": "Geolocation",
        }
        requirements_str = ", ".join(
            req_labels.get(r, r) for r in request.requirements
        ) or "None specified"

        ratio_labels = {
            "mostly_reads": "Mostly reads (90% read / 10% write)",
            "balanced": "Balanced (50% read / 50% write)",
            "mostly_writes": "Mostly writes (10% read / 90% write)",
        }

        scope_labels = {
            "single_region": "Single region",
            "multi_region": "Multi-region",
            "global": "Global",
        }

        return f"""Please design the following system:

**System:** {request.system_name}
**Daily Active Users:** {request.daily_active_users.value}
**Read/Write Ratio:** {ratio_labels.get(request.read_write_ratio.value, request.read_write_ratio.value)}
**Key Requirements:** {requirements_str}
**Geographic Scope:** {scope_labels.get(request.geographic_scope.value, request.geographic_scope.value)}
**Additional Context:** {request.additional_context or "None"}

Generate the full system design document following the structure in your instructions."""

    def generate_design(self, request: DesignRequest) -> str:
        message = self.client.messages.create(
            model=self.MODEL,
            max_tokens=self.MAX_TOKENS,
            system=self.system_prompt,
            messages=[
                {"role": "user", "content": self._build_user_message(request)}
            ],
        )
        return message.content[0].text


# ---------------------------------------------------------------------------
# Factory — the rest of the app uses this, never the concrete classes directly
# ---------------------------------------------------------------------------

def get_ai_service() -> AIService:
    """
    Return the configured AI service instance.
    Change the provider here when migrating (e.g. MVP → Growth).
    """
    provider = os.getenv("AI_PROVIDER", "claude").lower()

    if provider == "claude":
        return ClaudeAIService()

    # Future providers — uncomment when ready:
    # if provider == "ollama":
    #     return OllamaAIService()

    raise ValueError(f"Unknown AI provider: '{provider}'. Set AI_PROVIDER in your .env file.")

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

Cost control:
  Set AI_PROVIDER=mock in .env to use MockAIService (zero API cost — for frontend development).
  Set CLAUDE_MODEL=claude-haiku-4-5-20251001 for cheap dev/testing (default).
  Set CLAUDE_MODEL=claude-sonnet-4-6 for production-quality output.
"""

import json
import logging
import os
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

from app.models.design import DesignRequest

# The exact set of keys the frontend knows about.
# Responses from Claude are validated against this — any unknown key is dropped.
VALID_REQUIREMENT_KEYS = {
    "high_availability", "low_latency", "strong_consistency",
    "eventual_consistency", "real_time_updates", "file_media_storage",
    "search", "geolocation",
}

# ---------------------------------------------------------------------------
# Billing guard — module-level flag
# ---------------------------------------------------------------------------
# Set to True the first time a billing / credit-exhaustion error is detected.
# Once set, ALL subsequent Claude API calls are transparently redirected to
# MockAIService so the app keeps working (with limited output) instead of
# returning 500 errors to the user.
#
# The flag lives at the module level so it persists across requests within a
# single server process. On Render free tier the process restarts after ~15 min
# of inactivity, which naturally resets the flag — meaning the app will retry
# real API calls after a restart (useful when the developer tops up credits).
# ---------------------------------------------------------------------------

_credits_exhausted: bool = False
_credits_exhausted_at: float = 0.0
# After this interval the flag auto-clears so the app retries the real API
# (useful when the developer tops up Anthropic credits without restarting).
_CREDITS_RETRY_AFTER_SECS: int = 1800  # 30 minutes


def is_credits_exhausted() -> bool:
    """Return True if a billing error has been detected in this server process."""
    global _credits_exhausted, _credits_exhausted_at
    if _credits_exhausted and (time.time() - _credits_exhausted_at) > _CREDITS_RETRY_AFTER_SECS:
        _credits_exhausted = False
        logger.info(
            "BILLING: Credit exhaustion flag cleared after %d s — will retry Anthropic API.",
            _CREDITS_RETRY_AFTER_SECS,
        )
    return _credits_exhausted


def _mark_credits_exhausted() -> None:
    global _credits_exhausted, _credits_exhausted_at
    _credits_exhausted = True
    _credits_exhausted_at = time.time()
    logger.warning(
        "BILLING: Anthropic API credit exhaustion detected. "
        "Falling back to MockAIService for %d minutes. "
        "Top up your credits at https://console.anthropic.com to resume sooner.",
        _CREDITS_RETRY_AFTER_SECS // 60,
    )


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

    @abstractmethod
    def suggest_requirements(self, system_name: str) -> dict:
        """
        Given a system description, return a dict with suggested values for all
        form fields plus a brief reasoning string. Keys:
          requirements      list[str]  — subset of VALID_REQUIREMENT_KEYS
          daily_active_users str       — e.g. "10M"
          read_write_ratio   str       — e.g. "balanced"
          geographic_scope   str       — e.g. "global"
          reasoning          str       — 2–3 sentences explaining the choices
        """
        pass


# ---------------------------------------------------------------------------
# Mock implementation — zero API cost, instant response
# Use during frontend development: set AI_PROVIDER=mock in .env
# ---------------------------------------------------------------------------

class MockAIService(AIService):
    def suggest_requirements(self, system_name: str) -> dict:
        # Return a plausible full-form suggestion so the UI button works in mock mode
        return {
            "requirements": ["high_availability", "low_latency", "real_time_updates"],
            "daily_active_users": "100K",
            "read_write_ratio": "balanced",
            "geographic_scope": "single_region",
            "reasoning": (
                "Mock mode — these are generic default suggestions. "
                "Set AI_PROVIDER=claude to get AI-powered suggestions tailored to your system."
            ),
        }

    def generate_design(self, request: DesignRequest) -> str:
        return f"""# System Design: {request.system_name}

## 1. Requirements Summary

### Functional Requirements
- Users can submit requests to the system
- The system processes and stores data reliably
- Results are returned within acceptable latency targets
- Administrators can monitor system health

### Non-Functional Requirements
- **Availability:** 99.99% uptime target
- **Latency:** p99 read latency < 100ms
- **Scale:** Designed for {request.daily_active_users.value} daily active users

---

## 2. Scale Estimates

- **Daily Active Users:** {request.daily_active_users.value}
- **Reads/sec:** ~1,157 reads/sec
- **Writes/sec:** ~128 writes/sec
- **Storage/year:** ~2.3 TB
- **Bandwidth/day:** ~450 GB

---

## 3. High-Level Architecture

```mermaid
graph TD
    Client["Client (Web / Mobile)"] --> CDN["CDN (CloudFront)"]
    CDN --> LB["Load Balancer"]
    LB --> API1["API Server 1"]
    LB --> API2["API Server 2"]
    API1 --> Cache["Redis Cache"]
    API1 --> DB[("PostgreSQL Primary")]
    Cache --> DB
    DB --> Replica[("Read Replica")]
```

This is a **mock response** for frontend development. Set `AI_PROVIDER=claude` and add your `ANTHROPIC_API_KEY` to generate real designs.

---

## 4. API Design

```
GET  /api/health
POST /api/generate
Request:  {{ system_name, daily_active_users, read_write_ratio, ... }}
Response: {{ success, content }}
```

---

## 5. Database Design

**Recommended:** PostgreSQL — relational, battle-tested, handles this scale comfortably.

| Table | Key Fields |
|-------|-----------|
| users | id, email, created_at |
| designs | id, user_id, input, output, created_at |

---

## 6. Scaling Strategy

- **Horizontal scaling:** Stateless API servers behind a load balancer; auto-scale on CPU/RPS
- **Caching:** Redis for hot reads; 5-minute TTL for repeated queries
- **Database:** Read replicas for read-heavy workload; connection pooling via PgBouncer
- **Async:** SQS for background jobs (email, analytics)

---

## 7. Technology Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Frontend | React + Vite | Fast dev, excellent ecosystem |
| API Layer | FastAPI (Python) | Async, auto-docs, Pydantic validation |
| Database | PostgreSQL | Reliable, relational, handles this scale |
| Cache | Redis | Sub-millisecond reads, simple TTL |
| CDN | CloudFront | Global edge, S3 integration |
| Hosting | Railway + Vercel | Free tier for MVP |

---

## 8. Potential Bottlenecks & Mitigations

**Bottleneck:** Database write contention under high concurrency
**Mitigation:** Connection pooling + async writes via message queue

**Bottleneck:** AI generation latency (3–10 seconds per request)
**Mitigation:** Streaming response + optimistic UI loading state

**Bottleneck:** Single region availability
**Mitigation:** Multi-AZ deployment; failover read replica promotion

**Bottleneck:** Cache invalidation complexity
**Mitigation:** Short TTLs + event-driven invalidation on writes

---

## 9. Interview Tips for This System

### What Interviewers Focus On
- How you handle the read/write imbalance at scale
- Your approach to database indexing and query optimization
- How you would handle a sudden 10x traffic spike

### Common Mistakes Candidates Make
- Jumping to microservices before justifying the complexity
- Ignoring the operational cost of distributed systems
- Not quantifying estimates with real numbers

### Follow-Up Questions to Expect
- "How would you handle 10x the traffic?" → Horizontal scaling + caching layer
- "What happens if the database goes down?" → Read replica failover + circuit breaker
- "How do you handle schema migrations at scale?" → Blue/green deployments + backward-compatible migrations
- "Walk me through a write path end to end" → Client → LB → API → validation → DB → cache invalidation
"""


# ---------------------------------------------------------------------------
# Claude implementation (MVP)
# ---------------------------------------------------------------------------

class ClaudeAIService(AIService):
    # Default to Haiku (cheap) for dev; set CLAUDE_MODEL=claude-sonnet-4-6 in .env for production
    MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
    MAX_TOKENS = 8192

    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise EnvironmentError("ANTHROPIC_API_KEY is not set in environment variables.")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.system_prompt = self._load_system_prompt()

    @staticmethod
    def _is_billing_error(exc: Exception) -> bool:
        """
        Return True when the exception signals an API credit / billing problem.

        Anthropic surfaces this as an APIStatusError with HTTP 402, or
        occasionally as a 529/400 whose message contains billing keywords.
        We cast a slightly wide net so we don't miss alternative phrasings.
        """
        if isinstance(exc, anthropic.APIStatusError):
            if exc.status_code == 402:
                return True
            message = str(exc).lower()
            if any(kw in message for kw in ("credit", "balance", "billing", "payment", "quota")):
                return True
        return False

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

        reasoning_block = ""
        if request.parameter_reasoning:
            reasoning_block = (
                f"\n**AI-Suggested Parameters:** Yes — the form fields above were auto-populated by AI. "
                f"Include a 'Why the AI Chose These Parameters' section immediately after the Summary "
                f"(before Section 1) using this reasoning:\n{request.parameter_reasoning}\n"
            )

        return f"""Please design the following system:

**System:** {request.system_name}
**Daily Active Users:** {request.daily_active_users.value}
**Read/Write Ratio:** {ratio_labels.get(request.read_write_ratio.value, request.read_write_ratio.value)}
**Key Requirements:** {requirements_str}
**Geographic Scope:** {scope_labels.get(request.geographic_scope.value, request.geographic_scope.value)}
**Additional Context:** {request.additional_context or "None"}{reasoning_block}

Generate the full system design document following the structure in your instructions."""

    def suggest_requirements(self, system_name: str) -> dict:
        """
        Suggest values for all 4 form fields based on the system description.
        Always uses Haiku — fast, cheap, sufficient for this classification task.
        All returned values are validated against their allowed sets.

        If API credits are exhausted (detected previously or in this call),
        transparently falls back to MockAIService.
        """
        # If a billing error was already detected in this process, skip the API call entirely.
        if _credits_exhausted:
            return MockAIService().suggest_requirements(system_name)

        valid_dau = {"1K", "10K", "100K", "1M", "10M", "100M+"}
        valid_rw  = {"mostly_reads", "balanced", "mostly_writes"}
        valid_geo = {"single_region", "multi_region", "global"}

        prompt = (
            f'Given this system description: "{system_name}"\n\n'
            "Return a JSON object suggesting appropriate design parameters. "
            "Return ONLY valid JSON — no markdown, no backticks, no explanation.\n\n"
            "Use EXACTLY this structure:\n"
            '{\n'
            '  "daily_active_users": one of ["1K","10K","100K","1M","10M","100M+"],\n'
            '  "read_write_ratio": one of ["mostly_reads","balanced","mostly_writes"],\n'
            '  "geographic_scope": one of ["single_region","multi_region","global"],\n'
            '  "requirements": array of 3-5 from ["high_availability","low_latency","strong_consistency",'
            '"eventual_consistency","real_time_updates","file_media_storage","search","geolocation"],\n'
            '  "reasoning": "2-3 sentence explanation of why these specific values were chosen"\n'
            "}\n\n"
            "Rules:\n"
            "- Do not include both strong_consistency and eventual_consistency — pick the better fit\n"
            "- Base DAU on typical real-world scale for this type of system\n"
            "- reasoning must explain all 4 parameter choices concisely"
        )
        try:
            message = self.client.messages.create(
                model="claude-haiku-4-5-20251001",  # Always Haiku — fast, cheap, sufficient
                max_tokens=400,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as exc:
            if self._is_billing_error(exc):
                _mark_credits_exhausted()
                return MockAIService().suggest_requirements(system_name)
            raise  # Re-raise non-billing errors (network issues, etc.)

        raw = message.content[0].text.strip()
        # Haiku sometimes wraps its response in ```json ... ``` despite being told not to.
        # Strip any markdown code fence before parsing.
        if raw.startswith("```"):
            lines = raw.splitlines()
            # Drop the opening fence line (```json or ```) and closing ``` line
            raw = "\n".join(
                line for line in lines
                if not line.strip().startswith("```")
            ).strip()
        try:
            result = json.loads(raw)
            return {
                "requirements":       [k for k in result.get("requirements", []) if k in VALID_REQUIREMENT_KEYS],
                "daily_active_users": result.get("daily_active_users") if result.get("daily_active_users") in valid_dau else "100K",
                "read_write_ratio":   result.get("read_write_ratio")   if result.get("read_write_ratio")   in valid_rw  else "balanced",
                "geographic_scope":   result.get("geographic_scope")   if result.get("geographic_scope")   in valid_geo else "single_region",
                "reasoning":          result.get("reasoning", ""),
            }
        except (json.JSONDecodeError, TypeError, ValueError):
            return {
                "requirements": [], "daily_active_users": "100K",
                "read_write_ratio": "balanced", "geographic_scope": "single_region",
                "reasoning": "",
            }

    def generate_design(self, request: DesignRequest) -> str:
        # If a billing error was already detected in this process, skip the API call entirely.
        if _credits_exhausted:
            return MockAIService().generate_design(request)

        try:
            message = self.client.messages.create(
                model=self.MODEL,
                max_tokens=self.MAX_TOKENS,
                system=self.system_prompt,
                messages=[
                    {"role": "user", "content": self._build_user_message(request)}
                ],
            )
        except Exception as exc:
            if self._is_billing_error(exc):
                _mark_credits_exhausted()
                return MockAIService().generate_design(request)
            raise  # Re-raise non-billing errors

        return message.content[0].text


# ---------------------------------------------------------------------------
# Factory — the rest of the app uses this, never the concrete classes directly
# ---------------------------------------------------------------------------

# Module-level singleton — avoids re-reading the system prompt file and
# re-creating the Anthropic HTTP client on every request.
_claude_service_instance: Optional[ClaudeAIService] = None


def get_ai_service() -> AIService:
    """
    Return the configured AI service instance.
    Change the provider here when migrating (e.g. MVP → Growth).
    """
    global _claude_service_instance

    provider = os.getenv("AI_PROVIDER", "claude").lower()

    if provider == "mock":
        return MockAIService()  # stateless — cheap to construct each time

    if provider == "claude":
        if _claude_service_instance is None:
            _claude_service_instance = ClaudeAIService()
        return _claude_service_instance

    # Future providers — uncomment when ready:
    # if provider == "ollama":
    #     return OllamaAIService()

    raise ValueError(f"Unknown AI provider: '{provider}'. Set AI_PROVIDER in your .env file.")

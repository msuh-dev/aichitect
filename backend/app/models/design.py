from pydantic import BaseModel
from typing import Optional
from enum import Enum


class DailyActiveUsers(str, Enum):
    ONE_K = "1K"
    TEN_K = "10K"
    ONE_HUNDRED_K = "100K"
    ONE_M = "1M"
    TEN_M = "10M"
    ONE_HUNDRED_M_PLUS = "100M+"


class ReadWriteRatio(str, Enum):
    MOSTLY_READS = "mostly_reads"
    BALANCED = "balanced"
    MOSTLY_WRITES = "mostly_writes"


class GeographicScope(str, Enum):
    SINGLE_REGION = "single_region"
    MULTI_REGION = "multi_region"
    GLOBAL = "global"


class DesignRequest(BaseModel):
    system_name: str
    daily_active_users: DailyActiveUsers
    read_write_ratio: ReadWriteRatio
    geographic_scope: GeographicScope
    requirements: list[str]  # e.g. ["high_availability", "low_latency", "real_time_updates"]
    additional_context: Optional[str] = None
    parameter_reasoning: Optional[str] = None  # Set when form was AI-suggested; drives rationale section in output


class DesignResponse(BaseModel):
    success: bool
    content: str  # Full markdown output from the AI
    model_used: Optional[str] = None  # e.g. "claude-haiku-4-5-20251001", "mock"
    error: Optional[str] = None


class SuggestRequirementsRequest(BaseModel):
    system_name: str


class SuggestRequirementsResponse(BaseModel):
    success: bool
    requirements: list[str]           # Subset of the 8 valid requirement keys
    daily_active_users: Optional[str] = None   # e.g. "10M"
    read_write_ratio: Optional[str] = None     # e.g. "balanced"
    geographic_scope: Optional[str] = None     # e.g. "global"
    reasoning: Optional[str] = None            # Brief explanation of all suggested values
    error: Optional[str] = None

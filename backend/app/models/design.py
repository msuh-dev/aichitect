from pydantic import BaseModel, Field
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
    system_name: str = Field(..., min_length=1, max_length=300)
    daily_active_users: DailyActiveUsers
    read_write_ratio: ReadWriteRatio
    geographic_scope: GeographicScope
    requirements: list[str] = Field(default_factory=list, max_length=8)
    additional_context: Optional[str] = Field(None, max_length=2000)
    parameter_reasoning: Optional[str] = Field(None, max_length=1000)


class DesignResponse(BaseModel):
    success: bool
    content: str  # Full markdown output from the AI
    model_used: Optional[str] = None  # e.g. "claude-haiku-4-5-20251001", "mock"
    error: Optional[str] = None


class SuggestRequirementsRequest(BaseModel):
    system_name: str = Field(..., min_length=1, max_length=300)


class SuggestRequirementsResponse(BaseModel):
    success: bool
    requirements: list[str]           # Subset of the 8 valid requirement keys
    daily_active_users: Optional[str] = None   # e.g. "10M"
    read_write_ratio: Optional[str] = None     # e.g. "balanced"
    geographic_scope: Optional[str] = None     # e.g. "global"
    reasoning: Optional[str] = None            # Brief explanation of all suggested values
    error: Optional[str] = None

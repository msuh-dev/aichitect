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


class DesignResponse(BaseModel):
    success: bool
    content: str  # Full markdown output from the AI
    error: Optional[str] = None

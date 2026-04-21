"""
Supabase client — initialised once and reused across requests.

Uses the service role (secret) key so the backend can bypass RLS and
read/write any row. Never expose this key to the frontend.
"""

import os
import logging
from typing import Optional
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_client: Optional[Client] = None


def get_supabase() -> Client:
    """Return the singleton Supabase client, creating it on first call."""
    global _client
    if _client is None:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SECRET_KEY", "")
        if not url or not key:
            raise EnvironmentError(
                "SUPABASE_URL and SUPABASE_SECRET_KEY must be set in environment variables."
            )
        _client = create_client(url, key)
        logger.info("Supabase client initialised.")
    return _client

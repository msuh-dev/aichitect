"""
Polar webhook handler.

Polar uses the Standard Webhooks specification (https://www.standardwebhooks.com/).
Every incoming request is signed with HMAC-SHA256 using the webhook secret
you configure in the Polar dashboard.

Signature verification
──────────────────────
The signed payload is:  {webhook-id}.{webhook-timestamp}.{raw_body}
The header             `webhook-signature` contains one or more space-separated
values of the form     `v1,{base64_digest}`.
We check that at least one of the supplied signatures matches.

Events handled
──────────────
order.created — fires for both one-time purchases and new subscriptions.
    We read `product.metadata.credits` (int) from the event payload and
    call add_credits(email, amount) to top up the buyer's account.

All other events return 200 immediately (Polar retries on non-2xx).

Setup checklist (do once in the Polar dashboard)
──────────────────────────────────────────────────
1. Products → each paid product → Metadata → add key "credits" with the
   integer value matching the tier (e.g. 10, 30, 100).
2. Webhooks → Add endpoint:
   URL:    https://aichitect-backend.onrender.com/api/webhooks/polar
   Events: order.created
3. Copy the generated webhook secret and set POLAR_WEBHOOK_SECRET in Render.
"""

import base64
import hashlib
import hmac as hmac_module
import logging
import os

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.services.credits_service import add_credits

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])

POLAR_WEBHOOK_SECRET: str = os.getenv("POLAR_WEBHOOK_SECRET", "")


# ── Signature verification ────────────────────────────────────────────────────

def _verify_signature(
    raw_body: bytes,
    webhook_id: str,
    webhook_timestamp: str,
    webhook_signature: str,
) -> None:
    """
    Verify a Standard Webhooks HMAC-SHA256 signature using the official library.

    Polar uses the polar_whs_ prefix; the standardwebhooks library expects whsec_.
    We swap the prefix before passing to the library — the base64 payload is identical.

    Raises HTTPException(400) if the signature is missing or invalid.
    """
    if not POLAR_WEBHOOK_SECRET:
        logger.warning("POLAR_WEBHOOK_SECRET not set — skipping signature verification")
        return

    # Strip Polar's prefix, then base64-decode to get raw secret bytes.
    secret = POLAR_WEBHOOK_SECRET.strip()
    for prefix in ("polar_whs_", "whsec_"):
        if secret.startswith(prefix):
            secret = secret[len(prefix):]
            break

    try:
        missing = len(secret) % 4
        if missing:
            secret += "=" * (4 - missing)
        secret_bytes = base64.b64decode(secret)
    except Exception:
        # Fallback: use the raw secret string as bytes
        secret_bytes = POLAR_WEBHOOK_SECRET.encode("utf-8")

    # Standard Webhooks signed payload: "{webhook-id}.{webhook-timestamp}.{body}"
    signed_payload = f"{webhook_id}.{webhook_timestamp}.{raw_body.decode('utf-8')}"

    # Compute expected HMAC-SHA256 digest, base64-encoded
    expected = base64.b64encode(
        hmac_module.new(
            secret_bytes,
            signed_payload.encode("utf-8"),
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")

    # webhook-signature is space-separated "v1,{base64digest}" entries
    for sig in webhook_signature.strip().split():
        if sig.startswith("v1,"):
            digest = sig[3:]  # everything after "v1,"
            if hmac_module.compare_digest(digest, expected):
                return  # ✓ valid

    logger.warning(
        "Signature mismatch — webhook-id=%s  expected=%s  header=%s",
        webhook_id, expected, webhook_signature,
    )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Webhook signature verification failed.",
    )


# ── Webhook endpoint ──────────────────────────────────────────────────────────

@router.post("/polar")
async def polar_webhook(
    request: Request,
    webhook_id: str = Header(..., alias="webhook-id"),
    webhook_timestamp: str = Header(..., alias="webhook-timestamp"),
    webhook_signature: str = Header(..., alias="webhook-signature"),
):
    """
    Receive events from Polar.

    Currently handles:
    - order.created → add credits to the buyer's account
    """
    raw_body = await request.body()

    # Always verify before touching the payload
    _verify_signature(raw_body, webhook_id, webhook_timestamp, webhook_signature)

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload.",
        )

    event_type: str = payload.get("type", "")
    logger.info("Polar webhook received: %s (id=%s)", event_type, webhook_id)

    try:
        if event_type == "order.created":
            await _handle_order_created(payload)
    except Exception as exc:
        # Log but never return non-2xx — Polar would retry endlessly on 5xx.
        # The error will appear in Render logs for manual follow-up.
        logger.exception("Unhandled error processing %s (id=%s): %s", event_type, webhook_id, exc)

    # Always return 200 for verified events
    return {"received": True}


# ── Event handlers ────────────────────────────────────────────────────────────

async def _handle_order_created(payload: dict) -> None:
    """
    Credit the buyer after a successful order.

    Expected payload structure (Polar order.created):
    {
      "type": "order.created",
      "data": {
        "customer": { "email": "buyer@example.com" },
        "product": {
          "metadata": { "credits": 10 }
        },
        "status": "paid"          ← only process paid orders
      }
    }

    If `product.metadata.credits` is missing or 0, we log a warning
    and skip — the product was probably misconfigured.
    """
    data: dict = payload.get("data", {})

    # Only process paid orders
    order_status = data.get("status", "")
    if order_status != "paid":
        logger.info("Skipping order with status: %s", order_status)
        return

    # Extract buyer email
    customer: dict = data.get("customer", {})
    email: str = customer.get("email", "").strip().lower()
    if not email:
        logger.error("order.created payload missing customer email: %s", payload)
        return

    # Extract credit amount from product metadata
    product: dict = data.get("product", {})
    metadata: dict = product.get("metadata", {})
    try:
        credits_to_add = int(metadata.get("credits", 0))
    except (TypeError, ValueError):
        credits_to_add = 0

    if credits_to_add <= 0:
        logger.warning(
            "order.created for %s but product metadata has no valid 'credits' key. "
            "Set metadata.credits on the Polar product. payload=%s",
            email, payload,
        )
        return

    success = add_credits(email, credits_to_add)
    if not success:
        # The user hasn't signed up yet — this can happen if someone
        # pays before creating an account. Log it; we can handle it
        # manually or add a retry mechanism later.
        logger.error(
            "order.created: could not find user for email %s — "
            "they may not have signed up yet. credits=%d",
            email, credits_to_add,
        )
    else:
        logger.info(
            "order.created processed — email: %s  credits_added: %d",
            email, credits_to_add,
        )

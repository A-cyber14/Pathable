# ---------------------------------------------------------------------------
# Stripe integration — Checkout (subscriptions) + Billing Portal.
#
# Requires STRIPE_SECRET_KEY, STRIPE_BETA_PRICE_ID, STRIPE_PREMIUM_PRICE_ID,
# STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL (see backend/config.py). Without a
# secret key set, stripe.api_key is empty and any call to the Stripe API
# raises stripe.error.AuthenticationError — routers/billing.py turns that
# into a clear 502 rather than a raw stack trace.
#
# Prices are never taken from the frontend — only "which plan" is, and that
# is mapped to a Stripe Price ID here, server-side, so nobody can request an
# arbitrary price by tampering with a request body.
# ---------------------------------------------------------------------------

import stripe
from config import (
    STRIPE_SECRET_KEY, STRIPE_BETA_PRICE_ID, STRIPE_PREMIUM_PRICE_ID,
    STRIPE_SUCCESS_URL, STRIPE_CANCEL_URL, FRONTEND_BASE_URL,
)
from services.firebase import db

stripe.api_key = STRIPE_SECRET_KEY

PRICE_ID_BY_PLAN = {
    "beta":    STRIPE_BETA_PRICE_ID,
    "premium": STRIPE_PREMIUM_PRICE_ID,
}


def get_or_create_customer(business_id: str, business_data: dict, email: str | None) -> str:
    existing = business_data.get("stripeCustomerId")
    if existing:
        return existing

    customer = stripe.Customer.create(
        name=business_data.get("name") or None,
        email=email,
        metadata={"businessId": business_id},
    )
    db.collection("businesses").document(business_id).update({"stripeCustomerId": customer.id})
    return customer.id


def create_checkout_session(business_id: str, business_data: dict, plan: str, email: str | None) -> str:
    price_id = PRICE_ID_BY_PLAN.get(plan)
    if not price_id:
        raise ValueError(f"No Stripe price is configured for plan '{plan}'.")

    customer_id = get_or_create_customer(business_id, business_data, email)

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{STRIPE_SUCCESS_URL}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=STRIPE_CANCEL_URL,
        client_reference_id=business_id,
        metadata={"businessId": business_id, "plan": plan},
        subscription_data={"metadata": {"businessId": business_id, "plan": plan}},
    )
    return session.url


def create_portal_session(customer_id: str) -> str:
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{FRONTEND_BASE_URL}/business-profile",
    )
    return session.url


def find_business_ref_by_customer(customer_id: str):
    """Returns a Firestore document reference, or None if no business is linked to this Stripe customer."""
    docs = db.collection("businesses").where("stripeCustomerId", "==", customer_id).limit(1).stream()
    for doc in docs:
        return doc.reference
    return None

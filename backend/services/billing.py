# ---------------------------------------------------------------------------
# Billing / plans
#
# No payment provider is wired up yet — there is no Stripe (or other) secret
# configured anywhere in this project. Paid plans are recorded with a
# "payment_pending" status so the UI can be honest about it instead of
# pretending a purchase happened.
#
# Where Stripe would plug in later:
#   1. When a business selects "beta" or "premium" in setup_business
#      (backend/routers/users.py), create a Stripe Checkout Session instead
#      of (or in addition to) writing payment_pending, and redirect the
#      owner to session.url.
#   2. Add POST /api/billing/webhook (new router) that verifies the Stripe
#      signature with STRIPE_WEBHOOK_SECRET and, on checkout.session.completed,
#      flips the business's paymentStatus to "active" and stores
#      stripeCustomerId / stripeSubscriptionId on the business doc.
#   3. "Manage plan" in the dashboard would link to the Stripe customer
#      portal instead of just re-opening the plan-selection screen.
# ---------------------------------------------------------------------------

PLANS = {"freemium", "beta", "premium"}

# Freemium is free — no payment concept needed. Beta/Premium require payment
# that isn't implemented yet, so they're recorded as pending.
PAYMENT_STATUS_BY_PLAN = {
    "freemium": None,
    "beta":     "payment_pending",
    "premium":  "payment_pending",
}

# Owner-uploaded photo caps, enforced server-side in routers/businesses.py.
# Beta's limit isn't specified anywhere in the product — 15 is a placeholder
# pending a real product decision; Premium is unlimited (None).
PLAN_PHOTO_LIMITS = {
    "freemium": 3,
    "beta":     15,
    "premium":  None,
}


def payment_status_for_plan(plan: str | None) -> str | None:
    return PAYMENT_STATUS_BY_PLAN.get(plan)


def photo_limit_for_plan(plan: str | None) -> int | None:
    """None means unlimited. Businesses with no plan selected default to the Freemium cap."""
    if plan not in PLAN_PHOTO_LIMITS:
        return PLAN_PHOTO_LIMITS["freemium"]
    return PLAN_PHOTO_LIMITS[plan]

# ---------------------------------------------------------------------------
# Billing / plans
#
# Plan selection (routers/dashboard.py's update_my_business) only ever
# records selectedPlan — it never sets paymentStatus/subscriptionStatus.
# Those are set by:
#   - POST /api/billing/activate-free (Freemium — no payment involved)
#   - The Stripe webhook, POST /api/billing/webhook (Beta/Premium — only
#     after Stripe actually confirms payment; see routers/billing.py and
#     services/stripe_billing.py)
# This keeps "a plan is selected" and "a plan is paid for and active"
# strictly separate, so nothing pretends a purchase happened.
# ---------------------------------------------------------------------------

PLANS = {"freemium", "beta", "premium"}

# The Beta plan is capped at the first 100 businesses that select it.
# Businesses that already have selectedPlan == "beta" keep their access even
# if the cap is reached later — only *new* selections are blocked.
# Enforced in routers/dashboard.py's update_my_business.
BETA_BUSINESS_CAP = 100

# Owner-uploaded photo caps, enforced server-side in routers/businesses.py.
# None means unlimited.
PLAN_PHOTO_LIMITS = {
    "freemium": 3,
    "beta":     None,
    "premium":  None,
}


def photo_limit_for_plan(plan: str | None) -> int | None:
    """None means unlimited. Businesses with no plan selected default to the Freemium cap."""
    if plan not in PLAN_PHOTO_LIMITS:
        return PLAN_PHOTO_LIMITS["freemium"]
    return PLAN_PHOTO_LIMITS[plan]

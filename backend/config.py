# ---------------------------------------------------------------------------
# Pathable global configuration
# ---------------------------------------------------------------------------

import os

# The one fixed admin email. Only a user authenticated with this email gets
# admin privileges. No database flag is required — email match is the sole gate.
ADMIN_EMAIL = "inclusivetech781@gmail.com"

# ---------------------------------------------------------------------------
# Stripe — business plan billing (see backend/services/stripe_billing.py and
# backend/routers/billing.py). All blank by default so the app still boots
# without them; billing endpoints return a clear error until they're set.
# ---------------------------------------------------------------------------
STRIPE_SECRET_KEY       = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET   = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_BETA_PRICE_ID    = os.getenv("STRIPE_BETA_PRICE_ID", "")
STRIPE_PREMIUM_PRICE_ID = os.getenv("STRIPE_PREMIUM_PRICE_ID", "")
STRIPE_SUCCESS_URL      = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:5173/business-setup/payment/success")
STRIPE_CANCEL_URL       = os.getenv("STRIPE_CANCEL_URL", "http://localhost:5173/business-setup/payment/cancel")
# Not in the original required list — only used to build the Stripe Customer
# Portal's "return to app" link. Defaults to local dev; set in production.
FRONTEND_BASE_URL       = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

from fastapi import APIRouter, HTTPException, Header, Request
import stripe
from services.firebase import db
from services.billing import PLANS
from services.stripe_billing import create_checkout_session, create_portal_session, find_business_ref_by_customer
from config import STRIPE_WEBHOOK_SECRET
import firebase_admin.auth as firebase_auth

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helpers — same pattern used across the other routers.
# ---------------------------------------------------------------------------

def _decode_token(authorization: str) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split("Bearer ")[1]
    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_uid(authorization: str) -> str:
    return _decode_token(authorization)["uid"]


def require_business(uid: str) -> str:
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=403, detail="Business access required")
    data = user_doc.to_dict()
    is_business = data.get("accountType") == "business" or data.get("role") == "business"
    if not is_business or not data.get("businessId"):
        raise HTTPException(status_code=403, detail="Business access required")
    return data["businessId"]


# ---------------------------------------------------------------------------
# POST /api/billing/create-checkout-session
# Starts a Stripe Checkout session for the caller's business, for whichever
# plan is already saved as selectedPlan — the plan/price is never taken from
# the request body, only resolved server-side from the business doc.
# ---------------------------------------------------------------------------

@router.post("/create-checkout-session", status_code=200)
def create_checkout(authorization: str = Header(...)):
    decoded = _decode_token(authorization)
    uid = decoded["uid"]
    business_id = require_business(uid)

    doc = db.collection("businesses").document(business_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Business not found")
    data = doc.to_dict()

    plan = data.get("selectedPlan")
    if plan not in ("beta", "premium"):
        raise HTTPException(status_code=422, detail="Select a paid plan before checking out.")

    try:
        url = create_checkout_session(business_id, data, plan, decoded.get("email"))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except stripe.error.StripeError:
        raise HTTPException(status_code=502, detail="Payment setup is not available right now. Please try again later.")

    return {"url": url}


# ---------------------------------------------------------------------------
# POST /api/billing/portal-session
# Opens the Stripe Customer Portal for the caller's business (manage/cancel
# subscription, update card, view invoices).
# ---------------------------------------------------------------------------

@router.post("/portal-session", status_code=200)
def portal_session(authorization: str = Header(...)):
    uid = get_uid(authorization)
    business_id = require_business(uid)

    doc = db.collection("businesses").document(business_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Business not found")
    customer_id = doc.to_dict().get("stripeCustomerId")
    if not customer_id:
        raise HTTPException(status_code=422, detail="No billing account yet — subscribe to a paid plan first.")

    try:
        url = create_portal_session(customer_id)
    except stripe.error.StripeError:
        raise HTTPException(status_code=502, detail="Billing portal is not available right now. Please try again later.")

    return {"url": url}


# ---------------------------------------------------------------------------
# POST /api/billing/activate-free
# Freemium has no payment step — this is the only way its subscriptionStatus
# becomes "active". Rejects anything other than the Freemium plan so a paid
# plan can never be activated without Stripe confirming payment.
# ---------------------------------------------------------------------------

@router.post("/activate-free", status_code=200)
def activate_free(authorization: str = Header(...)):
    uid = get_uid(authorization)
    business_id = require_business(uid)

    ref = db.collection("businesses").document(business_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Business not found")
    if doc.to_dict().get("selectedPlan") != "freemium":
        raise HTTPException(status_code=422, detail="This endpoint only activates the Freemium plan.")

    ref.update({"subscriptionStatus": "active"})
    return {"message": "Freemium plan activated"}


# ---------------------------------------------------------------------------
# POST /api/billing/webhook
# The ONLY place a paid plan's paymentStatus/subscriptionStatus becomes
# "active" — never on Checkout redirect alone. Verifies the Stripe-Signature
# header against STRIPE_WEBHOOK_SECRET before trusting anything in the body.
# ---------------------------------------------------------------------------

@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook payload or signature")

    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        ref = find_business_ref_by_customer(obj.get("customer"))
        if ref:
            ref.update({
                "stripeSubscriptionId": obj.get("subscription"),
                "paymentStatus":        "active",
                "subscriptionStatus":   "active",
            })

    elif event_type == "customer.subscription.updated":
        ref = find_business_ref_by_customer(obj.get("customer"))
        if ref:
            ref.update({"subscriptionStatus": obj.get("status")})

    elif event_type == "customer.subscription.deleted":
        ref = find_business_ref_by_customer(obj.get("customer"))
        if ref:
            ref.update({"subscriptionStatus": "canceled"})

    elif event_type == "invoice.payment_failed":
        ref = find_business_ref_by_customer(obj.get("customer"))
        if ref:
            ref.update({"subscriptionStatus": "past_due"})

    elif event_type == "invoice.paid":
        ref = find_business_ref_by_customer(obj.get("customer"))
        if ref:
            ref.update({"subscriptionStatus": "active", "paymentStatus": "active"})

    return {"received": True}

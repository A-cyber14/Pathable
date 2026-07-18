from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.firebase import db
from services.billing import payment_status_for_plan, PLANS
import firebase_admin.auth as firebase_auth

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def get_uid(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split("Bearer ")[1]
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_business(uid: str) -> str:
    """Verify user is a business account and has a businessId. Returns the businessId.
    Supports both accountType='business' (new onboarding) and role='business' (legacy admin assignment).
    """
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=403, detail="Business access required")
    data = user_doc.to_dict()
    is_business = (
        data.get("accountType") == "business"
        or data.get("role") == "business"
    )
    if not is_business or not data.get("businessId"):
        raise HTTPException(status_code=403, detail="Business access required")
    return data["businessId"]


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

ACCESSIBILITY_FIELDS = [
    "wheelchair_accessible", "accessible_parking", "accessible_restrooms",
    "elevator", "auto_doors", "wheelchair_accessible_tables", "handrails_available",
    "hearing_assistance", "braille_signage", "sensory_friendly", "service_animal_support",
]


class BusinessProfileUpdate(BaseModel):
    name:            Optional[str]  = None
    address:         Optional[str]  = None
    description:     Optional[str]  = None
    category:        Optional[str]  = None
    phone:           Optional[str]  = None
    businessEmail:   Optional[str]  = None
    businessEmailPublic: Optional[bool] = None
    website:         Optional[str]  = None
    hours:           Optional[dict[str, str]] = None
    # Accessibility — tri-state (True/False/None = Yes/No/Unsure), same fields as ACCESSIBILITY_FIELDS
    wheelchair_accessible:        Optional[bool] = None
    accessible_parking:           Optional[bool] = None
    accessible_restrooms:         Optional[bool] = None
    elevator:                     Optional[bool] = None
    auto_doors:                   Optional[bool] = None
    wheelchair_accessible_tables: Optional[bool] = None
    handrails_available:          Optional[bool] = None
    hearing_assistance:           Optional[bool] = None
    braille_signage:              Optional[bool] = None
    sensory_friendly:             Optional[bool] = None
    service_animal_support:       Optional[bool] = None
    entrance_width_rating:        Optional[str]  = None
    accessibilityNotes:           Optional[dict[str, str]] = None
    accessibilityNotApplicable:   Optional[list[str]]      = None
    selectedPlan:                 Optional[str]  = None   # changing plan post-onboarding ("Manage plan")
    businessTutorialCompleted:    Optional[bool] = None


# ---------------------------------------------------------------------------
# GET /api/dashboard/my-business
# Returns the authenticated business owner's business document.
# ---------------------------------------------------------------------------

def _compute_profile_completion(data: dict, photos_count: int) -> int:
    """
    4 equal-weight sections: business info, hours, accessibility, photos.
    Intentionally coarse (section-complete or not) rather than counting
    individual fields, so partial info still gives credit.
    """
    sections_done = 0

    if data.get("name") and data.get("address") and data.get("category") and data.get("phone"):
        sections_done += 1
    if data.get("hours"):
        sections_done += 1
    if any(data.get(f) is not None for f in ACCESSIBILITY_FIELDS):
        sections_done += 1
    if photos_count > 0:
        sections_done += 1

    return round((sections_done / 4) * 100)


@router.get("/my-business", status_code=200)
def get_my_business(authorization: str = Header(...)):
    uid = get_uid(authorization)
    business_id = require_business(uid)

    doc = db.collection("businesses").document(business_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Business not found")

    data = doc.to_dict()
    data["id"] = doc.id

    # Count photos from subcollection
    photos_snap = list(
        db.collection("businesses").document(business_id)
        .collection("photos").stream()
    )
    data["photos_count"] = len(photos_snap)
    data["profileCompletion"] = _compute_profile_completion(data, len(photos_snap))

    return data


# ---------------------------------------------------------------------------
# PUT /api/dashboard/my-business
# Allows business owner to update name, address, and description.
# ---------------------------------------------------------------------------

_STRIP_FIELDS = {"name", "address", "description", "category", "phone", "businessEmail", "website"}


@router.put("/my-business", status_code=200)
def update_my_business(body: BusinessProfileUpdate, authorization: str = Header(...)):
    uid = get_uid(authorization)
    business_id = require_business(uid)

    ref = db.collection("businesses").document(business_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Business not found")

    # exclude_unset so an explicit "Unsure" (None) on an accessibility field is
    # saved as a deliberate choice, while fields the owner never touched are
    # left alone rather than being wiped back to null.
    update_data = body.model_dump(exclude_unset=True)
    for key in _STRIP_FIELDS:
        if isinstance(update_data.get(key), str):
            update_data[key] = update_data[key].strip()

    if "selectedPlan" in update_data:
        if update_data["selectedPlan"] not in PLANS:
            raise HTTPException(status_code=422, detail="Unknown plan.")
        update_data["paymentStatus"] = payment_status_for_plan(update_data["selectedPlan"])

    if update_data:
        update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
        ref.update(update_data)

    return {"message": "Business profile updated"}


# ---------------------------------------------------------------------------
# GET /api/dashboard/my-business/reviews
# Returns all reviews for the business, newest first.
# ---------------------------------------------------------------------------

@router.get("/my-business/reviews", status_code=200)
def get_my_business_reviews(authorization: str = Header(...)):
    uid = get_uid(authorization)
    business_id = require_business(uid)

    reviews = []
    for doc in (
        db.collection("reviews")
        .where("business_id", "==", business_id)
        .stream()
    ):
        r = doc.to_dict()
        r["id"] = doc.id
        reviews.append(r)

    reviews.sort(key=lambda r: r.get("submitted_at", ""), reverse=True)
    return reviews


# ---------------------------------------------------------------------------
# GET /api/dashboard/my-business/analytics
# Aggregates featurePreferences across all users and returns percentages.
# Shows which accessibility features matter most to people in your area.
# ---------------------------------------------------------------------------

@router.get("/my-business/analytics", status_code=200)
def get_my_business_analytics(authorization: str = Header(...)):
    uid = get_uid(authorization)
    require_business(uid)

    pref_map = {
        "wheelchair_accessible":        "wheelchairAccessible",
        "accessible_parking":           "parking",
        "wide_entrances":               "entrance",
        "accessible_restrooms":         "restroom",
        "elevators":                    "elevator",
        "automatic_doors":              "automaticDoors",
        "wheelchair_accessible_tables": "tables",
        "handrails_available":          "handrails",
    }

    counts = {v: 0 for v in pref_map.values()}
    total_users = 0

    for user_doc in db.collection("users").stream():
        data = user_doc.to_dict()
        prefs = data.get("featurePreferences") or []
        if prefs:
            total_users += 1
            for pref in prefs:
                key = pref_map.get(pref)
                if key:
                    counts[key] += 1

    if total_users == 0:
        return {k: 0 for k in counts}

    return {k: round((v / total_users) * 100) for k, v in counts.items()}

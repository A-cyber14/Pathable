from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.firebase import db
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

class BusinessProfileUpdate(BaseModel):
    name:        Optional[str] = None
    address:     Optional[str] = None
    description: Optional[str] = None


# ---------------------------------------------------------------------------
# GET /api/dashboard/my-business
# Returns the authenticated business owner's business document.
# ---------------------------------------------------------------------------

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

    return data


# ---------------------------------------------------------------------------
# PUT /api/dashboard/my-business
# Allows business owner to update name, address, and description.
# ---------------------------------------------------------------------------

@router.put("/my-business", status_code=200)
def update_my_business(body: BusinessProfileUpdate, authorization: str = Header(...)):
    uid = get_uid(authorization)
    business_id = require_business(uid)

    ref = db.collection("businesses").document(business_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Business not found")

    update_data = {}
    if body.name is not None:
        update_data["name"] = body.name.strip()
    if body.address is not None:
        update_data["address"] = body.address.strip()
    if body.description is not None:
        update_data["description"] = body.description.strip()

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

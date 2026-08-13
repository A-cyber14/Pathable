import re
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from models.business import Business
from services.firebase import db, get_contributor_uid
from services.scoring import calculate_accessibility_score
from services.duplicates import find_duplicate_business_id
from config import ADMIN_EMAIL
import firebase_admin.auth as firebase_auth

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helpers — token verification
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


def _decode_token(authorization: str) -> dict:
    """Return the full decoded token dict (uid, email, name, …)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split("Bearer ")[1]
    try:
        return firebase_auth.verify_id_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# ---------------------------------------------------------------------------
# Activity counting
# ---------------------------------------------------------------------------
# Uses collection-specific field names — no renaming, no migration.
#
#   reviews.submittedBy       — counts only approved reviews (meaningful signal)
#   contributions.userId      — counts all contributions regardless of status
#                               because no admin approval flow exists yet and
#                               pending_review is the only real state in use
#
# Anonymous documents (missing or null uid) are excluded automatically:
# Firestore equality queries do not match null/missing fields against a uid.
# ---------------------------------------------------------------------------

def _count_user_activity(uid: str) -> dict:
    """
    Return approved review count, total contribution count, and their sum
    for the given uid.  Two indexed equality queries — no collection scans.
    """
    review_count = sum(
        1 for _ in (
            db.collection("reviews")
            .where("submittedBy", "==", uid)
            .where("status",      "==", "approved")
            .stream()
        )
    )

    contribution_count = sum(
        1 for _ in (
            db.collection("contributions")
            .where("userId", "==", uid)
            .where("status", "==", "approved")
            .stream()
        )
    )

    return {
        "reviewCount":       review_count,
        "contributionCount": contribution_count,
        "totalActivity":     review_count + contribution_count,
    }


def _enrich_score(data: dict) -> dict:
    """Compute accessibility_score and inject it into a Firestore business dict."""
    try:
        b = Business.model_validate(data)
        data = dict(data)
        data["accessibility_score"] = calculate_accessibility_score(
            b,
            review_count=data.get("review_count") or 0,
            contribution_count=data.get("contributors_count") or 0,
        )
    except Exception:
        data = dict(data)
        data["accessibility_score"] = None
    return data


# ---------------------------------------------------------------------------
# Profile request/response model
# ---------------------------------------------------------------------------

class ProfileUpdate(BaseModel):
    disabilityType:     Optional[str]       = None
    featurePreferences: Optional[list[str]] = None
    accountType:        Optional[str]       = None   # "user" | "business"
    hideIdentity:       Optional[bool]      = None   # False = show name (default); True = anonymous
    # Onboarding progress — see App.jsx's ProfileGate for how these drive resuming.
    onboardingStep:          Optional[str]  = None
    userTutorialCompleted:   Optional[bool] = None
    # Preferred location for "near you" ranking — never exposed on any public
    # endpoint, only returned via GET /me/profile to the owning user.
    # source: "gps" | "zip" | None. lat/lng are set either from geolocation
    # directly, or geocoded client-side from the ZIP (see zipGeocode.js).
    locationLat:    Optional[float] = None
    locationLng:    Optional[float] = None
    locationZip:    Optional[str]   = None
    locationSource: Optional[str]   = None


class SetupBusinessBody(BaseModel):
    # Provide claim_id to claim an existing business, OR name+address(+details) to create new.
    claim_id:      Optional[str] = None
    name:          Optional[str] = None
    address:       Optional[str] = None
    category:      Optional[str] = None
    phone:         Optional[str] = None
    businessEmail: Optional[str] = None
    website:       Optional[str] = None
    description:   Optional[str] = None
    hours:         Optional[dict[str, str]] = None


# ---------------------------------------------------------------------------
# GET /api/users/me/profile
# ---------------------------------------------------------------------------

@router.get("/me/profile")
def get_profile(authorization: str = Header(...)):
    decoded  = _decode_token(authorization)
    uid      = decoded["uid"]
    email    = (decoded.get("email") or "").lower().strip()

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    activity = _count_user_activity(uid)

    # ── Auto-assign admin based on email ────────────────────────────────────
    is_admin = email == ADMIN_EMAIL.lower()

    if not user_doc.exists:
        initial_data: dict = {
            "disabilityType":     None,
            "featurePreferences": [],
            "accountType":        "admin" if is_admin else None,
            "hideIdentity":       False,
            "bookmarks":          [],
        }
        if decoded.get("name"):
            initial_data["displayName"] = decoded["name"]
        if email:
            initial_data["email"] = email
        user_ref.set(initial_data)
        return {
            "disabilityType":     None,
            "featurePreferences": [],
            "accountType":        "admin" if is_admin else None,
            "businessId":         None,
            "hideIdentity":       False,
            "onboardingStep":     None,
            "userTutorialCompleted": False,
            "locationLat":        None,
            "locationLng":        None,
            "locationZip":        None,
            "locationSource":     None,
            **activity,
        }

    data = user_doc.to_dict()

    # Promote existing user to admin if their email matches
    if is_admin and data.get("accountType") != "admin":
        user_ref.update({"accountType": "admin"})
        data["accountType"] = "admin"

    # Back-fill displayName / email if missing (first time after adding this logic)
    updates: dict = {}
    if decoded.get("name") and not data.get("displayName"):
        updates["displayName"] = decoded["name"]
    if email and not data.get("email"):
        updates["email"] = email
    if updates:
        user_ref.update(updates)
        data.update(updates)

    return {
        "disabilityType":     data.get("disabilityType", None),
        "featurePreferences": data.get("featurePreferences", []),
        "accountType":        data.get("accountType", None),
        "businessId":         data.get("businessId", None),
        "hideIdentity":       data.get("hideIdentity", False),
        "onboardingStep":     data.get("onboardingStep", None),
        "userTutorialCompleted": data.get("userTutorialCompleted", False),
        "locationLat":        data.get("locationLat", None),
        "locationLng":        data.get("locationLng", None),
        "locationZip":        data.get("locationZip", None),
        "locationSource":     data.get("locationSource", None),
        **activity,
    }


# ---------------------------------------------------------------------------
# PUT /api/users/me/profile
# ---------------------------------------------------------------------------

@router.put("/me/profile")
def update_profile(body: ProfileUpdate, authorization: str = Header(...)):
    uid = get_uid(authorization)
    user_ref = db.collection("users").document(uid)

    # Only touch fields the caller actually sent — onboarding calls this
    # endpoint multiple times across steps (account type, then profile, then
    # tutorial completion, ...) and previously any call would silently reset
    # disabilityType/featurePreferences back to empty on every save.
    update_data = body.model_dump(exclude_unset=True)
    if "accountType" in update_data and update_data["accountType"] not in ("user", "business"):
        del update_data["accountType"]

    if not update_data:
        return {"message": "Nothing to update"}

    user_doc = user_ref.get()
    if user_doc.exists:
        user_ref.update(update_data)
    else:
        user_ref.set({**update_data, "bookmarks": []})

    return {"message": "Profile saved"}


# ---------------------------------------------------------------------------
# GET /api/users/me/bookmarks
# Returns full Business objects enriched with accessibility_score
# ---------------------------------------------------------------------------

@router.get("/me/bookmarks", response_model=list[Business])
def get_bookmarks(authorization: str = Header(...)):
    uid = get_uid(authorization)

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        return []

    bookmark_ids: list[str] = user_doc.to_dict().get("bookmarks", [])

    if not bookmark_ids:
        return []

    results = []
    for business_id in bookmark_ids:
        doc = db.collection("businesses").document(business_id).get()
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            data = _enrich_score(data)
            try:
                results.append(Business.model_validate(data))
            except Exception:
                pass

    return results


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------------------------------------------------------------------------
# POST /api/users/me/setup-business
# Called at the very start of business onboarding (find/claim or add), either
# to claim an existing listing (claim_id) or create a minimal new one
# (name+address+category — the rest of the business's details are collected
# in later onboarding steps via PUT /dashboard/my-business).
# Sets accountType="business" and businessId on the user document, and
# ownerUserId on the business document.
#
# Verification and payment are NOT required to reach the dashboard — a
# claimed/created business gets immediate access (MVP), matching the rest
# of the onboarding flow. Plan selection happens afterward and is handled
# entirely by PUT /dashboard/my-business + POST /billing/*, not here.
# ---------------------------------------------------------------------------

@router.post("/me/setup-business", status_code=200)
def setup_business(body: SetupBusinessBody, authorization: str = Header(...)):
    uid = get_uid(authorization)
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if body.businessEmail and not _EMAIL_RE.match(body.businessEmail.strip()):
        raise HTTPException(status_code=422, detail="Business email is not a valid email address.")

    # ── Validate input ──────────────────────────────────────────────────────
    if body.claim_id:
        # Claiming an existing business
        biz_ref = db.collection("businesses").document(body.claim_id)
        biz_snap = biz_ref.get()
        if not biz_snap.exists:
            raise HTTPException(status_code=404, detail="Business not found")

        existing_owner = biz_snap.to_dict().get("ownerUserId")
        if existing_owner and existing_owner != uid:
            raise HTTPException(
                status_code=409,
                detail="This business is currently managed through Pathable. "
                       "Please contact support if ownership needs to be transferred.",
            )

        business_id = body.claim_id
        biz_ref.update({"ownerUserId": uid})

    elif body.name and body.address:
        duplicate_id = find_duplicate_business_id(body.name, body.address)
        if duplicate_id:
            raise HTTPException(
                status_code=409,
                detail="A business with this name and address already exists on Pathable. "
                       "Search for it and claim it instead of creating a duplicate.",
            )

        # Creating a new (intentionally minimal) business entry — name,
        # address, and category only. Everything else is filled in later
        # via the Information/Hours/Accessibility/Photos onboarding steps.
        # lat/lon default to 0 — can be updated later via the contribute flow
        new_biz = {
            "name":                       body.name.strip(),
            "address":                    body.address.strip(),
            "latitude":                   0.0,
            "longitude":                  0.0,
            "wheelchair_accessible":      False,
            "accessible_parking":         False,
            "accessible_restrooms":       None,
            "elevator":                   None,
            "auto_doors":                 None,
            "wheelchair_accessible_tables": None,
            "handrails_available":        None,
            "entrance_width_rating":      None,
            "description":                body.description.strip() if body.description else None,
            "community_score":            None,
            "review_count":               0,
            "contributors_count":         0,
            "last_updated":               datetime.now(timezone.utc).isoformat(),
            "ownerUserId":                uid,
        }
        if body.website:
            new_biz["website"] = body.website.strip()
        if body.phone:
            new_biz["phone"] = body.phone.strip()
        if body.category:
            new_biz["category"] = body.category.strip()
        if body.businessEmail:
            new_biz["businessEmail"] = body.businessEmail.strip()
        if body.hours:
            new_biz["hours"] = body.hours

        _, doc_ref = db.collection("businesses").add(new_biz)
        business_id = doc_ref.id

    else:
        raise HTTPException(
            status_code=422,
            detail="Provide claim_id to claim a business, or name+address to create one.",
        )

    # ── Update user doc ─────────────────────────────────────────────────────
    user_data = {"accountType": "business", "businessId": business_id}

    if user_doc.exists:
        user_ref.update(user_data)
    else:
        user_ref.set({**user_data, "bookmarks": [], "featurePreferences": []})

    return {"message": "Business set up successfully", "businessId": business_id}

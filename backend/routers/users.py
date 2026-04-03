from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from models.business import Business
from services.firebase import db
from services.scoring import calculate_accessibility_score
import firebase_admin.auth as firebase_auth

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helper — verify Firebase token and return uid
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


def _enrich_score(data: dict) -> dict:
    """Compute accessibility_score and inject it into a Firestore business dict."""
    try:
        b = Business.model_validate(data)
        data = dict(data)
        data["accessibility_score"] = calculate_accessibility_score(b)
    except Exception:
        data = dict(data)
        data["accessibility_score"] = None
    return data


# ---------------------------------------------------------------------------
# Profile request/response model
# ---------------------------------------------------------------------------

class ProfileUpdate(BaseModel):
    disabilityType:     Optional[str]       = None
    featurePreferences: Optional[list[str]] = []


# ---------------------------------------------------------------------------
# GET /api/users/me/profile
# ---------------------------------------------------------------------------

@router.get("/me/profile")
def get_profile(authorization: str = Header(...)):
    uid = get_uid(authorization)
    user_doc = db.collection("users").document(uid).get()

    if not user_doc.exists:
        return {"disabilityType": None, "featurePreferences": []}

    data = user_doc.to_dict()
    return {
        "disabilityType":     data.get("disabilityType", None),
        "featurePreferences": data.get("featurePreferences", []),
    }


# ---------------------------------------------------------------------------
# PUT /api/users/me/profile
# ---------------------------------------------------------------------------

@router.put("/me/profile")
def update_profile(body: ProfileUpdate, authorization: str = Header(...)):
    uid = get_uid(authorization)
    user_ref = db.collection("users").document(uid)

    update_data = {
        "disabilityType":     body.disabilityType,
        "featurePreferences": body.featurePreferences or [],
    }

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

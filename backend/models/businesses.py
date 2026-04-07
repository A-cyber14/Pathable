from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel
from typing import Optional
from models.business import Business, BusinessSummary
from services.firebase import db
from datetime import datetime, timezone
import firebase_admin.auth as firebase_auth

router = APIRouter()

COLLECTION = "businesses"


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


# ---------------------------------------------------------------------------
# GET /api/businesses
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[BusinessSummary])
def get_all_businesses():
    docs = db.collection(COLLECTION).stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(BusinessSummary(**data))
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/search?q=
# Must be registered BEFORE /{business_id}
# ---------------------------------------------------------------------------

@router.get("/search", response_model=list[BusinessSummary])
def search_businesses(q: str = Query(..., description="Search query — matched against business name")):
    docs = db.collection(COLLECTION).stream()
    results = []
    q_lower = q.strip().lower()
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        if q_lower in data.get("name", "").lower():
            results.append(BusinessSummary(**data))
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/{business_id}/photos
# Returns approved photo contributions for a business, newest first.
# Each item includes: id, businessId, userId, category, photoUrl, caption, createdAt
# ---------------------------------------------------------------------------

VALID_CATEGORIES = {"entrance", "bathroom", "parking", "interior", "seating", "other"}


@router.get("/{business_id}/photos")
def get_business_photos(business_id: str):
    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    query = (
        db.collection("contributions")
        .where("businessId", "==", business_id)
        .where("type", "==", "photo")
        # NOTE: Firestore requires a composite index for multi-field queries.
        # To avoid needing an index on (businessId, type, status, createdAt),
        # we filter status in Python below.
        .stream()
    )

    results = []
    for doc in query:
        data = doc.to_dict()
        # Only surface approved photos (or all if you want pending visible too — adjust here)
        if data.get("status") not in ("approved",):
            continue
        results.append({
            "id":         doc.id,
            "businessId": data.get("businessId"),
            "userId":     data.get("userId"),
            "category":   data.get("category", "other"),
            "photoUrl":   data.get("photoUrl", ""),
            "caption":    data.get("caption"),
            "createdAt":  data.get("createdAt"),
        })

    # Sort newest first in Python (avoids needing a Firestore composite index)
    results.sort(key=lambda r: r.get("createdAt") or "", reverse=True)
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/{business_id}
# ---------------------------------------------------------------------------

@router.get("/{business_id}", response_model=Business)
def get_business(business_id: str):
    doc = db.collection(COLLECTION).document(business_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")
    data = doc.to_dict()
    data["id"] = doc.id
    return Business(**data)


# ---------------------------------------------------------------------------
# POST /api/businesses/{id}/bookmark
# ---------------------------------------------------------------------------

@router.post("/{business_id}/bookmark", status_code=200)
def add_bookmark(business_id: str, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if user_doc.exists:
        bookmarks = user_doc.to_dict().get("bookmarks", [])
        if business_id not in bookmarks:
            bookmarks.append(business_id)
            user_ref.update({"bookmarks": bookmarks})
    else:
        user_ref.set({"bookmarks": [business_id]})

    return {"message": f"Bookmarked '{business_id}'"}


# ---------------------------------------------------------------------------
# DELETE /api/businesses/{id}/bookmark
# ---------------------------------------------------------------------------

@router.delete("/{business_id}/bookmark", status_code=200)
def remove_bookmark(business_id: str, authorization: str = Header(...)):
    uid = get_uid(authorization)

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User has no bookmarks")

    bookmarks = user_doc.to_dict().get("bookmarks", [])
    if business_id not in bookmarks:
        raise HTTPException(status_code=404, detail=f"'{business_id}' is not bookmarked")

    bookmarks.remove(business_id)
    user_ref.update({"bookmarks": bookmarks})

    return {"message": f"Removed bookmark for '{business_id}'"}


# ---------------------------------------------------------------------------
# POST /api/businesses/{id}/report
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    message: str


@router.post("/{business_id}/report", status_code=201)
def report_business(business_id: str, body: ReportRequest, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    db.collection("reports").add({
        "businessId": business_id,
        "userId":     uid,
        "message":    body.message,
        "createdAt":  datetime.now(timezone.utc).isoformat(),
    })

    return {"message": "Report submitted successfully"}


# ---------------------------------------------------------------------------
# POST /api/businesses/{id}/photos
# Now requires a `category` field. Saves category in Firestore metadata.
# The client should upload the file to Firebase Storage at:
#   business-photos/{businessId}/{category}/{filename}
# and pass the resulting download URL here.
# ---------------------------------------------------------------------------

VALID_CATEGORIES = {"entrance", "bathroom", "parking", "interior", "seating", "other"}


class PhotoSubmission(BaseModel):
    photoUrl:  str
    caption:   Optional[str] = None
    category:  str = "other"   # one of VALID_CATEGORIES


@router.post("/{business_id}/photos", status_code=201)
def submit_photo(business_id: str, body: PhotoSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    # Normalise category
    category = body.category.lower().strip() if body.category else "other"
    if category not in VALID_CATEGORIES:
        category = "other"

    db.collection("contributions").add({
        "businessId": business_id,
        "userId":     uid,
        "type":       "photo",
        "photoUrl":   body.photoUrl,
        "caption":    body.caption,
        "category":   category,          # ← now persisted
        "status":     "pending_review",
        "createdAt":  datetime.now(timezone.utc).isoformat(),
    })

    return {"message": "Photo submitted for review", "category": category}


# ---------------------------------------------------------------------------
# POST /api/businesses/{id}/features
# ---------------------------------------------------------------------------

class FeaturesSubmission(BaseModel):
    wheelchairAccessible: Optional[bool] = None
    accessibleParking:    Optional[bool] = None
    doorWidth:            Optional[int]  = None
    accessibleRestroom:   Optional[bool] = None
    notes:                Optional[str]  = None


@router.post("/{business_id}/features", status_code=201)
def submit_features(business_id: str, body: FeaturesSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    db.collection("contributions").add({
        "businessId":          business_id,
        "userId":              uid,
        "type":                "features",
        "wheelchairAccessible":body.wheelchairAccessible,
        "accessibleParking":   body.accessibleParking,
        "doorWidth":           body.doorWidth,
        "accessibleRestroom":  body.accessibleRestroom,
        "notes":               body.notes,
        "status":              "pending_review",
        "createdAt":           datetime.now(timezone.utc).isoformat(),
    })

    return {"message": "Features submitted for review"}


# ---------------------------------------------------------------------------
# POST /api/businesses/
# ---------------------------------------------------------------------------

@router.post("/", response_model=Business, status_code=201)
def create_business(business: Business):
    doc_ref = db.collection(COLLECTION).document(business.id)
    if doc_ref.get().exists:
        raise HTTPException(status_code=409, detail=f"Business '{business.id}' already exists")
    doc_ref.set(business.model_dump(exclude={"id"}))
    return business
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
# Returns all businesses as lightweight summary objects
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
# Case-insensitive name search — filters all businesses client-side in Python.
# Firestore does not support native case-insensitive text search.
# Must be registered BEFORE /{business_id} or FastAPI matches "search" as an id.
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
# Add business to the current user's bookmarks array
# ---------------------------------------------------------------------------

@router.post("/{business_id}/bookmark", status_code=200)
def add_bookmark(business_id: str, authorization: str = Header(...)):
    uid = get_uid(authorization)

    # Confirm business exists
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
        # First time — create the user document
        user_ref.set({"bookmarks": [business_id]})

    return {"message": f"Bookmarked '{business_id}'"}


# ---------------------------------------------------------------------------
# DELETE /api/businesses/{id}/bookmark
# Remove business from the current user's bookmarks array
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
# Submit a report or update request for a business
# ---------------------------------------------------------------------------

class ReportRequest(BaseModel):
    message: str


@router.post("/{business_id}/report", status_code=201)
def report_business(business_id: str, body: ReportRequest, authorization: str = Header(...)):
    uid = get_uid(authorization)

    # Confirm business exists
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
# Submit a photo URL + caption for a business (pending_review)
# ---------------------------------------------------------------------------

class PhotoSubmission(BaseModel):
    photoUrl:   str
    category:   Optional[str] = None   # e.g. "Entrance", "Bathroom", etc.
    caption:    Optional[str] = None
    uploadedBy: Optional[str] = None   # Firebase UID from frontend


@router.post("/{business_id}/photos", status_code=201)
def submit_photo(business_id: str, body: PhotoSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    db.collection("contributions").add({
        "businessId": business_id,
        "userId":     uid,
        "type":       "photo",
        "photoUrl":   body.photoUrl,
        "category":   body.category,
        "caption":    body.caption,
        "uploadedBy": body.uploadedBy or uid,
        "status":     "pending_review",
        "verified":   False,
        "createdAt":  datetime.now(timezone.utc).isoformat(),
    })

    return {"message": "Photo submitted for review"}


# ---------------------------------------------------------------------------
# POST /api/businesses/{id}/features
# Submit accessibility feature data for a business (pending_review)
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




@router.post("/", response_model=Business, status_code=201)
def create_business(business: Business):
    doc_ref = db.collection(COLLECTION).document(business.id)
    if doc_ref.get().exists:
        raise HTTPException(status_code=409, detail=f"Business '{business.id}' already exists")
    doc_ref.set(business.model_dump(exclude={"id"}))
    return business

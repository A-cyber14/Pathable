from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel
from typing import Optional
from models.business import Business, BusinessSummary
from services.firebase import db
from services.scoring import calculate_accessibility_score
from services.maps import get_maps_client
from datetime import datetime, timezone
import firebase_admin.auth as firebase_auth

router = APIRouter()

COLLECTION = "businesses"

# Pinellas County center — used to bias Google Places results
PINELLAS_LAT = 27.9072
PINELLAS_LNG = -82.7169
SEARCH_RADIUS_M = 40000  # ~25 miles


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


def _enrich_score(data: dict) -> dict:
    """Compute accessibility_score and inject it into a Firestore business dict."""
    try:
        # Use model_validate so extra Firestore fields are silently ignored
        b = Business.model_validate(data)
        data = dict(data)
        data["accessibility_score"] = calculate_accessibility_score(b)
    except Exception:
        data = dict(data)
        data["accessibility_score"] = None
    return data


# ---------------------------------------------------------------------------
# GET /api/businesses
# All businesses (summary), each enriched with a computed accessibility_score
# ---------------------------------------------------------------------------

@router.get("/", response_model=list[BusinessSummary])
def get_all_businesses():
    docs = db.collection(COLLECTION).stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        data = _enrich_score(data)
        results.append(BusinessSummary.model_validate(data))
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/top-rated
# Top 10 businesses sorted by accessibility_score DESC.
# Used to populate the homepage map and ranked list panel.
# Must be registered BEFORE /{business_id}.
# ---------------------------------------------------------------------------

@router.get("/top-rated", response_model=list[Business])
def get_top_rated():
    docs = db.collection(COLLECTION).stream()
    scored = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        data = _enrich_score(data)
        scored.append((data.get("accessibility_score") or 0, data))

    scored.sort(key=lambda x: x[0], reverse=True)

    results = []
    for _, data in scored[:10]:
        try:
            results.append(Business.model_validate(data))
        except Exception:
            pass
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/search?q=
# Firestore-only name search (kept for backward compatibility).
# Must be registered BEFORE /{business_id}.
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
            data = _enrich_score(data)
            results.append(BusinessSummary.model_validate(data))
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/search-unified?q=
# Merges Firestore businesses + Google Places results.
# Returns up to 3 results, DB results first.
# Must be registered BEFORE /{business_id}.
# ---------------------------------------------------------------------------

class UnifiedSearchResult(BaseModel):
    id:                 Optional[str]   = None   # Firestore doc id, null for Places-only
    name:               str
    address:            str
    latitude:           Optional[float] = None
    longitude:          Optional[float] = None
    in_db:              bool                     # True = exists in our Firestore
    place_id:           Optional[str]   = None   # Google Places ID
    accessibility_score: Optional[int]  = None


@router.get("/search-unified", response_model=list[UnifiedSearchResult])
def search_unified(q: str = Query(..., description="Unified search query")):
    q_lower = q.strip().lower()

    # --- 1. Search Firestore ---
    docs = db.collection(COLLECTION).stream()
    db_results: list[UnifiedSearchResult] = []
    db_place_ids: set[str] = set()

    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        name_match    = q_lower in data.get("name", "").lower()
        address_match = q_lower in data.get("address", "").lower()
        if name_match or address_match:
            data = _enrich_score(data)
            gplace_id = data.get("googlePlaceId") or data.get("place_id")
            if gplace_id:
                db_place_ids.add(gplace_id)
            db_results.append(UnifiedSearchResult(
                id=doc.id,
                name=data.get("name", ""),
                address=data.get("address", ""),
                latitude=data.get("latitude"),
                longitude=data.get("longitude"),
                in_db=True,
                place_id=gplace_id,
                accessibility_score=data.get("accessibility_score"),
            ))

    # --- 2. Google Places text search ---
    places_results: list[UnifiedSearchResult] = []
    maps_client = get_maps_client()

    if maps_client:
        try:
            response = maps_client.places(
                query=f"{q} Pinellas County FL",
                location=(PINELLAS_LAT, PINELLAS_LNG),
                radius=SEARCH_RADIUS_M,
            )
            for place in response.get("results", [])[:5]:
                place_id = place.get("place_id", "")
                # Skip if this place is already in our DB
                if place_id in db_place_ids:
                    continue
                location = place.get("geometry", {}).get("location", {})
                address  = place.get("formatted_address") or place.get("vicinity", "")
                places_results.append(UnifiedSearchResult(
                    id=None,
                    name=place.get("name", ""),
                    address=address,
                    latitude=location.get("lat"),
                    longitude=location.get("lng"),
                    in_db=False,
                    place_id=place_id,
                    accessibility_score=None,
                ))
        except Exception:
            pass  # Degrade gracefully — return Firestore results only

    # DB results take priority; fill remaining slots with Places results
    slots_remaining = max(0, 3 - len(db_results))
    merged = db_results[:3] + places_results[:slots_remaining]
    return merged[:3]


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
    data = _enrich_score(data)
    return Business.model_validate(data)


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
# ---------------------------------------------------------------------------

class PhotoSubmission(BaseModel):
    photoUrl:   str
    category:   Optional[str] = None
    caption:    Optional[str] = None
    uploadedBy: Optional[str] = None


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
        "businessId":           business_id,
        "userId":               uid,
        "type":                 "features",
        "wheelchairAccessible": body.wheelchairAccessible,
        "accessibleParking":    body.accessibleParking,
        "doorWidth":            body.doorWidth,
        "accessibleRestroom":   body.accessibleRestroom,
        "notes":                body.notes,
        "status":               "pending_review",
        "createdAt":            datetime.now(timezone.utc).isoformat(),
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
    doc_ref.set(business.model_dump(exclude={"id", "accessibility_score"}))
    return business

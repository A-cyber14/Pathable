from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel
from typing import Optional
from models.business import Business, BusinessSummary
from services.firebase import db, get_contributor_uid
from services.scoring import calculate_accessibility_score
from services.stats import recalculate_business_stats
from services.maps import get_maps_client
from datetime import datetime, timezone
import firebase_admin.auth as firebase_auth
import uuid

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
        b = Business.model_validate(data)
        data = dict(data)
        data["accessibility_score"] = calculate_accessibility_score(
            b,
            review_count=data.get("review_count") or 0,
            contribution_count=None,
        )
    except Exception:
        data = dict(data)
        data["accessibility_score"] = None
    return data


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
        data = _enrich_score(data)
        results.append(BusinessSummary.model_validate(data))
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/top-rated
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
# Must be registered BEFORE /{business_id}.
# ---------------------------------------------------------------------------

@router.get("/search", response_model=list[BusinessSummary])
def search_businesses(q: str = Query(..., description="Search query")):
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
# Must be registered BEFORE /{business_id}.
# ---------------------------------------------------------------------------

class UnifiedSearchResult(BaseModel):
    id:                  Optional[str]   = None
    name:                str
    address:             str
    latitude:            Optional[float] = None
    longitude:           Optional[float] = None
    in_db:               bool
    place_id:            Optional[str]   = None
    accessibility_score: Optional[int]   = None


@router.get("/search-unified", response_model=list[UnifiedSearchResult])
def search_unified(q: str = Query(..., description="Unified search query")):
    q_lower = q.strip().lower()

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

    places_results: list[UnifiedSearchResult] = []
    maps_client = get_maps_client()

    if maps_client:
        try:
            response = maps_client.places(
                query=f"{q} Pinellas County FL",
                location=(PINELLAS_LAT, PINELLAS_LNG),
                radius=SEARCH_RADIUS_M,
            )
            for place in response.get("results", [])[:8]:
                place_id = place.get("place_id", "")
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
            pass

    merged = db_results[:5] + places_results[:5]
    return merged


# ---------------------------------------------------------------------------
# POST /api/businesses/create-from-external
# Creates a new business from an external (Google Places) result.
# Checks for duplicates first — by place_id, then by name+address similarity.
# Must be registered BEFORE /{business_id} to avoid route shadowing.
# ---------------------------------------------------------------------------

class CreateFromExternalRequest(BaseModel):
    name:     str
    address:  str
    lat:      Optional[float] = None
    lng:      Optional[float] = None
    place_id: Optional[str]   = None
    wheelchair_accessible: Optional[bool] = None
    accessible_parking:    Optional[bool] = None


class CreateFromExternalResponse(BaseModel):
    id:       str
    existing: bool   # True if a duplicate was found — redirect to existing page


@router.post("/create-from-external", response_model=CreateFromExternalResponse, status_code=200)
def create_from_external(body: CreateFromExternalRequest):
    name_lower = body.name.strip().lower()
    addr_lower = body.address.strip().lower()

    # 1. Exact match on Google place_id
    if body.place_id:
        docs = db.collection(COLLECTION).stream()
        for doc in docs:
            data = doc.to_dict()
            gid = data.get("googlePlaceId") or data.get("place_id")
            if gid == body.place_id:
                return CreateFromExternalResponse(id=doc.id, existing=True)

    # 2. Fuzzy name + address match — treat as duplicate if both substrings match
    docs = db.collection(COLLECTION).stream()
    for doc in docs:
        data     = doc.to_dict()
        s_name   = data.get("name",    "").lower()
        s_addr   = data.get("address", "").lower()
        name_hit = name_lower in s_name or s_name in name_lower
        addr_hit = addr_lower in s_addr or s_addr in addr_lower
        if name_hit and addr_hit:
            return CreateFromExternalResponse(id=doc.id, existing=True)

    # 3. No duplicate — create new business
    new_id = uuid.uuid4().hex
    now    = datetime.now(timezone.utc).isoformat()

    db.collection(COLLECTION).document(new_id).set({
        "name":                  body.name.strip(),
        "address":               body.address.strip(),
        "latitude":              body.lat  or 0.0,
        "longitude":             body.lng  or 0.0,
        "wheelchair_accessible": body.wheelchair_accessible if body.wheelchair_accessible is not None else False,
        "accessible_parking":    body.accessible_parking    if body.accessible_parking    is not None else False,
        "googlePlaceId":         body.place_id,
        "last_updated":          now,
        "source":                "user_submitted",
    })

    return CreateFromExternalResponse(id=new_id, existing=False)


# ---------------------------------------------------------------------------
# GET /api/businesses/{business_id}/review-summary
# Returns community rating breakdown for the dropdown component.
# Must be registered BEFORE /{business_id} to avoid route shadowing.
# ---------------------------------------------------------------------------

@router.get("/{business_id}/review-summary")
def get_review_summary(business_id: str):
    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    docs = (
        db.collection("reviews")
        .where("business_id", "==", business_id)
        .where("status",      "==", "approved")
        .stream()
    )

    breakdown   = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    total_rating = 0
    count        = 0

    for doc in docs:
        star = doc.to_dict().get("rating")
        if isinstance(star, int) and 1 <= star <= 5:
            breakdown[star] += 1
            total_rating    += star
            count           += 1

    return {
        "average_rating": round(total_rating / count, 1) if count > 0 else 0.0,
        "review_count":   count,
        "breakdown":      breakdown,
    }


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
# Writes to contributions (moderation audit trail) AND immediately surfaces
# the photo in the business's photos subcollection for display.
# ---------------------------------------------------------------------------

class PhotoSubmission(BaseModel):
    photoUrl:   str
    category:   Optional[str] = None
    caption:    Optional[str] = None
    uploadedBy: Optional[str] = None
    mediaType:  Optional[str] = "image"  # "image" | "video"


@router.post("/{business_id}/photos", status_code=201)
def submit_photo(business_id: str, body: PhotoSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    now        = datetime.now(timezone.utc).isoformat()
    category   = body.category or "Other"
    media_type = body.mediaType if body.mediaType in ("image", "video") else "image"

    # 1. Moderation audit trail (unchanged behaviour)
    db.collection("contributions").add({
        "businessId": business_id,
        "userId":     uid,
        "type":       "photo",
        "photoUrl":   body.photoUrl,
        "category":   category,
        "caption":    body.caption,
        "uploadedBy": body.uploadedBy or uid,
        "mediaType":  media_type,
        "status":     "pending_review",
        "verified":   False,
        "createdAt":  now,
    })

    # 2. Immediately surface in photos subcollection for display
    photo_id = uuid.uuid4().hex
    db.collection(COLLECTION).document(business_id).collection("photos").document(photo_id).set({
        "photoUrl":   body.photoUrl,
        "category":   category,
        "caption":    body.caption,
        "uploadedBy": body.uploadedBy or uid,
        "mediaType":  media_type,
        "createdAt":  now,
    })

    recalculate_business_stats(business_id)

    return {"message": "Media submitted and is now visible on the business page"}


# ---------------------------------------------------------------------------
# GET /api/businesses/{business_id}/reviews
# Returns approved reviews for a business, newest-first.
# Public — no auth required (read-only).
# ---------------------------------------------------------------------------

@router.get("/{business_id}/reviews")
def get_business_reviews(business_id: str):
    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    docs = (
        db.collection("reviews")
        .where("business_id", "==", business_id)
        .where("status", "==", "approved")
        .stream()
    )

    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id

        uid = data.get("submittedBy")
        if uid:
            try:
                user_doc = db.collection("users").document(uid).get()
                if user_doc.exists:
                    udata = user_doc.to_dict()
                    if udata.get("hideIdentity"):
                        data["reviewerName"] = "Anonymous"
                    else:
                        data["reviewerName"] = udata.get("displayName") or udata.get("email") or "Contributor"
                else:
                    data["reviewerName"] = "Contributor"
            except Exception:
                data["reviewerName"] = "Contributor"
        else:
            data["reviewerName"] = "Anonymous"

        results.append(data)

    # Newest-first
    results.sort(key=lambda x: x.get("submitted_at", ""), reverse=True)
    return results


# ---------------------------------------------------------------------------
# GET /api/businesses/{business_id}/photos
# Returns all photos from the photos subcollection, sorted newest-first.
# ---------------------------------------------------------------------------

@router.get("/{business_id}/photos")
def get_business_photos(business_id: str):
    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    docs = (
        db.collection(COLLECTION)
        .document(business_id)
        .collection("photos")
        .stream()
    )

    # Cache user lookups so we don't hit Firestore for every photo
    user_cache: dict = {}

    def resolve_uploader(uid: str | None) -> str:
        if not uid:
            return "Anonymous"
        if uid not in user_cache:
            try:
                udoc = db.collection("users").document(uid).get()
                if udoc.exists:
                    udata = udoc.to_dict()
                    user_cache[uid] = "Anonymous" if udata.get("hideIdentity") else (
                        udata.get("displayName") or udata.get("email") or "Contributor"
                    )
                else:
                    user_cache[uid] = "Contributor"
            except Exception:
                user_cache[uid] = "Contributor"
        return user_cache[uid]

    results = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        # Backward-compat: old records without mediaType are images
        if "mediaType" not in data:
            data["mediaType"] = "image"
        data["uploaderName"] = resolve_uploader(data.get("uploadedBy"))
        results.append(data)

    # Newest-first so first item per category is the most recent upload
    results.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
    return results


# ---------------------------------------------------------------------------
# POST /api/businesses/{id}/features
# ---------------------------------------------------------------------------

class FeaturesSubmission(BaseModel):
    wheelchairAccessible:        Optional[bool] = None
    accessibleParking:           Optional[bool] = None
    doorWidth:                   Optional[int]  = None
    accessibleRestroom:          Optional[bool] = None
    wheelchairAccessibleTables:  Optional[bool] = None
    handrailsAvailable:          Optional[bool] = None
    notes:                       Optional[str]  = None


@router.post("/{business_id}/features", status_code=201)
def submit_features(business_id: str, body: FeaturesSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    db.collection("contributions").add({
        "businessId":           business_id,
        "userId":               uid,
        "type":                 "features",
        "wheelchairAccessible":       body.wheelchairAccessible,
        "accessibleParking":          body.accessibleParking,
        "doorWidth":                  body.doorWidth,
        "accessibleRestroom":         body.accessibleRestroom,
        "wheelchairAccessibleTables": body.wheelchairAccessibleTables,
        "handrailsAvailable":         body.handrailsAvailable,
        "notes":                      body.notes,
        "status":               "pending_review",
        "createdAt":            datetime.now(timezone.utc).isoformat(),
    })

    recalculate_business_stats(business_id)

    return {"message": "Features submitted for review"}


# ---------------------------------------------------------------------------
# POST /api/businesses/{id}/issue-reports
# Structured accessibility issue report (pending review — does NOT auto-overwrite data).
# Must be registered BEFORE /{business_id} to avoid route shadowing.
# ---------------------------------------------------------------------------

class IssueReportRequest(BaseModel):
    feature:     str
    issue_type:  str
    tags:        list[str] = []
    description: str
    photo_urls:  list[str]


@router.post("/{business_id}/issue-reports", status_code=201)
def submit_issue_report(business_id: str, body: IssueReportRequest, authorization: str = Header(...)):
    uid = get_uid(authorization)

    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    if not body.description.strip():
        raise HTTPException(status_code=422, detail="Description is required")

    if not body.photo_urls:
        raise HTTPException(status_code=422, detail="At least one photo is required")

    if len(body.photo_urls) > 3:
        raise HTTPException(status_code=422, detail="Maximum 3 photos allowed")

    db.collection("issue_reports").add({
        "businessId": business_id,
        "userId":     uid,
        "feature":    body.feature,
        "issueType":  body.issue_type,
        "tags":       body.tags,
        "description": body.description.strip(),
        "photoUrls":  body.photo_urls,
        "status":     "pending_review",
        "createdAt":  datetime.now(timezone.utc).isoformat(),
    })

    return {"message": "Issue report submitted for review"}


# ---------------------------------------------------------------------------
# GET /api/businesses/{id}/issue-reports/pending
# Public endpoint — returns whether there are any pending issue reports.
# Must be registered BEFORE /{business_id}/issue-reports to avoid shadowing.
# ---------------------------------------------------------------------------

@router.get("/{business_id}/issue-reports/pending")
def get_pending_issue_reports(business_id: str):
    if not db.collection(COLLECTION).document(business_id).get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")

    docs = (
        db.collection("issue_reports")
        .where("businessId", "==", business_id)
        .where("status", "==", "pending_review")
        .stream()
    )

    count = sum(1 for _ in docs)
    return {"has_pending": count > 0, "count": count}


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

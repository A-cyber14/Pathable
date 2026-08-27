import logging
from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, field_validator
from typing import Optional
from models.business import Business, BusinessSummary
from services.firebase import db, get_contributor_uid
from services.scoring import calculate_accessibility_score
from services.stats import recalculate_business_stats
from services.accessibility import apply_accessibility_report
from services.maps import get_maps_client
from services.duplicates import find_duplicate_business_id
from services.billing import photo_limit_for_plan
from datetime import datetime, timezone
import firebase_admin.auth as firebase_auth
import uuid

router = APIRouter()
logger = logging.getLogger("pathable.contributions")

COLLECTION = "businesses"
BUSINESS_REQUESTS_COLLECTION = "business_requests"

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
            contribution_count=data.get("contributors_count") or 0,
        )
    except Exception:
        data = dict(data)
        data["accessibility_score"] = None
    # "verified" here means Pathable has reviewed the location's accessibility
    # info — unrelated to business ownership. "claimed" just tells the
    # business-search UI whether a business account already manages this
    # listing (see setup_business's ownerUserId conflict check).
    data["verified"] = bool(data.get("pathable_verified") or data.get("verified"))
    data["claimed"]  = bool(data.get("ownerUserId"))
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
        try:
            results.append(BusinessSummary.model_validate(data))
        except Exception:
            # Skip documents missing required fields rather than failing the
            # whole list — same defensive pattern as get_top_rated below.
            continue
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
            try:
                results.append(BusinessSummary.model_validate(data))
            except Exception:
                continue
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
    category:            Optional[str]   = None
    verified:             Optional[bool] = None   # Pathable-reviewed accessibility info
    claimed:               Optional[bool] = None   # already managed by a business account


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
                category=data.get("category"),
                verified=data.get("verified"),
                claimed=data.get("claimed"),
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
# POST /api/businesses/request-listing
# "Request this business" — Option A of the Add-to-Pathable flow. Does NOT
# create a business document (avoids empty/useless listings). Just records
# enough for Pathable/admins to identify and add the location later.
# Must be registered BEFORE /{business_id} to avoid route shadowing.
# ---------------------------------------------------------------------------

class BusinessRequestSubmission(BaseModel):
    name:     str
    address:  str
    place_id: Optional[str] = None
    notes:    Optional[str] = None

    @field_validator("name", "address")
    @classmethod
    def not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("This field is required")
        return v.strip()


@router.post("/request-listing", status_code=201)
def request_business_listing(body: BusinessRequestSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)
    try:
        db.collection(BUSINESS_REQUESTS_COLLECTION).add({
            "name":         body.name,
            "address":      body.address,
            "place_id":     body.place_id,
            "notes":        (body.notes or "").strip() or None,
            "requestedBy":  uid,
            "status":       "pending_review",
            "createdAt":    datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        logger.exception(
            "Failed to save business listing request — stage=firestore_write uid=%s name=%s",
            uid, body.name,
        )
        raise HTTPException(status_code=500, detail="Failed to submit your request. Please try again.")

    return {"message": "Thanks — we'll review this and add it to Pathable."}


# ---------------------------------------------------------------------------
# POST /api/businesses/create-from-external
# Creates a new business from an external (Google Places) result — Option B
# of the Add-to-Pathable flow ("Add information about this business").
# Requires a real initial contribution (a short description of what the user
# knows about the location) so this can't be used to spin up an empty
# listing — see UnverifiedBusinessPage.jsx's AddToPathableModal.
# Checks for duplicates first — by place_id, then by name+address similarity.
# Must be registered BEFORE /{business_id} to avoid route shadowing.
# ---------------------------------------------------------------------------

class CreateFromExternalRequest(BaseModel):
    name:        str
    address:     str
    description: str   # required — see docstring above
    lat:      Optional[float] = None
    lng:      Optional[float] = None
    place_id: Optional[str]   = None
    wheelchair_accessible: Optional[bool] = None
    accessible_parking:    Optional[bool] = None

    @field_validator("name", "address")
    @classmethod
    def not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("This field is required")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_min_length(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError("description must be at least 10 characters")
        return v.strip()


class CreateFromExternalResponse(BaseModel):
    id:       str
    existing: bool   # True if a duplicate was found — redirect to existing page


@router.post("/create-from-external", response_model=CreateFromExternalResponse, status_code=200)
def create_from_external(body: CreateFromExternalRequest, authorization: str = Header(...)):
    uid = get_uid(authorization)

    duplicate_id = find_duplicate_business_id(body.name, body.address, body.place_id)
    if duplicate_id:
        return CreateFromExternalResponse(id=duplicate_id, existing=True)

    # No duplicate — create new business
    new_id = uuid.uuid4().hex
    now    = datetime.now(timezone.utc).isoformat()

    try:
        db.collection(COLLECTION).document(new_id).set({
            "name":                  body.name,
            "address":               body.address,
            "description":           body.description,
            "latitude":              body.lat  or 0.0,
            "longitude":             body.lng  or 0.0,
            "wheelchair_accessible": body.wheelchair_accessible,
            "accessible_parking":    body.accessible_parking,
            "googlePlaceId":         body.place_id,
            "last_updated":          now,
            "source":                "user_submitted",
            "createdBy":             uid,
        })
    except Exception:
        logger.exception(
            "Failed to create business from external place — stage=firestore_write uid=%s name=%s",
            uid, body.name,
        )
        raise HTTPException(status_code=500, detail="Failed to add this business. Please try again.")

    # The two optional tri-state fields the user answered are the business's
    # first accessibility reports — route them through the same aggregation
    # path everything else uses so confirmation counts start consistent.
    try:
        apply_accessibility_report(new_id, {
            "wheelchair_accessible": body.wheelchair_accessible,
            "accessible_parking":    body.accessible_parking,
        })
    except Exception:
        logger.exception(
            "Failed to apply initial accessibility report — stage=apply_accessibility_report business_id=%s",
            new_id,
        )

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
    mediaType:  Optional[str] = "image"  # "image" | "video"

    @field_validator("photoUrl")
    @classmethod
    def photo_url_required(cls, v):
        if not v or not v.strip():
            raise ValueError("photoUrl is required")
        return v.strip()


@router.post("/{business_id}/photos", status_code=201)
def submit_photo(business_id: str, body: PhotoSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)

    biz_doc = db.collection(COLLECTION).document(business_id).get()
    if not biz_doc.exists:
        raise HTTPException(status_code=404, detail=f"Business '{business_id}' not found")
    biz_data = biz_doc.to_dict()

    # Plan photo limits only apply to the business owner's own uploads —
    # community contributions from other users are never capped by a
    # business's plan (see services/billing.py for the per-plan caps).
    if biz_data.get("ownerUserId") == uid:
        limit = photo_limit_for_plan(biz_data.get("selectedPlan"))
        if limit is not None:
            owner_photo_count = sum(
                1 for p in (
                    db.collection(COLLECTION).document(business_id)
                    .collection("photos").where("uploadedBy", "==", uid).stream()
                )
            )
            if owner_photo_count >= limit:
                raise HTTPException(
                    status_code=422,
                    detail=f"Your current plan allows up to {limit} photos. Upgrade your plan to upload more.",
                )

    now        = datetime.now(timezone.utc).isoformat()
    category   = body.category or "Other"
    media_type = body.mediaType if body.mediaType in ("image", "video") else "image"

    try:
        # 1. Moderation audit trail (unchanged behaviour)
        db.collection("contributions").add({
            "businessId": business_id,
            "userId":     uid,
            "type":       "photo",
            "photoUrl":   body.photoUrl,
            "category":   category,
            "caption":    body.caption,
            "uploadedBy": uid,
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
            "uploadedBy": uid,
            "mediaType":  media_type,
            "createdAt":  now,
        })
    except Exception:
        logger.exception(
            "Failed to save photo contribution — stage=firestore_write business_id=%s uid=%s category=%s",
            business_id, uid, category,
        )
        raise HTTPException(
            status_code=500,
            detail="Your photo uploaded, but we couldn't save it to this business. Please try again.",
        )

    try:
        recalculate_business_stats(business_id)
    except Exception:
        logger.exception(
            "Failed to recalculate business stats after photo — stage=recalculate_stats business_id=%s",
            business_id,
        )

    return {"message": "Media submitted and is now visible on the business page", "id": photo_id}


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
    # All Optional[bool] = tri-state (True/False/None = Yes/No/Unsure). A
    # field left at None means "the contributor didn't answer this" and must
    # never be treated as a confirmed "No" — see services/accessibility.py.
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

    has_content = any([
        body.wheelchairAccessible is not None,
        body.accessibleParking    is not None,
        body.doorWidth            is not None,
        body.accessibleRestroom   is not None,
        body.wheelchairAccessibleTables is not None,
        body.handrailsAvailable   is not None,
        body.notes and body.notes.strip(),
    ])
    if not has_content:
        raise HTTPException(status_code=422, detail="Please answer at least one field before submitting.")

    now = datetime.now(timezone.utc).isoformat()
    try:
        # Moderation audit trail — the data itself is applied to the business
        # below (same "live immediately, community-submitted" trust model as
        # reviews and photos), this record exists so admins can review/take
        # down bad-faith submissions after the fact.
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
            "createdAt":            now,
        })
    except Exception:
        logger.exception(
            "Failed to save features contribution — stage=firestore_write business_id=%s uid=%s",
            business_id, uid,
        )
        raise HTTPException(status_code=500, detail="Failed to save your submission. Please try again.")

    try:
        apply_accessibility_report(business_id, {
            "wheelchair_accessible":        body.wheelchairAccessible,
            "accessible_parking":           body.accessibleParking,
            "accessible_restrooms":         body.accessibleRestroom,
            "wheelchair_accessible_tables": body.wheelchairAccessibleTables,
            "handrails_available":          body.handrailsAvailable,
        })
    except Exception:
        logger.exception(
            "Failed to apply accessibility report from features — stage=apply_accessibility_report business_id=%s",
            business_id,
        )

    try:
        recalculate_business_stats(business_id)
    except Exception:
        logger.exception(
            "Failed to recalculate business stats after features — stage=recalculate_stats business_id=%s",
            business_id,
        )

    return {"message": "Accessibility info added — thank you for contributing!"}


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

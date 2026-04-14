from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.firebase import db
from config import ADMIN_EMAIL
import firebase_admin.auth as firebase_auth

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helpers
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


def require_admin(authorization: str) -> str:
    """Verify the caller is the fixed admin email. Returns uid."""
    decoded = _decode_token(authorization)
    uid     = decoded["uid"]
    email   = (decoded.get("email") or "").lower().strip()

    if email != ADMIN_EMAIL.lower():
        # Also accept a Firestore accountType="admin" as a fallback
        user_doc = db.collection("users").document(uid).get()
        if not user_doc.exists or user_doc.to_dict().get("accountType") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")

    return uid


# ---------------------------------------------------------------------------
# GET /api/admin/stats
# ---------------------------------------------------------------------------

@router.get("/stats")
def get_stats(authorization: str = Header(...)):
    require_admin(authorization)

    user_count     = sum(1 for _ in db.collection("users").stream())
    business_count = sum(1 for _ in db.collection("businesses").stream())
    review_count   = sum(1 for _ in db.collection("reviews").stream())

    # Count photos across all business subcollections
    photo_count = 0
    for biz_doc in db.collection("businesses").stream():
        photo_count += sum(
            1 for _ in db.collection("businesses").document(biz_doc.id)
                          .collection("photos").stream()
        )

    return {
        "users":      user_count,
        "businesses": business_count,
        "reviews":    review_count,
        "media":      photo_count,
    }


# ---------------------------------------------------------------------------
# GET /api/admin/businesses
# ---------------------------------------------------------------------------

@router.get("/businesses")
def list_businesses(authorization: str = Header(...)):
    require_admin(authorization)
    results = []
    for doc in db.collection("businesses").stream():
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    return results


# ---------------------------------------------------------------------------
# PATCH /api/admin/businesses/{id}
# ---------------------------------------------------------------------------

class AdminBusinessUpdate(BaseModel):
    name:    Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    phone:   Optional[str] = None


@router.patch("/businesses/{business_id}", status_code=200)
def update_business(business_id: str, body: AdminBusinessUpdate, authorization: str = Header(...)):
    require_admin(authorization)

    ref = db.collection("businesses").document(business_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Business not found")

    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=422, detail="No fields to update")

    ref.update(update)
    return {"message": "Business updated"}


# ---------------------------------------------------------------------------
# DELETE /api/admin/businesses/{id}
# ---------------------------------------------------------------------------

@router.delete("/businesses/{business_id}", status_code=200)
def delete_business(business_id: str, authorization: str = Header(...)):
    require_admin(authorization)

    ref = db.collection("businesses").document(business_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Business not found")

    # Delete the document (subcollections like photos are not auto-deleted,
    # but that is acceptable for MVP — orphaned subcollections cause no bugs)
    ref.delete()
    return {"message": f"Business '{business_id}' deleted"}


# ---------------------------------------------------------------------------
# GET /api/admin/users
# ---------------------------------------------------------------------------

@router.get("/users")
def list_users(authorization: str = Header(...)):
    require_admin(authorization)
    results = []
    for doc in db.collection("users").stream():
        data = doc.to_dict()
        data["uid"] = doc.id
        # Remove sensitive fields
        data.pop("bookmarks", None)
        results.append(data)
    return results


# ---------------------------------------------------------------------------
# DELETE /api/admin/users/{uid}
# ---------------------------------------------------------------------------

@router.delete("/users/{target_uid}", status_code=200)
def delete_user(target_uid: str, authorization: str = Header(...)):
    require_admin(authorization)

    ref = db.collection("users").document(target_uid)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    ref.delete()
    return {"message": f"User '{target_uid}' deleted"}


# ---------------------------------------------------------------------------
# PATCH /api/admin/users/{uid}/unlink-business
# Removes businessId and resets accountType to "user"
# ---------------------------------------------------------------------------

@router.patch("/users/{target_uid}/unlink-business", status_code=200)
def unlink_business_user(target_uid: str, authorization: str = Header(...)):
    require_admin(authorization)

    ref = db.collection("users").document(target_uid)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    ref.update({"businessId": None, "accountType": "user"})
    return {"message": f"Business unlinked from user '{target_uid}'"}


# ---------------------------------------------------------------------------
# GET /api/admin/reviews
# Returns all reviews with business_id and reviewer uid
# ---------------------------------------------------------------------------

@router.get("/reviews")
def list_reviews(authorization: str = Header(...)):
    require_admin(authorization)
    results = []
    for doc in db.collection("reviews").stream():
        data = doc.to_dict()
        data["id"] = doc.id
        results.append(data)
    return results


# ---------------------------------------------------------------------------
# DELETE /api/admin/reviews/{id}  (already existed, kept for completeness)
# ---------------------------------------------------------------------------

@router.delete("/reviews/{review_id}", status_code=200)
def delete_review(review_id: str, authorization: str = Header(...)):
    require_admin(authorization)

    ref = db.collection("reviews").document(review_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found")

    business_id = doc.to_dict().get("business_id")
    ref.delete()

    if business_id and db.collection("businesses").document(business_id).get().exists:
        from services.stats import recalculate_business_stats
        recalculate_business_stats(business_id)

    return {"message": f"Review '{review_id}' deleted"}


# ---------------------------------------------------------------------------
# GET /api/admin/media
# Returns all photos across all businesses
# ---------------------------------------------------------------------------

@router.get("/media")
def list_media(authorization: str = Header(...)):
    require_admin(authorization)
    results = []
    for biz_doc in db.collection("businesses").stream():
        for photo_doc in (
            db.collection("businesses")
              .document(biz_doc.id)
              .collection("photos")
              .stream()
        ):
            data = photo_doc.to_dict()
            data["id"]          = photo_doc.id
            data["business_id"] = biz_doc.id
            results.append(data)
    return results


# ---------------------------------------------------------------------------
# DELETE /api/admin/media/{biz_id}/{photo_id}
# ---------------------------------------------------------------------------

@router.delete("/media/{biz_id}/{photo_id}", status_code=200)
def delete_media(biz_id: str, photo_id: str, authorization: str = Header(...)):
    require_admin(authorization)

    ref = (
        db.collection("businesses")
          .document(biz_id)
          .collection("photos")
          .document(photo_id)
    )
    photo_doc = ref.get()
    if not photo_doc.exists:
        raise HTTPException(status_code=404, detail="Photo not found")

    photo_url = photo_doc.to_dict().get("photoUrl")

    # 1. Remove from the photos subcollection (source of truth for display)
    ref.delete()

    # 2. Remove matching contribution(s) so the audit trail stays in sync
    if photo_url:
        contrib_docs = (
            db.collection("contributions")
              .where("businessId", "==", biz_id)
              .where("photoUrl",   "==", photo_url)
              .where("type",       "==", "photo")
              .stream()
        )
        for cdoc in contrib_docs:
            cdoc.reference.delete()

    # 3. Recompute stats (photo_count, contributors_count, etc.)
    from services.stats import recalculate_business_stats
    recalculate_business_stats(biz_id)

    return {"message": f"Photo '{photo_id}' deleted"}


# ---------------------------------------------------------------------------
# POST /api/admin/cleanup-orphaned-photos
# Scans every business's photos subcollection and removes any document whose
# photoUrl returns a 4xx response (file was deleted from Storage without going
# through the admin panel).  Also prunes matching contributions and recalculates
# stats for every affected business.
# ---------------------------------------------------------------------------

@router.post("/cleanup-orphaned-photos", status_code=200)
def cleanup_orphaned_photos(authorization: str = Header(...)):
    require_admin(authorization)

    import urllib.request
    import urllib.error
    from services.stats import recalculate_business_stats

    removed: int = 0
    businesses_affected: set = set()

    for biz_doc in db.collection("businesses").stream():
        biz_id = biz_doc.id
        for photo_doc in (
            db.collection("businesses")
              .document(biz_id)
              .collection("photos")
              .stream()
        ):
            data      = photo_doc.to_dict()
            photo_url = data.get("photoUrl", "")

            # A doc with no URL is orphaned by definition
            if not photo_url:
                photo_doc.reference.delete()
                removed += 1
                businesses_affected.add(biz_id)
                continue

            broken = False
            try:
                req = urllib.request.Request(photo_url, method="HEAD")
                urllib.request.urlopen(req, timeout=5)
            except urllib.error.HTTPError as exc:
                if exc.code >= 400:
                    broken = True
            except Exception:
                # Network timeout, DNS error, etc. — don't delete speculatively
                pass

            if broken:
                photo_doc.reference.delete()
                # Remove matching contribution entry
                for cdoc in (
                    db.collection("contributions")
                      .where("businessId", "==", biz_id)
                      .where("photoUrl",   "==", photo_url)
                      .where("type",       "==", "photo")
                      .stream()
                ):
                    cdoc.reference.delete()
                removed += 1
                businesses_affected.add(biz_id)

    for biz_id in businesses_affected:
        recalculate_business_stats(biz_id)

    return {
        "orphaned_photos_removed": removed,
        "businesses_updated":      len(businesses_affected),
    }


# ---------------------------------------------------------------------------
# PATCH /api/admin/contributions/{id}/approve  (legacy — kept)
# ---------------------------------------------------------------------------

@router.patch("/contributions/{contribution_id}/approve", status_code=200)
def approve_contribution(contribution_id: str, authorization: str = Header(...)):
    require_admin(authorization)

    ref = db.collection("contributions").document(contribution_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail=f"Contribution '{contribution_id}' not found")

    ref.update({
        "status":     "approved",
        "approvedAt": datetime.now(timezone.utc).isoformat(),
        "approvedBy": require_admin(authorization),
    })

    return {"message": f"Contribution '{contribution_id}' approved"}


# ---------------------------------------------------------------------------
# POST /api/admin/users/{uid}/assign-business  (legacy — kept)
# ---------------------------------------------------------------------------

class AssignBusinessBody(BaseModel):
    business_id: str


@router.post("/users/{uid}/assign-business", status_code=200)
def assign_business_to_user(
    uid: str,
    body: AssignBusinessBody,
    authorization: str = Header(...),
):
    require_admin(authorization)

    biz_ref = db.collection("businesses").document(body.business_id)
    if not biz_ref.get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{body.business_id}' not found")

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    update = {"accountType": "business", "businessId": body.business_id}
    if user_doc.exists:
        user_ref.update(update)
    else:
        user_ref.set({**update, "bookmarks": [], "featurePreferences": []})

    return {"message": f"User '{uid}' assigned as owner of business '{body.business_id}'"}

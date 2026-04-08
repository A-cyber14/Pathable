from fastapi import APIRouter, HTTPException, Header
from datetime import datetime, timezone
from services.firebase import db
import firebase_admin.auth as firebase_auth

router = APIRouter()


def get_uid(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split("Bearer ")[1]
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_admin(uid: str) -> None:
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists or user_doc.to_dict().get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


# ---------------------------------------------------------------------------
# PATCH /api/admin/contributions/:id/approve
# ---------------------------------------------------------------------------

@router.patch("/contributions/{contribution_id}/approve", status_code=200)
def approve_contribution(contribution_id: str, authorization: str = Header(...)):
    uid = get_uid(authorization)
    require_admin(uid)

    ref = db.collection("contributions").document(contribution_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail=f"Contribution '{contribution_id}' not found")

    ref.update({
        "status":     "approved",
        "approvedAt": datetime.now(timezone.utc).isoformat(),
        "approvedBy": uid,
    })

    return {"message": f"Contribution '{contribution_id}' approved"}


# ---------------------------------------------------------------------------
# DELETE /api/admin/reviews/:id
# Hard-deletes a review. For use when a review contains obscenities or is
# otherwise harmful. Reviews are not moderation-gated on submission — this
# endpoint exists purely for post-publish removal.
# Recalculates community_score after deletion.
# ---------------------------------------------------------------------------

@router.delete("/reviews/{review_id}", status_code=200)
def delete_review(review_id: str, authorization: str = Header(...)):
    uid = get_uid(authorization)
    require_admin(uid)

    ref = db.collection("reviews").document(review_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found")

    business_id = doc.to_dict().get("business_id")
    ref.delete()

    # Recalculate community_score and review_count with the deleted review removed
    if business_id and db.collection("businesses").document(business_id).get().exists:
        from routers.reviews import _recalculate_community_stats
        _recalculate_community_stats(business_id)

    return {"message": f"Review '{review_id}' deleted"}

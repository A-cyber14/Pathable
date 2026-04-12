from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, timezone
from services.firebase import db
from services.scoring import calculate_accessibility_score
from services.stats import recalculate_business_stats
from models.business import Business
import firebase_admin.auth as firebase_auth

router = APIRouter()

REVIEWS_COLLECTION = "reviews"
BUSINESSES_COLLECTION = "businesses"


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
# Request model
# ---------------------------------------------------------------------------

class ReviewSubmission(BaseModel):
    business_id:           str
    rating:                int           # required, 1–5
    comment:               str           # required, min 10 chars after strip
    wheelchair_accessible:        bool
    accessible_parking:           bool
    accessible_restrooms:         bool
    elevator:                     bool
    auto_doors:                   bool
    entrance_width_rating:        str           # "narrow", "standard", "wide"
    wheelchair_accessible_tables: Optional[bool] = None
    handrails_available:          Optional[bool] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError("rating must be between 1 and 5")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError("comment must be at least 10 characters")
        return v.strip()

    @field_validator("entrance_width_rating")
    @classmethod
    def validate_entrance_width(cls, v):
        if v not in ("narrow", "standard", "wide"):
            raise ValueError('entrance_width_rating must be "narrow", "standard", or "wide"')
        return v



# ---------------------------------------------------------------------------
# POST /api/reviews
# Requires authentication. Reviews go live immediately — no admin gate.
# Admins can delete harmful reviews via DELETE /api/admin/reviews/:id.
# ---------------------------------------------------------------------------

@router.post("/", status_code=201)
def submit_review(review: ReviewSubmission, authorization: str = Header(...)):
    uid = get_uid(authorization)

    business_ref = db.collection(BUSINESSES_COLLECTION).document(review.business_id)
    if not business_ref.get().exists:
        raise HTTPException(status_code=404, detail=f"Business '{review.business_id}' not found")

    db.collection(REVIEWS_COLLECTION).add({
        "business_id":           review.business_id,
        "submittedBy":           uid,
        "rating":                review.rating,
        "comment":               review.comment,   # already stripped by validator
        "wheelchair_accessible":        review.wheelchair_accessible,
        "accessible_parking":           review.accessible_parking,
        "accessible_restrooms":         review.accessible_restrooms,
        "elevator":                     review.elevator,
        "auto_doors":                   review.auto_doors,
        "entrance_width_rating":        review.entrance_width_rating,
        "wheelchair_accessible_tables": review.wheelchair_accessible_tables,
        "handrails_available":          review.handrails_available,
        "status":                "approved",
        "submitted_at":          datetime.now(timezone.utc).isoformat(),
    })

    recalculate_business_stats(review.business_id)

    return {
        "message":     "Review submitted successfully",
        "business_id": review.business_id,
    }


# ---------------------------------------------------------------------------
# POST /api/reviews/{review_id}/response
# Allows a business owner to add a single response to a review.
# The user must have role="business" and their businessId must match
# the review's business_id.
# ---------------------------------------------------------------------------

class ReviewResponseBody(BaseModel):
    message: str

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        if not v or len(v.strip()) < 1:
            raise ValueError("Response message cannot be empty")
        return v.strip()


@router.post("/{review_id}/response", status_code=200)
def respond_to_review(
    review_id: str,
    body: ReviewResponseBody,
    authorization: str = Header(...),
):
    uid = get_uid(authorization)

    ref = db.collection(REVIEWS_COLLECTION).document(review_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found")

    review_data = doc.to_dict()
    business_id = review_data.get("business_id")

    # Verify the requesting user owns this business.
    # Accepts accountType="business" (new onboarding) or role="business" (legacy admin assignment).
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=403, detail="You don't own this business")
    user_data   = user_doc.to_dict()
    is_business = (
        user_data.get("accountType") == "business"
        or user_data.get("role") == "business"
    )
    if not is_business or user_data.get("businessId") != business_id:
        raise HTTPException(status_code=403, detail="You don't own this business")

    ref.update({
        "response": {
            "message":   body.message,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
    })

    return {"message": "Response added successfully"}

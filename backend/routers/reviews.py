from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.firebase import db
from services.scoring import calculate_accessibility_score
from models.business import Business

router = APIRouter()

REVIEWS_COLLECTION = "reviews"
BUSINESSES_COLLECTION = "businesses"


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class ReviewSubmission(BaseModel):
    business_id: str
    wheelchair_accessible: bool
    accessible_parking: bool
    entrance_width_rating: str          # "narrow", "standard", "wide"
    comment: Optional[str] = None


# ---------------------------------------------------------------------------
# POST /api/reviews
# Submits a review for a business and recalculates community_score
# ---------------------------------------------------------------------------

@router.post("/", status_code=201)
def submit_review(review: ReviewSubmission):

    # 1. Confirm the business exists
    business_ref = db.collection(BUSINESSES_COLLECTION).document(review.business_id)
    business_doc = business_ref.get()
    if not business_doc.exists:
        raise HTTPException(
            status_code=404,
            detail=f"Business '{review.business_id}' not found"
        )

    # 2. Write the review document to Firestore
    review_data = {
        "business_id": review.business_id,
        "wheelchair_accessible": review.wheelchair_accessible,
        "accessible_parking": review.accessible_parking,
        "entrance_width_rating": review.entrance_width_rating,
        "comment": review.comment,
        "status": "pending_review",     # per PRD moderation flow
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    db.collection(REVIEWS_COLLECTION).add(review_data)

    # 3. Recalculate community_score from all approved reviews for this business
    approved_reviews = (
        db.collection(REVIEWS_COLLECTION)
        .where("business_id", "==", review.business_id)
        .where("status", "==", "approved")
        .stream()
    )

    scores = []
    for r in approved_reviews:
        r_data = r.to_dict()
        # Build a minimal Business to pass into the scoring function
        temp_business = Business(
            id=review.business_id,
            name="",
            address="",
            latitude=0.0,
            longitude=0.0,
            wheelchair_accessible=r_data.get("wheelchair_accessible", False),
            accessible_parking=r_data.get("accessible_parking", False),
            entrance_width_rating=r_data.get("entrance_width_rating"),
            community_score=None,
            photos=[],
        )
        scores.append(calculate_accessibility_score(temp_business))

    # 4. Update business community_score as average of all approved review scores
    #    If no approved reviews yet, community_score remains unchanged
    if scores:
        new_community_score = round(sum(scores) / len(scores), 2)
        business_ref.update({"community_score": new_community_score})

    return {
        "message": "Review submitted successfully and is pending approval",
        "business_id": review.business_id,
    }

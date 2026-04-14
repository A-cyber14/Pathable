"""
Shared helper — recompute and persist all business contribution stats in one
Firestore write. Call this after any review, photo, or feature submission.

Fields updated on the business document:
  community_score     — average star rating across approved reviews
  review_count        — number of approved reviews
  photo_count         — number of photos currently in the photos subcollection
  contributors_count  — number of unique users who submitted approved reviews
                        or photos (counted from live photos subcollection, not contributions)
  last_updated        — ISO-8601 UTC timestamp of this update
"""

from datetime import datetime, timezone
from services.firebase import db

BUSINESSES_COLLECTION = "businesses"
REVIEWS_COLLECTION    = "reviews"
CONTRIBUTIONS_COLLECTION = "contributions"


def recalculate_business_stats(business_id: str) -> None:
    """Recompute community_score, review_count, photo_count, contributors_count, and last_updated."""

    # ── Reviews ───────────────────────────────────────────────────────────────
    review_docs = list(
        db.collection(REVIEWS_COLLECTION)
        .where("business_id", "==", business_id)
        .where("status", "==", "approved")
        .stream()
    )

    ratings      = [d.to_dict().get("rating") for d in review_docs if isinstance(d.to_dict().get("rating"), int)]
    review_uids  = {d.to_dict().get("submittedBy") for d in review_docs if d.to_dict().get("submittedBy")}

    review_count    = len(ratings)
    community_score = round(sum(ratings) / review_count, 1) if review_count > 0 else None

    # ── Photos (read from the subcollection — the real source of truth) ─────────
    # The contributions collection is an audit trail and may contain entries for
    # photos that have since been deleted. Counting from the photos subcollection
    # ensures the stats always reflect what is actually visible.
    photo_docs = list(
        db.collection(BUSINESSES_COLLECTION)
        .document(business_id)
        .collection("photos")
        .stream()
    )
    photo_uids  = {d.to_dict().get("uploadedBy") for d in photo_docs if d.to_dict().get("uploadedBy")}
    photo_count = len(photo_docs)

    contributors_count = len(review_uids | photo_uids)

    # ── Single write ──────────────────────────────────────────────────────────
    db.collection(BUSINESSES_COLLECTION).document(business_id).update({
        "community_score":    community_score,
        "review_count":       review_count,
        "contributors_count": contributors_count,
        "photo_count":        photo_count,
        "last_updated":       datetime.now(timezone.utc).isoformat(),
    })

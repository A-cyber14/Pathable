# ---------------------------------------------------------------------------
# Accessibility contribution aggregation
#
# This is the missing link between a user's contribution (a review's
# accessibility checkboxes, or an Access Info / Features submission) and the
# business document that the UI actually reads (QuickSummary, CheckRow,
# PathableRatingBadge, and calculate_accessibility_score all read
# business.wheelchair_accessible etc. directly — see models/business.py).
#
# Rule (deliberately simple and safe — see decide_updates docstring):
#   - A field a business has never had data for is set by the first report.
#   - A report that agrees with the current value reinforces it (confirmation
#     count goes up) — this is what the "Confirmed by N contributors" chips
#     in BusinessDetailPage.jsx now reflect for real, instead of a proxy.
#   - A report that disagrees with an already-known value NEVER silently
#     overwrites it. It's recorded as a conflict instead, so the UI can
#     surface "N conflicting reports" and a human can look into it later.
# This means one bad-faith or mistaken submission can only ever affect
# currently-unknown fields — it can't destroy existing business data.
# ---------------------------------------------------------------------------

from datetime import datetime, timezone
from firebase_admin import firestore
from services.firebase import db

BUSINESSES_COLLECTION = "businesses"

# reports keys are business-document field names, so the same helper works
# for both review submissions and features/access-info submissions.
ACCESSIBILITY_FIELDS = (
    "wheelchair_accessible",
    "accessible_parking",
    "accessible_restrooms",
    "elevator",
    "auto_doors",
    "wheelchair_accessible_tables",
    "handrails_available",
    "entrance_width_rating",
    "hearing_assistance",
    "braille_signage",
    "sensory_friendly",
    "service_animal_support",
)


def decide_updates(current: dict, reports: dict) -> tuple[dict, dict, dict]:
    """
    Pure decision logic — no Firestore access, so it's directly unit-testable.

    Args:
        current: the business document's current field values (dict-like).
        reports: field_name -> reported value. None/missing values are
                 skipped — a contributor reporting nothing about a field
                 must never affect it.

    Returns:
        (field_updates, confirmation_increments, conflict_increments)
        - field_updates: fields to set directly on the business doc (only
          ever fields that were previously unset).
        - confirmation_increments: field -> 1, for fields to bump in
          accessibility_confirmations.
        - conflict_increments: field -> 1, for fields to bump in
          accessibility_conflicts.
    """
    field_updates: dict = {}
    confirmations: dict = {}
    conflicts: dict = {}

    for field in ACCESSIBILITY_FIELDS:
        if field not in reports:
            continue
        value = reports[field]
        if value is None:
            continue
        # Firestore stores unset optional fields as either absent or None —
        # both mean "unknown" here.
        current_value = current.get(field)

        if current_value is None:
            field_updates[field] = value
            confirmations[field] = 1
        elif current_value == value:
            confirmations[field] = 1
        else:
            conflicts[field] = 1

    return field_updates, confirmations, conflicts


def apply_accessibility_report(business_id: str, reports: dict) -> bool:
    """
    Reads the business doc, decides what should change, and writes it in one
    update() call. Returns False (no-op) if the business doesn't exist or
    nothing in `reports` was actionable.
    """
    biz_ref = db.collection(BUSINESSES_COLLECTION).document(business_id)
    biz_doc = biz_ref.get()
    if not biz_doc.exists:
        return False

    current = biz_doc.to_dict()
    field_updates, confirmations, conflicts = decide_updates(current, reports)

    if not field_updates and not confirmations and not conflicts:
        return False

    update_payload: dict = dict(field_updates)
    for field in confirmations:
        update_payload[f"accessibility_confirmations.{field}"] = firestore.Increment(1)
    for field in conflicts:
        update_payload[f"accessibility_conflicts.{field}"] = firestore.Increment(1)

    update_payload["last_updated"] = datetime.now(timezone.utc).isoformat()
    biz_ref.update(update_payload)
    return True

from models.business import Business

# ---------------------------------------------------------------------------
# Scoring weights — must match calculatePathableScore() in BusinessDetailPage.jsx
#
# Features (0–50):
#   wheelchair_accessible   15 pts
#   accessible_parking      10 pts
#   entrance_width          10 pts  (standard or wide)
#   accessible_restrooms     8 pts
#   elevator                 4 pts
#   auto_doors               3 pts
#
# Preference match (0–30):
#   Backend has no user context — always returns neutral 15/30.
#   The frontend modal overrides this with the real user preference score.
#
# Confidence (0–20):
#   Feature completeness  → max 10   (filled_fields / 6) * 10
#   Review volume         → max 5    stepped scale (see _review_volume_score)
#   Contribution volume   → max 5    same stepped scale
#
# Total: features + 15 + confidence  (max = 50 + 15 + 20 = 85 without preferences)
# ---------------------------------------------------------------------------

FEATURE_WEIGHTS = [
    ("wheelchair_accessible", 15),
    ("accessible_parking",    10),
    ("entrance_width",        10),   # virtual key — see logic below
    ("accessible_restrooms",   8),
    ("elevator",               4),
    ("auto_doors",             3),
]

NEUTRAL_PREFERENCE_SCORE = 15   # matches frontend: no prefs → 15/30


def _volume_score(count: int | None) -> int:
    """
    Stepped confidence bonus for review or contribution volume.
    0 → 0 pts | 1-3 → 1 | 4-10 → 2 | 11-25 → 3 | 26-50 → 4 | 50+ → 5
    """
    n = count or 0
    if n == 0:   return 0
    if n <= 3:   return 1
    if n <= 10:  return 2
    if n <= 25:  return 3
    if n <= 50:  return 4
    return 5


def calculate_accessibility_score(
    business: Business,
    review_count: int | None = None,
    contribution_count: int | None = None,
) -> int:
    """
    Compute a deterministic 0–100 accessibility score.

    Weights match calculatePathableScore() in BusinessDetailPage.jsx so the
    badge number (from backend) and the modal breakdown (from frontend) are
    always consistent.

    Args:
        business:           A Business model instance.
        review_count:       Number of approved reviews for this business.
        contribution_count: Number of approved contributions for this business.

    Returns:
        Integer score between 0 and 100 (inclusive).
    """

    # --- 1. FEATURES SCORE (0–50) ---
    features_score = 0
    filled_fields  = 0

    for key, weight in FEATURE_WEIGHTS:
        if key == "entrance_width":
            present = business.entrance_width_rating in ("wide", "standard")
            filled  = business.entrance_width_rating is not None
        else:
            value   = getattr(business, key, None)
            present = bool(value)
            filled  = value is not None

        if present:
            features_score += weight
        if filled:
            filled_fields += 1

    # --- 2. PREFERENCE SCORE (fixed neutral — no user context on backend) ---
    preference_score = NEUTRAL_PREFERENCE_SCORE

    # --- 3. CONFIDENCE SCORE (0–20) ---
    total_fields           = len(FEATURE_WEIGHTS)
    feature_confidence     = round((filled_fields / total_fields) * 10)
    review_confidence      = _volume_score(review_count)
    contribution_confidence = _volume_score(contribution_count)
    confidence_score       = feature_confidence + review_confidence + contribution_confidence

    total = features_score + preference_score + confidence_score
    return min(total, 100)

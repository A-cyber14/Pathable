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
#   (filled feature fields / 6) * 20
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


def calculate_accessibility_score(business: Business) -> int:
    """
    Compute a deterministic 0–100 accessibility score.

    Weights match calculatePathableScore() in BusinessDetailPage.jsx so the
    badge number (from backend) and the modal breakdown (from frontend) are
    always consistent.

    Args:
        business: A Business model instance.

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
    total_fields     = len(FEATURE_WEIGHTS)
    confidence_score = round((filled_fields / total_fields) * 20)

    total = features_score + preference_score + confidence_score
    return min(total, 100)

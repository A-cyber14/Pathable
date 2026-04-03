from models.business import Business

# ---------------------------------------------------------------------------
<<<<<<< HEAD
# Scoring weights — must sum to 100
# ---------------------------------------------------------------------------
#
# wheelchair_accessible   40 pts   Core requirement — highest weight
# accessible_parking      20 pts   Critical for many mobility aid users
# entrance_width_rating   30 pts   narrow=0, standard=15, wide=30
# community_score         10 pts   User-reported, scaled from 0–5 → 0–10
#
# ---------------------------------------------------------------------------

WEIGHTS = {
    "wheelchair_accessible": 40,
    "accessible_parking": 20,
    "entrance_width_wide": 30,
    "entrance_width_standard": 15,
    "community_score_max": 10,
}

ENTRANCE_WIDTH_SCORES = {
    "wide": 30,
    "standard": 15,
    "narrow": 0,
}
=======
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
>>>>>>> origin/main


def calculate_accessibility_score(business: Business) -> int:
    """
<<<<<<< HEAD
    Calculate a deterministic accessibility score from 0–100.
=======
    Compute a deterministic 0–100 accessibility score.

    Weights match calculatePathableScore() in BusinessDetailPage.jsx so the
    badge number (from backend) and the modal breakdown (from frontend) are
    always consistent.
>>>>>>> origin/main

    Args:
        business: A Business model instance.

    Returns:
        Integer score between 0 and 100 (inclusive).
    """
<<<<<<< HEAD
    score = 0

    # Wheelchair accessible — 40 pts
    if business.wheelchair_accessible:
        score += WEIGHTS["wheelchair_accessible"]

    # Accessible parking — 20 pts
    if business.accessible_parking:
        score += WEIGHTS["accessible_parking"]

    # Entrance width rating — up to 30 pts
    if business.entrance_width_rating:
        score += ENTRANCE_WIDTH_SCORES.get(business.entrance_width_rating.lower(), 0)

    # Community score — scale 0–5 input to 0–10 pts
    if business.community_score is not None:
        community_score_clamped = max(0.0, min(5.0, business.community_score))
        score += round((community_score_clamped / 5.0) * WEIGHTS["community_score_max"])

    return min(score, 100)
=======

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
>>>>>>> origin/main

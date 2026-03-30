from models.business import Business

# ---------------------------------------------------------------------------
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


def calculate_accessibility_score(business: Business) -> int:
    """
    Calculate a deterministic accessibility score from 0–100.

    Args:
        business: A Business model instance.

    Returns:
        Integer score between 0 and 100 (inclusive).
    """
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

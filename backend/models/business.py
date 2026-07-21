from pydantic import BaseModel
from typing import Optional, Union


class Business(BaseModel):
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    wheelchair_accessible: bool
    accessible_parking: bool
    entrance_width_rating: Optional[str]  = None  # "narrow", "standard", "wide"
    accessible_restrooms:  Optional[bool] = None
    elevator:              Optional[bool] = None
    auto_doors:                   Optional[bool] = None
    wheelchair_accessible_tables: Optional[bool] = None
    handrails_available:          Optional[bool] = None
    # Additional tri-state accessibility features (True/False/None = Yes/No/Unsure),
    # same convention as the fields above. See accessibilityNotApplicable for "N/A".
    hearing_assistance:      Optional[bool] = None
    braille_signage:         Optional[bool] = None
    sensory_friendly:        Optional[bool] = None
    service_animal_support:  Optional[bool] = None
    accessibilityNotes:          Optional[dict[str, str]] = None  # feature key -> short note
    accessibilityNotApplicable:  Optional[list[str]]      = None  # feature keys marked N/A
    description:           Optional[str]   = None   # business owner bio / description
    community_score:       Optional[float] = None   # avg star rating from reviews
    review_count:          Optional[int]   = None   # number of approved reviews
    contributors_count:    Optional[int]   = None   # unique users who contributed reviews or photos
    last_updated:          Optional[str]   = None   # ISO-8601 UTC, set on any contribution
    accessibility_score:   Optional[int]   = None   # computed at read time, not stored
    photos: list[str] = []

    # ── Business profile / onboarding fields (all optional — additive) ────────
    category:              Optional[str]  = None
    phone:                 Optional[str]  = None
    website:               Optional[str]  = None
    businessEmail:         Optional[str]  = None   # contact email, separate from the owner's login email
    businessEmailPublic:   Optional[bool] = False  # only show businessEmail publicly if the owner opts in
    # Per weekday: either a legacy free-text string ("9:00 AM - 5:00 PM", "Closed")
    # from before the structured editor existed, or a list of {open, close} 24h
    # "HH:MM" period objects (empty list = closed, multiple = split hours like
    # lunch/dinner). Both shapes can coexist across different days on the same
    # business until each day is re-saved through the structured editor.
    hours: Optional[dict[str, Union[str, list[dict[str, str]]]]] = None
    socialLinks:            Optional[dict[str, str]] = None  # e.g. {"instagram": "https://instagram.com/..."}
    ownerUserId:            Optional[str]  = None   # uid of the account that manages this listing
    selectedPlan:           Optional[str]  = None   # "freemium" | "beta" | "premium"
    # paymentStatus/subscriptionStatus are only ever set by Stripe webhooks (or
    # activate-free for Freemium) — never by plan selection. See routers/billing.py.
    paymentStatus:          Optional[str]  = None   # None | "active"
    subscriptionStatus:     Optional[str]  = None   # "active" | "past_due" | "canceled" | "incomplete"
    stripeCustomerId:       Optional[str]  = None
    stripeSubscriptionId:   Optional[str]  = None
    businessOnboardingStep: Optional[str]  = None
    businessTutorialCompleted: Optional[bool] = False


class BusinessSummary(BaseModel):
    """Lightweight version returned in list/search results."""
    id: str
    name: str
    address: str
    latitude: float
    longitude: float
    wheelchair_accessible: bool
    accessible_parking: bool
    accessible_restrooms:  Optional[bool] = None
    elevator:              Optional[bool] = None
    auto_doors:                   Optional[bool] = None
    wheelchair_accessible_tables: Optional[bool] = None
    handrails_available:          Optional[bool] = None
    community_score:       Optional[float] = None   # avg star rating from reviews
    review_count:          Optional[int]   = None   # number of approved reviews
    contributors_count:    Optional[int]   = None   # unique users who contributed reviews or photos
    last_updated:          Optional[str]   = None   # ISO-8601 UTC, set on any contribution
    accessibility_score:   Optional[int]   = None   # computed at read time, not stored
    category:              Optional[str]   = None
    verified:               Optional[bool] = None   # Pathable-reviewed accessibility info (unrelated to ownership)
    claimed:                 Optional[bool] = None   # whether a business account already manages this listing

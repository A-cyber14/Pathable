from pydantic import BaseModel
from typing import Optional


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
    description:           Optional[str]   = None   # business owner bio / description
    community_score:       Optional[float] = None   # avg star rating from reviews
    review_count:          Optional[int]   = None   # number of approved reviews
    contributors_count:    Optional[int]   = None   # unique users who contributed reviews or photos
    last_updated:          Optional[str]   = None   # ISO-8601 UTC, set on any contribution
    accessibility_score:   Optional[int]   = None   # computed at read time, not stored
    photos: list[str] = []


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

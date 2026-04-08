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
    auto_doors:            Optional[bool] = None
    community_score:       Optional[float] = None   # avg star rating from reviews
    review_count:          Optional[int]   = None   # number of approved reviews
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
    auto_doors:            Optional[bool] = None
    community_score:       Optional[float] = None   # avg star rating from reviews
    review_count:          Optional[int]   = None   # number of approved reviews
    accessibility_score:   Optional[int]   = None   # computed at read time, not stored

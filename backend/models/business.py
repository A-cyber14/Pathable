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
    entrance_width_rating: Optional[str] = None   # "narrow", "standard", "wide"
    community_score: Optional[float] = None
    accessibility_score: Optional[int] = None     # computed by scoring.py, not stored
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
    community_score: Optional[float] = None
    accessibility_score: Optional[int] = None     # computed by scoring.py, not stored

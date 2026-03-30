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
    entrance_width_rating: Optional[str] = None  # e.g. "narrow", "standard", "wide"
    community_score: Optional[float] = None       # placeholder — scoring logic is post-v1
    photos: list[str] = []                        # Firebase Storage URLs


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

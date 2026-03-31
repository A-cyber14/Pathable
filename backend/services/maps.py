"""
services/maps.py
----------------
Lazy singleton for the Google Maps Python client.
Used only for Places text search (proxied through FastAPI — key never on frontend).

Usage:
    from services.maps import get_maps_client
    client = get_maps_client()   # None if GOOGLE_MAPS_API_KEY not set
"""

import os
import googlemaps
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_maps_client():
    """Return a cached googlemaps.Client, or None if the API key is missing."""
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        if api_key:
            _client = googlemaps.Client(key=api_key)
    return _client

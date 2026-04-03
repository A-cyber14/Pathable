"""
Pathable — Firestore Seed Script
=================================
<<<<<<< HEAD
Populates Firestore with the Pinellas County partner businesses.

USAGE:
    cd backend
    python scripts/seed_locations.py

TO UPDATE BUSINESS DATA:
    Edit the BUSINESSES list below — that is the only section you need to touch.
    Each entry is a plain dictionary. Do not change anything below the
    "--- DO NOT EDIT BELOW THIS LINE ---" comment.
"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.firebase import db

# ===========================================================================
# EDIT THIS SECTION
# ===========================================================================

=======
Run: cd backend && python scripts/seed_locations.py
Edit only the BUSINESSES list below.
"""

import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from services.firebase import db

>>>>>>> origin/main
BUSINESSES = [
    {
        "id": "clearwater-public-library",
        "name": "Clearwater Public Library",
        "address": "100 N Osceola Ave, Clearwater, FL 33755",
        "latitude": 27.9659,
        "longitude": -82.8001,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "wide",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              True,
        "auto_doors":            True,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "st-pete-pier",
        "name": "St. Pete Pier",
        "address": "600 2nd Ave NE, St. Petersburg, FL 33701",
        "latitude": 27.7724,
        "longitude": -82.6295,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "wide",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            True,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "largo-medical-center",
        "name": "Largo Medical Center",
        "address": "201 14th St SW, Largo, FL 33770",
        "latitude": 27.9087,
        "longitude": -82.7873,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "wide",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              True,
        "auto_doors":            True,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "disability-achievement-center",
        "name": "Disability Achievement Center",
        "address": "2189 Cleveland St, Clearwater, FL 33765",
        "latitude": 27.9555,
        "longitude": -82.7867,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "wide",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            True,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "suncoast-hospice-clearwater",
        "name": "Suncoast Hospice — Clearwater",
        "address": "3050 Healthcare Rd, Clearwater, FL 33759",
        "latitude": 27.9874,
        "longitude": -82.7451,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "standard",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            False,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "pinellas-park-rec-center",
        "name": "Pinellas Park Recreation Center",
        "address": "7625 59th St N, Pinellas Park, FL 33781",
        "latitude": 27.8561,
        "longitude": -82.6993,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "wide",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            False,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "safety-harbor-library",
        "name": "Safety Harbor Public Library",
        "address": "101 2nd St N, Safety Harbor, FL 34695",
        "latitude": 28.0034,
        "longitude": -82.6927,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "standard",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            False,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "dunedin-community-center",
        "name": "Dunedin Community Center",
        "address": "1920 Pinehurst Rd, Dunedin, FL 34698",
        "latitude": 28.0194,
        "longitude": -82.7728,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "standard",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  False,
        "elevator":              False,
        "auto_doors":            False,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "tarpon-springs-aquarium",
        "name": "Tarpon Springs Aquarium",
        "address": "850 Dodecanese Blvd, Tarpon Springs, FL 34689",
        "latitude": 28.1500,
        "longitude": -82.7543,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "standard",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  False,
        "elevator":              False,
        "auto_doors":            False,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "st-pete-shuffle",
        "name": "St. Pete Shuffle",
        "address": "2560 Central Ave, St. Petersburg, FL 33712",
        "latitude": 27.7711,
        "longitude": -82.6742,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": False,
        "entrance_width_rating": "standard",
=======
        "accessible_parking":    False,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  False,
        "elevator":              False,
        "auto_doors":            False,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
    {
        "id": "chipotle-palm-harbor",
        "name": "Chipotle Mexican Grill",
        "address": "35044 US Hwy 19 N, Palm Harbor, FL 34684",
        "latitude": 28.0847,
        "longitude": -82.7326,
        "wheelchair_accessible": True,
<<<<<<< HEAD
        "accessible_parking": True,
        "entrance_width_rating": "standard",
=======
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            False,
>>>>>>> origin/main
        "community_score": None,
        "photos": [],
    },
]

# ===========================================================================
# DO NOT EDIT BELOW THIS LINE
# ===========================================================================

def seed():
    collection = db.collection("businesses")
    seeded = 0
    skipped = 0

    print(f"Starting seed — {len(BUSINESSES)} businesses to process...\n")

    for business in BUSINESSES:
<<<<<<< HEAD
        doc_id = business["id"]
=======
        doc_id  = business["id"]
>>>>>>> origin/main
        doc_ref = collection.document(doc_id)

        if doc_ref.get().exists:
            print(f"  SKIP  {doc_id} — already exists in Firestore")
            skipped += 1
            continue

        data = {k: v for k, v in business.items() if k != "id"}
        doc_ref.set(data)
        print(f"  OK    {doc_id}")
        seeded += 1

    print(f"\nDone. {seeded} inserted, {skipped} skipped.")


if __name__ == "__main__":
    seed()

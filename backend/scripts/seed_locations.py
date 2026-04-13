"""
Pathable — Firestore Seed Script
=================================
Run: cd backend && python scripts/seed_locations.py
Edit only the BUSINESSES list below.
"""

import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from services.firebase import db

BUSINESSES = [
    # -----------------------------------------------------------------------
    # Clearwater Public Library — fully documented, highly verified
    # Score: wheelchair(15)+parking(10)+entrance_wide(10)+restrooms(8)+elevator(4)+auto(3)=50
    #        + neutral_pref(15) + feature_conf(10)+review_conf(2) = 77
    # -----------------------------------------------------------------------
    {
        "id": "clearwater-public-library",
        "name": "Clearwater Public Library",
        "address": "100 N Osceola Ave, Clearwater, FL 33755",
        "latitude": 27.9659,
        "longitude": -82.8001,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              True,
        "auto_doors":            True,
        "review_count":          7,
        "contributors_count":    9,
        "last_updated":          "2026-04-05T14:23:11Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Largo Medical Center — all features confirmed, well-documented
    # Score: 50 + 15 + (10+3) = 78
    # -----------------------------------------------------------------------
    {
        "id": "largo-medical-center",
        "name": "Largo Medical Center",
        "address": "201 14th St SW, Largo, FL 33770",
        "latitude": 27.9087,
        "longitude": -82.7873,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              True,
        "auto_doors":            True,
        "review_count":          11,
        "contributors_count":    14,
        "last_updated":          "2026-04-08T09:15:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Disability Achievement Center — disability org, most-verified location
    # No elevator, but everything else confirmed + highest contributor count
    # Score: (15+10+10+8+3=46) + 15 + (8+3) = 72
    # -----------------------------------------------------------------------
    {
        "id": "disability-achievement-center",
        "name": "Disability Achievement Center",
        "address": "2189 Cleveland St, Clearwater, FL 33765",
        "latitude": 27.9555,
        "longitude": -82.7867,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            True,
        "review_count":          14,
        "contributors_count":    18,
        "last_updated":          "2026-04-09T11:30:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # St. Pete Pier — public outdoor space, well-documented
    # Score: (15+10+10+8+3=46) + 15 + (8+2) = 71
    # -----------------------------------------------------------------------
    {
        "id": "st-pete-pier",
        "name": "St. Pete Pier",
        "address": "600 2nd Ave NE, St. Petersburg, FL 33701",
        "latitude": 27.7724,
        "longitude": -82.6295,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            True,
        "review_count":          5,
        "contributors_count":    6,
        "last_updated":          "2026-03-20T08:00:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Chipotle Mexican Grill — pilot location, data untouched
    # -----------------------------------------------------------------------
    {
        "id": "chipotle-palm-harbor",
        "name": "Chipotle Mexican Grill",
        "address": "35044 US Hwy 19 N, Palm Harbor, FL 34684",
        "latitude": 28.0847,
        "longitude": -82.7326,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  True,
        "elevator":              False,
        "auto_doors":            False,
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Suncoast Hospice — basic features confirmed, limited detail data
    # elevator/auto_doors not yet verified (None = unconfirmed, not absent)
    # Score: (15+10+10+8=43) + 15 + (7+1) = 66
    # -----------------------------------------------------------------------
    {
        "id": "suncoast-hospice-clearwater",
        "name": "Suncoast Hospice — Clearwater",
        "address": "3050 Healthcare Rd, Clearwater, FL 33759",
        "latitude": 27.9874,
        "longitude": -82.7451,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  True,
        "elevator":              None,
        "auto_doors":            None,
        "review_count":          2,
        "contributors_count":    3,
        "last_updated":          "2026-02-14T12:00:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Pinellas Park Recreation Center — moderate features, limited verification
    # elevator/auto_doors/restrooms not yet reported
    # Score: (15+10+10=35) + 15 + (5+1) = 56
    # -----------------------------------------------------------------------
    {
        "id": "pinellas-park-rec-center",
        "name": "Pinellas Park Recreation Center",
        "address": "7625 59th St N, Pinellas Park, FL 33781",
        "latitude": 27.8561,
        "longitude": -82.6993,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "wide",
        "accessible_restrooms":  None,
        "elevator":              None,
        "auto_doors":            None,
        "review_count":          1,
        "contributors_count":    2,
        "last_updated":          "2026-03-01T10:00:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Safety Harbor Public Library — small branch, minimal contributor data
    # Score: (15+10+10=35) + 15 + (5+0) = 55
    # -----------------------------------------------------------------------
    {
        "id": "safety-harbor-library",
        "name": "Safety Harbor Public Library",
        "address": "101 2nd St N, Safety Harbor, FL 34695",
        "latitude": 28.0034,
        "longitude": -82.6927,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  None,
        "elevator":              None,
        "auto_doors":            None,
        "review_count":          0,
        "contributors_count":    1,
        "last_updated":          "2026-01-05T10:00:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Dunedin Community Center — accessible entry, but restroom access is limited
    # elevator/auto_doors unverified; restrooms confirmed inaccessible
    # Score: (15+10+10+0=35) + 15 + (7+1) = 58
    # -----------------------------------------------------------------------
    {
        "id": "dunedin-community-center",
        "name": "Dunedin Community Center",
        "address": "1920 Pinehurst Rd, Dunedin, FL 34698",
        "latitude": 28.0194,
        "longitude": -82.7728,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  False,
        "elevator":              None,
        "auto_doors":            None,
        "review_count":          1,
        "contributors_count":    1,
        "last_updated":          "2026-02-28T09:00:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # Tarpon Springs Aquarium — tourist attraction, limited accessibility data
    # restroom/elevator/auto_doors not yet reported; needs more community input
    # Score: (15+10+10=35) + 15 + (5+1) = 56
    # -----------------------------------------------------------------------
    {
        "id": "tarpon-springs-aquarium",
        "name": "Tarpon Springs Aquarium",
        "address": "850 Dodecanese Blvd, Tarpon Springs, FL 34689",
        "latitude": 28.1500,
        "longitude": -82.7543,
        "wheelchair_accessible": True,
        "accessible_parking":    True,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  None,
        "elevator":              None,
        "auto_doors":            None,
        "review_count":          2,
        "contributors_count":    2,
        "last_updated":          "2026-01-20T16:00:00Z",
        "community_score": None,
        "photos": [],
    },
    # -----------------------------------------------------------------------
    # St. Pete Shuffle — entertainment venue, limited accessibility coverage
    # No accessible parking; restroom/elevator/auto_doors unverified
    # Score: (15+0+10=25) + 15 + (5+1) = 46
    # -----------------------------------------------------------------------
    {
        "id": "st-pete-shuffle",
        "name": "St. Pete Shuffle",
        "address": "2560 Central Ave, St. Petersburg, FL 33712",
        "latitude": 27.7711,
        "longitude": -82.6742,
        "wheelchair_accessible": True,
        "accessible_parking":    False,
        "entrance_width_rating": "standard",
        "accessible_restrooms":  None,
        "elevator":              None,
        "auto_doors":            None,
        "review_count":          3,
        "contributors_count":    2,
        "last_updated":          "2026-03-10T14:00:00Z",
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
        doc_id  = business["id"]
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

"""
One-time seed script — adds Anclote Pharmacy and Kwik Shop to Firestore.
Run from the backend/ directory:
    python scripts/seed_businesses.py

Safe to re-run: checks for an existing document with the same name+address
before writing so it won't create duplicates.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone
from services.firebase import db

BUSINESSES = [
    {
        "name":                        "Anclote Pharmacy",
        "address":                     "1933 N Pinellas Ave, Tarpon Springs, FL 34689",
        "latitude":                    28.1594,
        "longitude":                   -82.7567,
        "wheelchair_accessible":       None,
        "accessible_parking":          None,
        "accessible_restrooms":        None,
        "elevator":                    None,
        "auto_doors":                  None,
        "wheelchair_accessible_tables": None,
        "handrails_available":         None,
        "entrance_width_rating":       None,
        "description":                 None,
        "community_score":             None,
        "review_count":                0,
        "contributors_count":          0,
        "photos_count":                0,
        "pathable_verified":           True,
        "last_updated":                datetime.now(timezone.utc).isoformat(),
    },
    {
        "name":                        "Kwik Shop",
        "address":                     "9019 60th St, Pinellas Park, FL 33782",
        "latitude":                    27.8472,
        "longitude":                   -82.6953,
        "wheelchair_accessible":       None,
        "accessible_parking":          None,
        "accessible_restrooms":        None,
        "elevator":                    None,
        "auto_doors":                  None,
        "wheelchair_accessible_tables": None,
        "handrails_available":         None,
        "entrance_width_rating":       None,
        "description":                 None,
        "community_score":             None,
        "review_count":                0,
        "contributors_count":          0,
        "photos_count":                0,
        "pathable_verified":           True,
        "last_updated":                datetime.now(timezone.utc).isoformat(),
    },
]


def seed():
    collection = db.collection("businesses")
    for biz in BUSINESSES:
        # Dedup check — look for existing doc with same name + address
        existing = (
            collection
            .where("name",    "==", biz["name"])
            .where("address", "==", biz["address"])
            .limit(1)
            .get()
        )
        if existing:
            print(f"  SKIP (already exists): {biz['name']}")
            continue

        _, doc_ref = collection.add(biz)
        print(f"  ADDED [{doc_ref.id}]: {biz['name']}")


if __name__ == "__main__":
    print("Seeding businesses…")
    seed()
    print("Done.")

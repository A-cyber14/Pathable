"""
Pathable — Demo Data Update Script
====================================
Patches existing Firestore business documents with realistic
review_count, contributors_count, last_updated, and corrected
optional feature fields (None = not yet verified by community).

Chipotle (chipotle-palm-harbor) is intentionally excluded — its
data is the pilot data and must not be changed.

Run: cd backend && python scripts/update_demo_data.py
"""

import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from services.firebase import db

# Fields to patch per business.
# None values remove false-certainty from unverified optional fields.
# (Firestore stores None as null — the scoring backend treats null as "not filled".)
PATCHES = [
    {
        "id": "clearwater-public-library",
        "review_count":       7,
        "contributors_count": 9,
        "last_updated":       "2026-04-05T14:23:11Z",
        # All 6 features confirmed — no change needed
    },
    {
        "id": "largo-medical-center",
        "review_count":       11,
        "contributors_count": 14,
        "last_updated":       "2026-04-08T09:15:00Z",
        # All 6 features confirmed — no change needed
    },
    {
        "id": "disability-achievement-center",
        "review_count":       14,
        "contributors_count": 18,
        "last_updated":       "2026-04-09T11:30:00Z",
        # elevator=False, auto_doors=True — already realistic
    },
    {
        "id": "st-pete-pier",
        "review_count":       5,
        "contributors_count": 6,
        "last_updated":       "2026-03-20T08:00:00Z",
        # elevator=False already; keep all confirmed features
    },
    {
        "id": "suncoast-hospice-clearwater",
        "review_count":       2,
        "contributors_count": 3,
        "last_updated":       "2026-02-14T12:00:00Z",
        # elevator and auto_doors not verified — set to null
        "elevator":   None,
        "auto_doors": None,
    },
    {
        "id": "pinellas-park-rec-center",
        "review_count":       1,
        "contributors_count": 2,
        "last_updated":       "2026-03-01T10:00:00Z",
        # Only wheelchair + parking + entrance confirmed
        "accessible_restrooms": None,
        "elevator":             None,
        "auto_doors":           None,
    },
    {
        "id": "safety-harbor-library",
        "review_count":       0,
        "contributors_count": 1,
        "last_updated":       "2026-01-05T10:00:00Z",
        # Small branch — limited verification
        "accessible_restrooms": None,
        "elevator":             None,
        "auto_doors":           None,
    },
    {
        "id": "dunedin-community-center",
        "review_count":       1,
        "contributors_count": 1,
        "last_updated":       "2026-02-28T09:00:00Z",
        # Restrooms confirmed inaccessible (False); elevator/auto_doors unverified
        "elevator":   None,
        "auto_doors": None,
    },
    {
        "id": "tarpon-springs-aquarium",
        "review_count":       2,
        "contributors_count": 2,
        "last_updated":       "2026-01-20T16:00:00Z",
        # Tourist attraction — minimal community data on optional features
        "accessible_restrooms": None,
        "elevator":             None,
        "auto_doors":           None,
    },
    {
        "id": "st-pete-shuffle",
        "review_count":       3,
        "contributors_count": 2,
        "last_updated":       "2026-03-10T14:00:00Z",
        # No accessible parking (known); restroom/elevator/auto_doors unverified
        "accessible_restrooms": None,
        "elevator":             None,
        "auto_doors":           None,
    },
    # NOTE: chipotle-palm-harbor is intentionally excluded.
]


def update():
    collection = db.collection("businesses")
    updated  = 0
    skipped  = 0
    errors   = 0

    print(f"Starting update — {len(PATCHES)} businesses to patch...\n")
    print("  (chipotle-palm-harbor is excluded — pilot data is unchanged)\n")

    for patch in PATCHES:
        doc_id = patch["id"]
        doc_ref = collection.document(doc_id)

        if not doc_ref.get().exists:
            print(f"  SKIP  {doc_id} — not found in Firestore")
            skipped += 1
            continue

        fields = {k: v for k, v in patch.items() if k != "id"}

        try:
            doc_ref.update(fields)
            print(f"  OK    {doc_id}")
            updated += 1
        except Exception as e:
            print(f"  ERR   {doc_id} — {e}")
            errors += 1

    print(f"\nDone. {updated} updated, {skipped} not found, {errors} errors.")


if __name__ == "__main__":
    update()

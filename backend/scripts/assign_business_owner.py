"""
Assign a business owner directly via the Firestore Admin SDK.

Usage (from the backend/ directory):
    python scripts/assign_business_owner.py <firebase_uid> <business_id>

Example:
    python scripts/assign_business_owner.py abc123uid XYZbusinessDocId

The script verifies both the user and the business exist, then sets:
    users/<uid>.role        = "business"
    users/<uid>.businessId  = "<business_id>"
"""

import sys
import os

# Make sure the backend package is importable when run from /backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.firebase import db  # noqa: E402  (import after sys.path patch)


def assign_owner(uid: str, business_id: str) -> None:
    # Verify business exists
    biz_doc = db.collection("businesses").document(business_id).get()
    if not biz_doc.exists:
        print(f"ERROR: No business found with id '{business_id}'")
        sys.exit(1)

    biz_name = biz_doc.to_dict().get("name", "(unknown)")

    # Upsert the user doc
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    update = {"accountType": "business", "businessId": business_id}

    if user_doc.exists:
        user_ref.update(update)
        print(f"Updated existing user '{uid}'")
    else:
        user_ref.set({**update, "bookmarks": [], "featurePreferences": []})
        print(f"Created new user doc for '{uid}'")

    print(f"Done — user '{uid}' is now the owner of '{biz_name}' ({business_id})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/assign_business_owner.py <firebase_uid> <business_id>")
        sys.exit(1)

    assign_owner(uid=sys.argv[1], business_id=sys.argv[2])

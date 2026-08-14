import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Initialize Firebase Admin SDK (only once — guard against re-initialization)
# ---------------------------------------------------------------------------
# Supports two modes:
#   Production: reads JSON string from FIREBASE_CREDENTIALS_JSON env var
#               (paste the entire serviceAccountKey.json contents as a
#               Railway/Vercel secret — never commit the file itself)
#   Local dev:  falls back to serviceAccountKey.json on disk, via
#               FIREBASE_CREDENTIALS_PATH, when FIREBASE_CREDENTIALS_JSON
#               isn't set
# ---------------------------------------------------------------------------

if not firebase_admin._apps:
    credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

    if credentials_json:
        # Production — credentials passed as a JSON string env var
        try:
            cred = credentials.Certificate(json.loads(credentials_json))
        except json.JSONDecodeError as e:
            raise RuntimeError(
                "FIREBASE_CREDENTIALS_JSON is set but is not valid JSON. "
                "Its value must be the full, unmodified contents of your "
                "serviceAccountKey.json file, pasted as a single-line string."
            ) from e
    else:
        # Local dev — credentials loaded from file
        credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./serviceAccountKey.json")
        if not os.path.exists(credentials_path):
            raise RuntimeError(
                "No Firebase credentials configured. Set FIREBASE_CREDENTIALS_JSON "
                "to the full contents of serviceAccountKey.json for production, or "
                f"place the service account file at '{credentials_path}' (or point "
                "FIREBASE_CREDENTIALS_PATH at it) for local development."
            )
        cred = credentials.Certificate(credentials_path)

    firebase_admin.initialize_app(cred, {
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "")
    })

# ---------------------------------------------------------------------------
# Firestore client — import this in routers and services
# Usage: from services.firebase import db
# ---------------------------------------------------------------------------

db: firestore.Client = firestore.client()


def get_contributor_uid(doc: dict) -> str | None:
    """
    Read-time uid normalization across collections with different field names.
    Checks submittedBy first (reviews), then userId (contributions).
    Returns None if neither field is present or both are falsy.
    Documents where the uid field is null or missing are safely ignored.
    """
    return doc.get("submittedBy") or doc.get("userId") or None

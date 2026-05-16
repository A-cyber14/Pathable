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
#   Local dev:  reads serviceAccountKey.json from FIREBASE_CREDENTIALS_PATH
#   Production: reads JSON string from FIREBASE_CREDENTIALS_JSON env var
#               (paste the entire serviceAccountKey.json contents as a Railway secret)
# ---------------------------------------------------------------------------

if not firebase_admin._apps:
    credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

    if credentials_json:
        # Production (Railway) — credentials passed as a JSON string env var
        cred = credentials.Certificate(json.loads(credentials_json))
    else:
        # Local dev — credentials loaded from file
        credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./serviceAccountKey.json")
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

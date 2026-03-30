import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Initialize Firebase Admin SDK (only once — guard against re-initialization)
# ---------------------------------------------------------------------------

_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "./serviceAccountKey.json")

if not firebase_admin._apps:
    cred = credentials.Certificate(_CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred, {
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "")
    })

# ---------------------------------------------------------------------------
# Firestore client — import this in routers and services
# Usage: from services.firebase import db
# ---------------------------------------------------------------------------

db: firestore.Client = firestore.client()

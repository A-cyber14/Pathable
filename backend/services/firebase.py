import os, json
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

if not firebase_admin._apps:
    credentials_json = os.getenv("FIREBASE_CREDENTIALS_JSON")

    if credentials_json:
        cred = credentials.Certificate(json.loads(credentials_json))
    else:
        credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./serviceAccountKey.json")
        cred = credentials.Certificate(credentials_path)

    firebase_admin.initialize_app(cred, {
        "storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET", "")
    })

db: firestore.Client = firestore.client()

def get_contributor_uid(doc: dict) -> str | None:
    return doc.get("submittedBy") or doc.get("userId") or None
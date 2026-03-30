// ---------------------------------------------------------------------------
// Firebase client SDK — auth only
// Per PRD: the frontend uses Firebase ONLY to sign in and get an ID token.
// All data operations go through FastAPI.
// ---------------------------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

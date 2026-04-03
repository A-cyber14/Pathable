// ---------------------------------------------------------------------------
// Firebase client SDK — auth + storage
// Auth: used to sign in and get ID tokens for FastAPI requests
// Storage: used to upload photos directly from the browser
// ---------------------------------------------------------------------------

import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getStorage }    from "firebase/storage";

<<<<<<< HEAD
console.log("firebase key:", import.meta.env.VITE_FIREBASE_API_KEY);
console.log("auth domain:", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log("project id:", import.meta.env.VITE_FIREBASE_PROJECT_ID);

=======
>>>>>>> origin/main
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,  // e.g. pathable-c6dab.appspot.com
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
<<<<<<< HEAD
export const storage = getStorage(app);
=======
export const storage = getStorage(app);
>>>>>>> origin/main

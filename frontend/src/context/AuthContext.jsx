import { createContext, useContext, useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

// ---------------------------------------------------------------------------
// AuthContext
// Provides: currentUser, loginWithGoogle(), logout()
// Used by: any component that needs to know if the user is signed in
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  // Listen for Firebase auth state changes — fires on sign in, sign out, and page reload
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // cleanup listener on unmount
  }, []);

  // Sign in with Google popup
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged above will update currentUser automatically
  };

  // Sign out
  const logout = async () => {
    await signOut(auth);
  };

  // Don't render children until Firebase has resolved the initial auth state
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ currentUser, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// useAuth — hook for consuming auth context in any component
// Usage: const { currentUser, loginWithGoogle, logout } = useAuth();
// ---------------------------------------------------------------------------

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return context;
}

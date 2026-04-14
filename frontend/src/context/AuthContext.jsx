import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getProfile } from "../services/api";

// ---------------------------------------------------------------------------
// AuthContext
// Provides: currentUser, userProfile, profileLoading, loginWithGoogle(),
//           logout(), refreshProfile()
//
// userProfile shape: { accountType, businessId, disabilityType,
//                      featurePreferences, reviewCount, contributionCount }
// userProfile is null while loading, and null when signed out.
// accountType is null for brand-new users who haven't selected yet.
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser,    setCurrentUser]    = useState(null);
  const [userProfile,    setUserProfile]    = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading,        setLoading]        = useState(true);

  // Fetch the Pathable profile for the currently signed-in user.
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const profile = await getProfile();
      setUserProfile(profile);
    } catch {
      // Failed to load profile — treat as empty so the app still works.
      setUserProfile({});
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Listen for Firebase auth state changes.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile();
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [fetchProfile]);

  // Sign in with Google popup.
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged above will call fetchProfile automatically.
  };

  // Sign out and clear profile.
  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  // Call this after any operation that changes the user's Pathable profile
  // (e.g. selecting account type, updating preferences).
  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    await fetchProfile();
  }, [fetchProfile]);

  // Don't render children until Firebase has resolved the initial auth state.
  if (loading) return null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        profileLoading,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// useAuth — hook for consuming auth context in any component
// Usage: const { currentUser, userProfile, refreshProfile } = useAuth();
// ---------------------------------------------------------------------------

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an <AuthProvider>");
  }
  return context;
}

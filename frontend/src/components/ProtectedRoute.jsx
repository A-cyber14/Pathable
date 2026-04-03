import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// ProtectedRoute
// Renders children if the user is signed in.
// Redirects to /login if not — preserving the intended destination so we can
// redirect back after login in the future.
//
// Usage:
//   <ProtectedRoute>
//     <BookmarksPage />
//   </ProtectedRoute>
// ---------------------------------------------------------------------------

export default function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

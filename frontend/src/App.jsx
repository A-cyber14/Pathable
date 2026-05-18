import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import HomePage               from "./pages/HomePage";
import BusinessDetailPage     from "./pages/BusinessDetailPage";
import UnverifiedBusinessPage from "./pages/UnverifiedBusinessPage";
import LoginPage              from "./pages/LoginPage";
import BookmarksPage          from "./pages/BookmarksPage";
import ContributePage         from "./pages/ContributePage";
import ContributePhotosPage   from "./pages/ContributePhotosPage";
import ContributeFeaturesPage from "./pages/ContributeFeaturesPage";
import ProfilePage            from "./pages/ProfilePage";
import AccountTypePage        from "./pages/AccountTypePage";
import BusinessSetupPage      from "./pages/BusinessSetupPage";
import BusinessProfilePage    from "./pages/BusinessProfilePage";
import AdminPage              from "./pages/AdminPage";
import ProtectedRoute         from "./components/ProtectedRoute";
import Navbar                 from "./components/Navbar";
import { useAuth }            from "./context/AuthContext";
import { useIsMobile }        from "./hooks/useIsMobile";

// ---------------------------------------------------------------------------
// ProfileGate
// Signed-in users without an accountType are redirected to /account-type.
// Skips check on onboarding pages.
// ---------------------------------------------------------------------------

const ONBOARDING_PATHS = ["/account-type", "/business-setup", "/login", "/admin"];

function ProfileGate({ children }) {
  const { currentUser, userProfile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (
      !profileLoading &&
      currentUser &&
      userProfile &&
      userProfile.accountType == null &&
      !ONBOARDING_PATHS.includes(location.pathname)
    ) {
      navigate("/account-type", { replace: true });
    }
  }, [currentUser, userProfile, profileLoading, location.pathname, navigate]);

  return children;
}

// ---------------------------------------------------------------------------
// UserRoute
// Blocks business and admin users from regular-user-only pages.
// ---------------------------------------------------------------------------

function UserRoute({ children }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile?.accountType === "business") return <Navigate to="/business-profile" replace />;
  if (userProfile?.accountType === "admin")    return <Navigate to="/admin" replace />;
  return children;
}

// ---------------------------------------------------------------------------
// AdminRoute
// Only lets admin users through; everyone else goes to /.
// ---------------------------------------------------------------------------

function AdminRoute({ children }) {
  const { currentUser, userProfile } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (userProfile?.accountType !== "admin") return <Navigate to="/" replace />;
  return children;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const isMobile = useIsMobile();
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Navbar />
      <div style={{
        marginLeft: isMobile ? 0 : "68px",
        height:     isMobile ? "calc(100vh - 64px)" : "100vh",
      }}>
        <ProfileGate>
          <Routes>
            {/* Public */}
            <Route path="/"               element={<HomePage />} />
            <Route path="/business/:id"   element={<BusinessDetailPage />} />
            <Route path="/place/:placeId" element={<UnverifiedBusinessPage />} />
            <Route path="/login"          element={<LoginPage />} />

            {/* Onboarding — auth required, but no accountType / role check */}
            <Route path="/account-type"   element={<ProtectedRoute><AccountTypePage /></ProtectedRoute>} />
            <Route path="/business-setup" element={<ProtectedRoute><BusinessSetupPage /></ProtectedRoute>} />

            {/* Regular-user-only pages — business users are redirected away */}
            <Route path="/bookmarks"           element={<UserRoute><BookmarksPage /></UserRoute>} />
            <Route path="/contribute"          element={<UserRoute><ContributePage /></UserRoute>} />
            <Route path="/contribute/photos"   element={<UserRoute><ContributePhotosPage /></UserRoute>} />
            <Route path="/contribute/features" element={<UserRoute><ContributeFeaturesPage /></UserRoute>} />
            <Route path="/profile"             element={<UserRoute><ProfilePage /></UserRoute>} />

            {/* Business-owner page — access check handled inside the page itself */}
            <Route path="/business-profile"    element={<ProtectedRoute><BusinessProfilePage /></ProtectedRoute>} />

            {/* Admin-only page */}
            <Route path="/admin"               element={<AdminRoute><AdminPage /></AdminRoute>} />

            {/* Legacy redirect — anyone who bookmarked the old URL */}
            <Route path="/business-dashboard"  element={<Navigate to="/business-profile" replace />} />
          </Routes>
        </ProfileGate>
      </div>
    </BrowserRouter>
  );
}

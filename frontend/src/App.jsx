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
import PlanSelectionPage      from "./pages/PlanSelectionPage";
import BusinessSetupPage      from "./pages/BusinessSetupPage";
import BusinessProfilePage    from "./pages/BusinessProfilePage";
import AdminPage              from "./pages/AdminPage";
import PersonalProfilePage    from "./pages/onboarding/PersonalProfilePage";
import PersonalTutorialPage   from "./pages/onboarding/PersonalTutorialPage";
import NewBusinessInfoPage    from "./pages/onboarding/NewBusinessInfoPage";
import BusinessAccessibilityPage from "./pages/onboarding/BusinessAccessibilityPage";
import BusinessPhotosPage     from "./pages/onboarding/BusinessPhotosPage";
import BusinessTutorialPage   from "./pages/onboarding/BusinessTutorialPage";
import ProtectedRoute         from "./components/ProtectedRoute";
import Navbar                 from "./components/Navbar";
import { useAuth }            from "./context/AuthContext";
import { useIsMobile }        from "./hooks/useIsMobile";

// ---------------------------------------------------------------------------
// ProfileGate
// 1. Signed-in users without an accountType are redirected to /account-type.
// 2. Signed-in users with an in-progress onboardingStep are redirected back
//    to that step if they navigate somewhere outside the onboarding flow
//    (e.g. hitting "/" directly, or refreshing there) — but free navigation
//    *within* /onboarding/* and /business-setup/* is always allowed, so
//    Back/Continue between steps and reopening an earlier step both work.
// Completed users (onboardingStep == null or "complete") are never redirected.
// ---------------------------------------------------------------------------

const ONBOARDING_PATHS = ["/account-type", "/login", "/admin"];
const ONBOARDING_PATH_PREFIXES = ["/onboarding", "/business-setup"];

const STEP_TO_PATH = {
  profile:                    "/onboarding/profile",
  tutorial:                   "/onboarding/tutorial",
  plan:                       "/business-setup/plan",
  "business-search":          "/business-setup",
  "business-info":            "/business-setup/information",
  "business-accessibility":   "/business-setup/accessibility",
  "business-photos":          "/business-setup/photos",
  "business-tutorial":        "/business-setup/tutorial",
};

function isOnboardingPath(pathname) {
  return ONBOARDING_PATHS.includes(pathname) || ONBOARDING_PATH_PREFIXES.some((p) => pathname.startsWith(p));
}

function ProfileGate({ children }) {
  const { currentUser, userProfile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (profileLoading || !currentUser || !userProfile) return;

    if (userProfile.accountType == null) {
      if (!isOnboardingPath(location.pathname)) navigate("/account-type", { replace: true });
      return;
    }

    const step = userProfile.onboardingStep;
    if (step && step !== "complete" && STEP_TO_PATH[step] && !isOnboardingPath(location.pathname)) {
      navigate(STEP_TO_PATH[step], { replace: true });
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
        height:     isMobile
          ? "calc(100vh - 64px - env(safe-area-inset-bottom, 0px))"
          : "100vh",
      }}>
        <ProfileGate>
          <Routes>
            {/* Public */}
            <Route path="/"               element={<HomePage />} />
            <Route path="/business/:id"   element={<BusinessDetailPage />} />
            <Route path="/place/:placeId" element={<UnverifiedBusinessPage />} />
            <Route path="/login"          element={<LoginPage />} />

            {/* Onboarding — auth required, but no accountType / role check */}
            <Route path="/account-type"                    element={<ProtectedRoute><AccountTypePage /></ProtectedRoute>} />
            <Route path="/onboarding/profile"               element={<ProtectedRoute><PersonalProfilePage /></ProtectedRoute>} />
            <Route path="/onboarding/tutorial"              element={<ProtectedRoute><PersonalTutorialPage /></ProtectedRoute>} />
            <Route path="/business-setup/plan"              element={<ProtectedRoute><PlanSelectionPage /></ProtectedRoute>} />
            <Route path="/business-setup"                   element={<ProtectedRoute><BusinessSetupPage /></ProtectedRoute>} />
            <Route path="/business-setup/information"       element={<ProtectedRoute><NewBusinessInfoPage /></ProtectedRoute>} />
            <Route path="/business-setup/accessibility"     element={<ProtectedRoute><BusinessAccessibilityPage /></ProtectedRoute>} />
            <Route path="/business-setup/photos"             element={<ProtectedRoute><BusinessPhotosPage /></ProtectedRoute>} />
            <Route path="/business-setup/tutorial"           element={<ProtectedRoute><BusinessTutorialPage /></ProtectedRoute>} />

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

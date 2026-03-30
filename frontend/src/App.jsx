import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
import LoginPage from "./pages/LoginPage";
import BookmarksPage from "./pages/BookmarksPage";
import ContributePage from "./pages/ContributePage";
import ContributePhotosPage from "./pages/ContributePhotosPage";
import ContributeFeaturesPage from "./pages/ContributeFeaturesPage";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      {/* Offset page content by sidebar width (68px) */}
      <div style={{ marginLeft: "68px", height: "100vh" }}>
        <Routes>
          {/* Public routes */}
          <Route path="/"             element={<HomePage />} />
          <Route path="/business/:id" element={<BusinessDetailPage />} />
          <Route path="/login"        element={<LoginPage />} />

          {/* Protected routes — redirect to /login if not authenticated */}
          <Route path="/bookmarks"           element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
          <Route path="/contribute"          element={<ProtectedRoute><ContributePage /></ProtectedRoute>} />
          <Route path="/contribute/photos"   element={<ProtectedRoute><ContributePhotosPage /></ProtectedRoute>} />
          <Route path="/contribute/features" element={<ProtectedRoute><ContributeFeaturesPage /></ProtectedRoute>} />
          <Route path="/profile"             element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

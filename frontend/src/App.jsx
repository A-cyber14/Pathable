import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage               from "./pages/HomePage";
import BusinessDetailPage     from "./pages/BusinessDetailPage";
import UnverifiedBusinessPage from "./pages/UnverifiedBusinessPage";
import LoginPage              from "./pages/LoginPage";
import BookmarksPage          from "./pages/BookmarksPage";
import ContributePage         from "./pages/ContributePage";
import ContributePhotosPage   from "./pages/ContributePhotosPage";
import ContributeFeaturesPage from "./pages/ContributeFeaturesPage";
import ProfilePage            from "./pages/ProfilePage";
import ProtectedRoute         from "./components/ProtectedRoute";
import Navbar                 from "./components/Navbar";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ marginLeft: "68px", height: "100vh" }}>
        <Routes>
          {/* Public */}
          <Route path="/"             element={<HomePage />} />
          <Route path="/business/:id" element={<BusinessDetailPage />} />
          <Route path="/place/:placeId" element={<UnverifiedBusinessPage />} />
          <Route path="/login"        element={<LoginPage />} />

          {/* Protected */}
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

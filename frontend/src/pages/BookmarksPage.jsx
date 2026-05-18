import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBookmarks, removeBookmark } from "../services/api";
import { useIsMobile } from "../hooks/useIsMobile";

function BookmarkCard({ business, onRemove, compact = false }) {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [hovered,  setHovered]  = useState(false);

  const score = business.accessibility_score;
  const scoreColor = score == null ? "#9ca3af" : score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const scoreBg    = score == null ? "#f3f4f6" : score >= 75 ? "#f0fdf4" : score >= 50 ? "#fffbeb" : "#fef2f2";

  const tags = [
    business.wheelchair_accessible && "Wheelchair",
    business.accessible_parking    && "Parking",
    business.entrance_width_rating &&
      `Entrance: ${business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)}`,
  ].filter(Boolean).slice(0, 2);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await removeBookmark(business.id);
      onRemove(business.id);
    } catch (err) {
      console.error("Failed to remove bookmark:", err.message);
      setRemoving(false);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? "#fafafa" : "#fff",
        border:          `1px solid ${hovered ? "#d1d5db" : "#e5e7eb"}`,
        borderRadius:    "14px",
        padding:         compact ? "14px 16px" : "18px 20px",
        display:         "flex",
        flexDirection:   "column",
        gap:             "8px",
        transition:      "border-color 0.15s, background-color 0.1s, box-shadow 0.15s",
        boxShadow:       hovered ? "0 2px 8px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      {/* Row 1 — name + score badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827", flex: 1 }}>
          {business.name}
        </span>
        {score != null && (
          <span style={{ fontSize: "12px", fontWeight: "700", color: scoreColor, backgroundColor: scoreBg, borderRadius: "6px", padding: "2px 7px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {score}/100
          </span>
        )}
      </div>

      {/* Address */}
      <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        {business.address}
      </p>

      {/* Feature tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
          {tags.map((tag) => (
            <span key={tag} style={{ fontSize: "11px", fontWeight: "500", padding: "2px 9px", borderRadius: "999px", backgroundColor: "#f0fdf4", color: "#16a34a" }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        <button
          onClick={() => navigate(`/business/${business.id}`)}
          style={{ flex: 1, padding: "9px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
        >
          View Details
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          title="Remove bookmark"
          style={{ padding: "9px 12px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: removing ? "not-allowed" : "pointer", opacity: removing ? 0.5 : 1, fontSize: "13px", color: "#6b7280" }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BookmarksPage
// Route: /bookmarks (protected)
// Matches Image 2 mockup
// ---------------------------------------------------------------------------

export default function BookmarksPage() {
  const isMobile = useIsMobile();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    getBookmarks()
      .then(setBookmarks)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Remove from local state immediately after DELETE succeeds
  const handleRemove = (businessId) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== businessId));
  };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: isMobile ? "20px 16px" : "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        <h1 style={{ fontSize: isMobile ? "20px" : "22px", fontWeight: "700", color: "#111827", margin: "0 0 16px" }}>
          Bookmarks
        </h1>

        {/* States */}
        {loading && (
          <p style={{ color: "#6b7280" }}>Loading your bookmarks...</p>
        )}
        {error && (
          <p style={{ color: "#dc2626" }}>Error: {error}</p>
        )}
        {!loading && !error && bookmarks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔖</div>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "#6b7280" }}>No bookmarks yet</p>
            <p style={{ fontSize: "14px" }}>Click "Add to Bookmarks" on any location to save it here.</p>
          </div>
        )}

        {!loading && !error && bookmarks.length > 0 && (
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
              gap:                 isMobile ? "12px" : "16px",
            }}
          >
            {bookmarks.map((business) => (
              <BookmarkCard
                key={business.id}
                business={business}
                onRemove={handleRemove}
                compact={isMobile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


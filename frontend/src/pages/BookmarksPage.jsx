import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBookmarks, removeBookmark } from "../services/api";

// ---------------------------------------------------------------------------
// BookmarkCard
// Matches the card layout in Image 2 mockup:
// name + gold star top row, address, description, feature tags,
// black "View Details" button + bookmark remove button
// ---------------------------------------------------------------------------

function BookmarkCard({ business, onRemove }) {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);

  const tags = [
    business.wheelchair_accessible && "Wheelchair",
    business.accessible_parking    && "Parking",
    business.entrance_width_rating &&
      `Entrance: ${business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)}`,
  ].filter(Boolean);

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
      style={{
        backgroundColor: "#fff",
        border:          "1.5px solid #e5e7eb",
        borderRadius:    "14px",
        padding:         "20px",
        display:         "flex",
        flexDirection:   "column",
        gap:             "10px",
      }}
    >
      {/* Row 1 — name + bookmark star (Image 2) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>
          {business.name}
        </span>
        <button
          onClick={handleRemove}
          disabled={removing}
          title="Remove bookmark"
          style={{
            background:   "none",
            border:       "1px solid #e5e7eb",
            borderRadius: "8px",
            padding:      "5px 7px",
            cursor:       removing ? "not-allowed" : "pointer",
            display:      "flex",
            alignItems:   "center",
            opacity:      removing ? 0.5 : 1,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Address */}
      <p style={{ margin: 0, fontSize: "13px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        {business.address}
      </p>

      {/* Feature tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize:        "12px",
                fontWeight:      "500",
                padding:         "3px 10px",
                borderRadius:    "999px",
                border:          "1.5px solid #d1d5db",
                color:           "#374151",
                backgroundColor: "#fff",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action row — View Details + Remove (Image 2) */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        <button
          onClick={() => navigate(`/business/${business.id}`)}
          style={{
            flex:            1,
            padding:         "10px",
            backgroundColor: "#111827",
            color:           "#fff",
            border:          "none",
            borderRadius:    "8px",
            fontSize:        "14px",
            fontWeight:      "600",
            cursor:          "pointer",
          }}
        >
          View Details
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          style={{
            padding:         "10px 12px",
            backgroundColor: "#fff",
            border:          "1.5px solid #e5e7eb",
            borderRadius:    "8px",
            display:         "flex",
            alignItems:      "center",
            cursor:          removing ? "not-allowed" : "pointer",
            opacity:         removing ? 0.5 : 1,
          }}
          title="Remove bookmark"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"
            fill="#f59e0b" stroke="#f59e0b" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
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
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header — matches Image 2 */}
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>
          Your Bookmarks
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
          Locations you've saved for quick access
        </p>

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

        {/* 2-column grid — Image 2 */}
        {!loading && !error && bookmarks.length > 0 && (
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap:                 "16px",
            }}
          >
            {bookmarks.map((business) => (
              <BookmarkCard
                key={business.id}
                business={business}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


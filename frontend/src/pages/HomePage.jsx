import { useState, useEffect } from "react";
import MapView      from "../components/MapView";
import BusinessCard from "../components/BusinessCard";
import SearchBar    from "../components/SearchBar";
import { getTopRated } from "../services/api";

// ---------------------------------------------------------------------------
// SelectedCard — compact floating preview card over the map
// ---------------------------------------------------------------------------
function SelectedCard({ business, onClose }) {
  const score = business.accessibility_score;
  const scoreColor = score == null ? "#9ca3af" : score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const scoreBg    = score == null ? "#f3f4f6" : score >= 75 ? "#f0fdf4" : score >= 50 ? "#fffbeb" : "#fef2f2";

  const tags = [
    business.wheelchair_accessible != null && { label: "Wheelchair", ok: business.wheelchair_accessible },
    business.accessible_parking    != null && { label: "Parking",    ok: business.accessible_parking },
    business.entrance_width_rating         && { label: `Entrance: ${business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)}`, ok: business.entrance_width_rating !== "narrow" },
  ].filter(Boolean).slice(0, 3);

  return (
    <div style={{
      position:        "absolute",
      bottom:          "20px",
      left:            "50%",
      transform:       "translateX(-50%)",
      width:           "calc(100% - 40px)",
      maxWidth:        "420px",
      backgroundColor: "#fff",
      borderRadius:    "14px",
      padding:         "16px 18px",
      boxShadow:       "0 4px 20px rgba(0,0,0,0.14)",
      zIndex:          10,
      display:         "flex",
      flexDirection:   "column",
      gap:             "8px",
    }}>
      <button
        onClick={onClose}
        style={{ position: "absolute", top: "10px", right: "12px", background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
      >✕</button>

      {/* Name + score */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingRight: "24px" }}>
        <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827", flex: 1 }}>{business.name}</span>
        {score != null && (
          <span style={{ fontSize: "12px", fontWeight: "700", color: scoreColor, backgroundColor: scoreBg, borderRadius: "6px", padding: "2px 7px", flexShrink: 0 }}>
            {score}/100
          </span>
        )}
      </div>

      {/* Address */}
      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>📍 {business.address}</p>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {tags.map(({ label, ok }) => (
            <span key={label} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", backgroundColor: ok ? "#f0fdf4" : "#fef2f2", color: ok ? "#16a34a" : "#dc2626" }}>
              {label}
            </span>
          ))}
        </div>
      )}

      {/* View details */}
      <a
        href={`/business/${business.id}`}
        style={{ display: "block", textAlign: "center", padding: "9px", backgroundColor: "#111827", color: "#fff", borderRadius: "8px", fontSize: "13px", fontWeight: "600", textDecoration: "none", marginTop: "2px" }}
      >
        View Details →
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "32px 12px", color: "#6b7280" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>📍</div>
      <p style={{ fontWeight: "600", fontSize: "15px", color: "#374151", margin: "0 0 6px" }}>No locations found.</p>
      <p style={{ fontSize: "13px", margin: 0 }}>Try searching for a business name above.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage
// Loads top-10 rated businesses on mount.
// Unified SearchBar navigates to detail pages — does not filter the list.
// ---------------------------------------------------------------------------
export default function HomePage() {
  const [businesses,       setBusinesses]       = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  useEffect(() => {
    getTopRated()
      .then(setBusinesses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBusiness = (business) => {
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "sans-serif" }}>

      {/* Top bar — search */}
      <div
        style={{
          padding:         "10px 20px",
          backgroundColor: "#f9fafb",
          borderBottom:    "1px solid #f0f0f0",
          display:         "flex",
          alignItems:      "center",
          zIndex:          10,
          position:        "relative",
        }}
      >
        <SearchBar onSelectBusiness={handleSelectBusiness} />
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left — map with floating preview card */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapView
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            onSelectBusiness={handleSelectBusiness}
            mapCenter={null}
          />

          {selectedBusiness && (
            <SelectedCard business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
          )}
        </div>

        {/* Right — ranked business list */}
        <div style={{ width: "340px", overflowY: "auto", borderLeft: "1px solid #ebebeb", padding: "16px 12px", backgroundColor: "#f9fafb" }}>
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: "700", color: "#374151", letterSpacing: "0.2px" }}>
              Top Rated Nearby
            </h2>
            <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>Ranked by Pathable score</p>
          </div>

          {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading locations...</p>}
          {error   && <p style={{ color: "#dc2626", fontSize: "14px" }}>Error: {error}</p>}
          {!loading && !error && businesses.length === 0 && <EmptyState />}
          {!loading && !error && businesses.map((business, index) => (
            <BusinessCard
              key={business.id}
              business={business}
              isSelected={selectedBusiness?.id === business.id}
              onClick={() => handleSelectBusiness(business)}
              rank={index + 1}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate }  from "react-router-dom";
import MapView          from "../components/MapView";
import BusinessCard     from "../components/BusinessCard";
import SearchBar        from "../components/SearchBar";
import { getTopRated }  from "../services/api";

// ---------------------------------------------------------------------------
// SelectedCard — compact floating preview for a Pathable business
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

      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingRight: "24px" }}>
        <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827", flex: 1 }}>{business.name}</span>
        {score != null && (
          <span style={{ fontSize: "12px", fontWeight: "700", color: scoreColor, backgroundColor: scoreBg, borderRadius: "6px", padding: "2px 7px", flexShrink: 0 }}>
            {score}/100
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>📍 {business.address}</p>

      {tags.length > 0 && (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {tags.map(({ label, ok }) => (
            <span key={label} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", backgroundColor: ok ? "#f0fdf4" : "#fef2f2", color: ok ? "#16a34a" : "#dc2626" }}>
              {label}
            </span>
          ))}
        </div>
      )}

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
// ExternalPlaceCard — floating preview for a non-Pathable external place
// ---------------------------------------------------------------------------
function ExternalPlaceCard({ place, onClose }) {
  const navigate = useNavigate();

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

      {/* Name */}
      <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827", paddingRight: "24px" }}>
        {place.name}
      </span>

      {/* Address */}
      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>📍 {place.address}</p>

      {/* Not-in-Pathable notice */}
      <div style={{
        backgroundColor: "#fffbeb",
        border:          "1px solid #fde68a",
        borderRadius:    "8px",
        padding:         "8px 10px",
        fontSize:        "12px",
        color:           "#92400e",
        display:         "flex",
        alignItems:      "center",
        gap:             "6px",
      }}>
        <span>⚠️</span>
        <span>This place is not yet on Pathable</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
        <button
          onClick={() => navigate(`/place/${place.place_id}`, { state: { place } })}
          style={{
            flex:            1,
            padding:         "9px",
            backgroundColor: "#f3f4f6",
            color:           "#374151",
            border:          "none",
            borderRadius:    "8px",
            fontSize:        "13px",
            fontWeight:      "600",
            cursor:          "pointer",
          }}
        >
          View Details
        </button>
        <button
          onClick={() => navigate(`/place/${place.place_id}`, { state: { place, openAddModal: true } })}
          style={{
            flex:            1,
            padding:         "9px",
            backgroundColor: "#2563eb",
            color:           "#fff",
            border:          "none",
            borderRadius:    "8px",
            fontSize:        "13px",
            fontWeight:      "600",
            cursor:          "pointer",
          }}
        >
          + Add to Pathable
        </button>
      </div>
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
// ---------------------------------------------------------------------------
export default function HomePage() {
  const [businesses,          setBusinesses]          = useState([]);
  const [selectedBusiness,    setSelectedBusiness]    = useState(null);
  const [selectedExternalPlace, setSelectedExternalPlace] = useState(null);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState(null);

  useEffect(() => {
    getTopRated()
      .then(setBusinesses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBusiness = (business) => {
    setSelectedExternalPlace(null);
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
  };

  const handleSelectExternalPlace = (place) => {
    setSelectedBusiness(null);
    setSelectedExternalPlace(place);
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
        <SearchBar
          onSelectBusiness={handleSelectBusiness}
          onSelectExternalPlace={handleSelectExternalPlace}
        />
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
            externalPlace={selectedExternalPlace}
          />

          {selectedBusiness && (
            <SelectedCard business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
          )}

          {selectedExternalPlace && !selectedBusiness && (
            <ExternalPlaceCard
              place={selectedExternalPlace}
              onClose={() => setSelectedExternalPlace(null)}
            />
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

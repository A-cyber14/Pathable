import { useState, useEffect } from "react";
import MapView      from "../components/MapView";
import BusinessCard from "../components/BusinessCard";
import SearchBar    from "../components/SearchBar";
import { getTopRated } from "../services/api";

// ---------------------------------------------------------------------------
// SelectedPanel — shows below map when a business pin is clicked
// ---------------------------------------------------------------------------
function SelectedPanel({ business, onClose }) {
  const checks = [
    { label: "Ramps",              value: business.wheelchair_accessible },
    { label: "Accessible Parking", value: business.accessible_parking },
    { label: "Elevator",           value: business.elevator },
    { label: "Auto Doors",         value: business.auto_doors },
  ];

  return (
    <div style={{ borderTop: "1px solid #e5e7eb", padding: "16px", backgroundColor: "#fff", position: "relative" }}>
      <button
        onClick={onClose}
        style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}
      >
        ✕
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: "700", fontSize: "17px" }}>{business.name}</span>
        {business.accessibility_score != null && (
          <span
            style={{
              backgroundColor: business.accessibility_score >= 75 ? "#f0fdf4" : business.accessibility_score >= 50 ? "#fffbeb" : "#fef2f2",
              color:           business.accessibility_score >= 75 ? "#16a34a" : business.accessibility_score >= 50 ? "#d97706" : "#dc2626",
              border:          `1px solid ${business.accessibility_score >= 75 ? "#bbf7d0" : business.accessibility_score >= 50 ? "#fde68a" : "#fecaca"}`,
              borderRadius:    "6px",
              padding:         "2px 8px",
              fontSize:        "13px",
              fontWeight:      "700",
            }}
          >
            {business.accessibility_score}/100
          </span>
        )}
      </div>

      <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#6b7280" }}>📍 {business.address}</p>

      {business.entrance_width_rating && (
        <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#374151" }}>
          Door Width: <strong>{business.entrance_width_rating}</strong>
        </p>
      )}

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "14px" }}>
        {checks.map(({ label, value }) =>
          value != null && (
            <span key={label} style={{ fontSize: "13px", color: value ? "#16a34a" : "#9ca3af" }}>
              {value ? "✓" : "✗"} {label}
            </span>
          )
        )}
      </div>

      <a
        href={`/business/${business.id}`}
        style={{ fontSize: "13px", color: "#2563eb", textDecoration: "none", fontWeight: "500" }}
      >
        View full details →
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

      {/* Top bar — single unified search bar */}
      <div
        style={{
          padding:         "10px 16px",
          borderBottom:    "1px solid #e5e7eb",
          backgroundColor: "#fff",
          display:         "flex",
          alignItems:      "center",
        }}
      >
        <SearchBar onSelectBusiness={handleSelectBusiness} />
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left — map + selected panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <MapView
              businesses={businesses}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={handleSelectBusiness}
              mapCenter={null}
            />

            {/* Map label */}
            <div style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: "#fff", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", pointerEvents: "none" }}>
              Top Rated Locations
            </div>

            {/* Legend */}
            <div style={{ position: "absolute", bottom: "12px", right: "12px", backgroundColor: "#fff", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "4px", pointerEvents: "none" }}>
              <span>🔴 Location</span>
              <span>🔵 Selected</span>
            </div>
          </div>

          {selectedBusiness && (
            <SelectedPanel business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
          )}
        </div>

        {/* Right — ranked business list */}
        <div style={{ width: "380px", overflowY: "auto", borderLeft: "1px solid #e5e7eb", padding: "16px", backgroundColor: "#f9fafb" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}>
              ♿ Top Rated
            </h2>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>by Pathable score</span>
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

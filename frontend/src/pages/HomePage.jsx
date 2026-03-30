import { useState, useEffect } from "react";
import MapView from "../components/MapView";
import BusinessCard from "../components/BusinessCard";
import SearchBar from "../components/SearchBar";
import { getBusinesses } from "../services/api";

// ---------------------------------------------------------------------------
// Selected business inline preview panel (Image 8)
// Appears below the map when a pin or card is clicked
// ---------------------------------------------------------------------------

function SelectedPanel({ business, onClose }) {
  const checks = [
    { label: "Elevator",           value: business.elevator },
    { label: "Ramps",              value: business.wheelchair_accessible },
    { label: "Accessible Parking", value: business.accessible_parking },
    { label: "Auto Doors",         value: business.auto_doors },
  ];

  return (
    <div
      style={{
        borderTop: "1px solid #e5e7eb",
        padding: "16px",
        backgroundColor: "#fff",
        position: "relative",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          background: "none",
          border: "none",
          fontSize: "18px",
          cursor: "pointer",
          color: "#6b7280",
        }}
      >
        ✕
      </button>

      {/* Name + score badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <span style={{ fontWeight: "700", fontSize: "17px" }}>{business.name}</span>
        {business.community_score != null && (
          <span
            style={{
              backgroundColor: "#2563eb",
              color: "#fff",
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            ★ {business.community_score}/5
          </span>
        )}
      </div>

      {/* Address */}
      <p style={{ margin: "0 0 10px", fontSize: "13px", color: "#6b7280" }}>
        📍 {business.address}
      </p>

      {/* Quick stats */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "12px", fontSize: "13px", color: "#374151" }}>
        {business.entrance_width_rating && (
          <span>Door Width: <strong>{business.entrance_width_rating}</strong></span>
        )}
      </div>

      {/* Feature checkmarks */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "14px" }}>
        {checks.map(({ label, value }) =>
          value != null && (
            <span key={label} style={{ fontSize: "13px", color: value ? "#16a34a" : "#9ca3af" }}>
              {value ? "✓" : "✗"} {label}
            </span>
          )
        )}
      </div>

      {/* Action buttons + detail link */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button
          style={{
            padding: "7px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
            backgroundColor: "#fff",
          }}
        >
          ＋ Add Features
        </button>
        <button
          style={{
            padding: "7px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
            backgroundColor: "#fff",
          }}
        >
          📷 Upload Photos
        </button>
        <a
          href={`/business/${business.id}`}
          style={{ marginLeft: "auto", fontSize: "13px", color: "#2563eb", textDecoration: "none" }}
        >
          View full details →
        </a>
      </div>

      {/* Photo strip — first 5 photos */}
      {business.photos?.length > 0 && (
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", overflowX: "auto" }}>
          {business.photos.slice(0, 5).map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`${business.name} photo ${i + 1}`}
              style={{
                height: "72px",
                width: "100px",
                objectFit: "cover",
                borderRadius: "6px",
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// Shown in the right panel when the database has no locations yet
// ---------------------------------------------------------------------------

function EmptyState() {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div style={{ textAlign: "center", padding: "32px 12px", color: "#6b7280" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>📍</div>
      <p style={{ fontWeight: "600", fontSize: "15px", color: "#374151", margin: "0 0 6px" }}>
        No locations available yet.
      </p>
      <p style={{ fontSize: "13px", margin: "0 0 16px" }}>
        The database is empty.
      </p>
      <button
        onClick={() => setShowInstructions((v) => !v)}
        style={{
          padding:         "8px 16px",
          backgroundColor: "#fff",
          border:          "1.5px solid #d1d5db",
          borderRadius:    "8px",
          fontSize:        "13px",
          fontWeight:      "600",
          color:           "#374151",
          cursor:          "pointer",
        }}
      >
        {showInstructions ? "Hide instructions" : "Load sample data instructions"}
      </button>
      {showInstructions && (
        <div
          style={{
            marginTop:       "12px",
            padding:         "12px 14px",
            backgroundColor: "#f9fafb",
            border:          "1px solid #e5e7eb",
            borderRadius:    "8px",
            fontSize:        "12px",
            color:           "#374151",
            textAlign:       "left",
            lineHeight:      "1.6",
          }}
        >
          Run the following command in your terminal:
          <pre
            style={{
              margin:          "8px 0 0",
              padding:         "8px 10px",
              backgroundColor: "#111827",
              color:           "#f9fafb",
              borderRadius:    "6px",
              fontSize:        "12px",
              overflowX:       "auto",
            }}
          >
            python backend/scripts/seed_locations.py
          </pre>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [businesses, setBusinesses]             = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState(null);

  // Load all businesses on mount
  useEffect(() => {
    getBusinesses()
      .then((data) => setBusinesses(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Called by SearchBar whenever search results update
  const handleSearchResults = (results) => {
    setBusinesses(results);
  };

  // Clicking an already-selected business deselects it
  const handleSelectBusiness = (business) => {
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "sans-serif" }}>

      {/* Search bar with autocomplete dropdown */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#fff", display: "flex" }}>
        <SearchBar onSearch={handleSearchResults} />
      </div>

      {/* Main content — left column (map + panel), right column (list) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Map */}
          <div style={{ flex: 1, position: "relative" }}>
            <MapView
              businesses={businesses}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={handleSelectBusiness}
            />

            {/* "Interactive Map View" label — top left (Image 1) */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "600",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                pointerEvents: "none",
              }}
            >
              Interactive Map View
            </div>

            {/* Legend — bottom right (Image 1) */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "12px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                pointerEvents: "none",
              }}
            >
              <span>🔴 Location</span>
              <span>🔵 Selected</span>
            </div>
          </div>

          {/* Selected panel — slides in below map (Image 8) */}
          {selectedBusiness && (
            <SelectedPanel
              business={selectedBusiness}
              onClose={() => setSelectedBusiness(null)}
            />
          )}
        </div>

        {/* Right column — scrollable business list */}
        <div
          style={{
            width: "380px",
            overflowY: "auto",
            borderLeft: "1px solid #e5e7eb",
            padding: "16px",
            backgroundColor: "#f9fafb",
          }}
        >
          <h2
            style={{
              margin: "0 0 16px",
              fontSize: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#111827",
            }}
          >
            ♿ Accessible Locations
          </h2>

          {loading && <p style={{ color: "#6b7280" }}>Loading locations...</p>}
          {error   && <p style={{ color: "#dc2626" }}>Error: {error}</p>}

          {!loading && !error && businesses.length === 0 && (
            <EmptyState />
          )}

          {!loading && !error && businesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              isSelected={selectedBusiness?.id === business.id}
              onClick={() => handleSelectBusiness(business)}
            />
          ))}
        </div>

      </div>
    </div>
  );
}

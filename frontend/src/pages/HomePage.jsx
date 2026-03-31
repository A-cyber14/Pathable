import { useState, useEffect } from "react";
import MapView      from "../components/MapView";
import BusinessCard from "../components/BusinessCard";
import SearchBar    from "../components/SearchBar";
import { getBusinesses } from "../services/api";

// ---------------------------------------------------------------------------
// geocodeLocation
// Converts a text query ("Tampa, FL") into { lat, lng } using Google Maps
// Geocoding API. Returns null if nothing found.
// ---------------------------------------------------------------------------
async function geocodeLocation(query) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.Geocoder) return resolve(null);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === "OK" && results.length > 0) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        resolve(null);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// LocationSearchBar
// Separate search bar just for map location (city, address, place name).
// Props:
//   onLocationFound(center) — passes { lat, lng } back to HomePage
// ---------------------------------------------------------------------------
function LocationSearchBar({ onLocationFound }) {
  const [query,      setQuery]      = useState("");
  const [searching,  setSearching]  = useState(false);
  const [notFound,   setNotFound]   = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setNotFound(false);

    const coords = await geocodeLocation(trimmed);

    setSearching(false);

    if (coords) {
      onLocationFound(coords);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  };

  // Allow pressing Enter to search
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          border:          "1px solid #d1d5db",
          borderRadius:    "8px",
          padding:         "8px 12px",
          backgroundColor: "#fff",
        }}
      >
        {/* Globe icon to distinguish from business search */}
        <span style={{ fontSize: "16px", color: "#9ca3af" }}>🌍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
          onKeyDown={handleKeyDown}
          placeholder="Search any location (city, address, place...)"
          style={{
            flex:            1,
            border:          "none",
            outline:         "none",
            fontSize:        "14px",
            color:           "#111827",
            backgroundColor: "transparent",
          }}
        />
        {/* Clear button */}
        {query && (
          <button
            onClick={() => { setQuery(""); setNotFound(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "16px", padding: 0 }}
          >
            ✕
          </button>
        )}
        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={searching}
          style={{
            padding:         "5px 12px",
            backgroundColor: "#2563eb",
            color:           "#fff",
            border:          "none",
            borderRadius:    "6px",
            fontSize:        "13px",
            fontWeight:      "600",
            cursor:          searching ? "not-allowed" : "pointer",
            opacity:         searching ? 0.7 : 1,
            whiteSpace:      "nowrap",
          }}
        >
          {searching ? "..." : "Go"}
        </button>
      </div>

      {/* Error message for invalid location */}
      {notFound && (
        <p style={{ margin: 0, fontSize: "12px", color: "#dc2626", paddingLeft: "4px" }}>
          Location not found. Try a different search.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SelectedPanel — shows below map when a business is clicked
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

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <span style={{ fontWeight: "700", fontSize: "17px" }}>{business.name}</span>
        {business.community_score != null && (
          <span style={{ backgroundColor: "#2563eb", color: "#fff", borderRadius: "6px", padding: "2px 8px", fontSize: "13px", fontWeight: "600" }}>
            ★ {business.community_score}/5
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

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <a
          href={`/business/${business.id}`}
          style={{ marginLeft: "auto", fontSize: "13px", color: "#2563eb", textDecoration: "none", fontWeight: "500" }}
        >
          View full details →
        </a>
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
  const [businesses,       setBusinesses]       = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [mapCenter,        setMapCenter]        = useState(null); // { lat, lng }
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);

  // Load all businesses on mount
  useEffect(() => {
    getBusinesses()
      .then(setBusinesses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Business name search updates the list
  const handleSearchResults = (results) => setBusinesses(results);

  // Location search re-centers the map
  const handleLocationFound = (coords) => setMapCenter(coords);

  const handleSelectBusiness = (business) => {
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "sans-serif" }}>

      {/* Top bar — two search bars side by side */}
      <div
        style={{
          padding:         "10px 16px",
          borderBottom:    "1px solid #e5e7eb",
          backgroundColor: "#fff",
          display:         "flex",
          gap:             "10px",
          alignItems:      "flex-start",
        }}
      >
        {/* Business name search */}
        <SearchBar onSearch={handleSearchResults} />

        {/* Location / map search */}
        <LocationSearchBar onLocationFound={handleLocationFound} />
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
              mapCenter={mapCenter}
            />

            {/* Map label */}
            <div style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: "#fff", borderRadius: "8px", padding: "6px 12px", fontSize: "13px", fontWeight: "600", boxShadow: "0 1px 4px rgba(0,0,0,0.15)", pointerEvents: "none" }}>
              Interactive Map View
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

        {/* Right — business list */}
        <div style={{ width: "380px", overflowY: "auto", borderLeft: "1px solid #e5e7eb", padding: "16px", backgroundColor: "#f9fafb" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: "18px", display: "flex", alignItems: "center", gap: "8px", color: "#111827" }}>
            ♿ Accessible Locations
          </h2>

          {loading && <p style={{ color: "#6b7280" }}>Loading locations...</p>}
          {error   && <p style={{ color: "#dc2626" }}>Error: {error}</p>}
          {!loading && !error && businesses.length === 0 && <EmptyState />}
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

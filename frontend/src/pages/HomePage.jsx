import { useState, useEffect } from "react";
import MapView      from "../components/MapView";
import BusinessCard from "../components/BusinessCard";
import SearchBar    from "../components/SearchBar";
import { getTopRated } from "../services/api";

// ---------------------------------------------------------------------------
// Filter chip config
// ---------------------------------------------------------------------------
const FILTER_CHIPS = [
  { key: "wheelchair", label: "♿ Wheelchair" },
  { key: "parking",    label: "🅿 Parking" },
  { key: "restroom",   label: "🚻 Restroom" },
  { key: "entrance",   label: "🚪 Wide Entrance" },
  { key: "verified",   label: "✓ Verified" },
];

function applyFilters(businesses, activeFilters) {
  if (activeFilters.size === 0) return businesses;
  return businesses.filter((b) => {
    if (activeFilters.has("wheelchair") && !b.wheelchair_accessible)                              return false;
    if (activeFilters.has("parking")    && !b.accessible_parking)                                return false;
    if (activeFilters.has("restroom")   && !b.accessible_restrooms)                              return false;
    if (activeFilters.has("entrance")   && !["standard", "wide"].includes(b.entrance_width_rating)) return false;
    if (activeFilters.has("verified")   && ((b.contributors_count || 0) + (b.review_count || 0)) < 3) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Helpers shared between SelectedCard and list
// ---------------------------------------------------------------------------
function getCategory(name = "") {
  const n = name.toLowerCase();
  if (n.includes("library"))                                                 return "Library";
  if (n.includes("medical") || n.includes("hospital"))                      return "Medical Center";
  if (n.includes("hospice"))                                                 return "Hospice";
  if (n.includes("disability") || n.includes("achievement center"))         return "Support Center";
  if (n.includes("grill") || n.includes("restaurant") || n.includes("cafe") || n.includes("chipotle") || n.includes("mexican")) return "Restaurant";
  if (n.includes("aquarium") || n.includes("museum"))                       return "Attraction";
  if (n.includes("pier"))                                                    return "Public Space";
  if (n.includes("rec") || n.includes("recreation"))                        return "Recreation";
  if (n.includes("community center"))                                        return "Community Center";
  if (n.includes("shuffle") || n.includes("bar") || n.includes("club"))     return "Venue";
  return "Business";
}

function getTrustLabel(business) {
  const total = (business.contributors_count || 0) + (business.review_count || 0);
  if (total === 0)   return { label: "Needs verification", color: "#9ca3af" };
  if (total >= 20)   return { label: "Highly verified",    color: "#16a34a" };
  if (total >= 8)    return { label: "Community verified", color: "#0369a1" };
  if (total >= 3)    return { label: "Some verification",  color: "#d97706" };
  return               { label: "Limited data",            color: "#9ca3af" };
}

// ---------------------------------------------------------------------------
// SelectedCard — compact floating preview card over the map
// ---------------------------------------------------------------------------
function SelectedCard({ business, onClose }) {
  const score      = business.accessibility_score;
  const scoreColor = score == null ? "#9ca3af" : score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";
  const scoreBg    = score == null ? "#f3f4f6" : score >= 75 ? "#f0fdf4" : score >= 50 ? "#fffbeb" : "#fef2f2";
  const category   = getCategory(business.name);
  const trust      = getTrustLabel(business);

  const tags = [
    business.wheelchair_accessible != null && { label: "Wheelchair", ok: business.wheelchair_accessible },
    business.accessible_parking    != null && { label: "Parking",    ok: business.accessible_parking },
    business.accessible_restrooms  != null && { label: "Restroom",   ok: business.accessible_restrooms },
    business.entrance_width_rating         && {
      label: `Entrance: ${business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)}`,
      ok: business.entrance_width_rating !== "narrow",
    },
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
      borderRadius:    "16px",
      padding:         "16px 18px",
      boxShadow:       "0 4px 24px rgba(0,0,0,0.16)",
      zIndex:          10,
      display:         "flex",
      flexDirection:   "column",
      gap:             "8px",
    }}>
      <button
        onClick={onClose}
        style={{ position: "absolute", top: "12px", right: "14px", background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
      >✕</button>

      {/* Name + score */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingRight: "28px" }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827", display: "block", lineHeight: "1.3" }}>
            {business.name}
          </span>
          <span style={{
            display:         "inline-block",
            marginTop:       "3px",
            fontSize:        "10px",
            fontWeight:      "600",
            color:           "#6b7280",
            backgroundColor: "#f3f4f6",
            borderRadius:    "4px",
            padding:         "1px 5px",
            textTransform:   "uppercase",
            letterSpacing:   "0.2px",
          }}>
            {category}
          </span>
        </div>
        {score != null && (
          <div style={{
            display:         "flex",
            flexDirection:   "column",
            alignItems:      "center",
            backgroundColor: scoreBg,
            borderRadius:    "8px",
            padding:         "4px 9px",
            flexShrink:      0,
          }}>
            <span style={{ fontSize: "15px", fontWeight: "800", color: scoreColor, lineHeight: 1 }}>{score}</span>
            <span style={{ fontSize: "9px", fontWeight: "600", color: scoreColor, opacity: 0.7 }}>/100</span>
          </div>
        )}
      </div>

      {/* Address */}
      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>📍 {business.address}</p>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {tags.map(({ label, ok }) => (
            <span key={label} style={{
              fontSize:        "11px",
              fontWeight:      "500",
              padding:         "2px 8px",
              borderRadius:    "999px",
              backgroundColor: ok ? "#f0fdf4" : "#fef2f2",
              color:           ok ? "#16a34a" : "#dc2626",
              display:         "flex",
              alignItems:      "center",
              gap:             "3px",
            }}>
              <span style={{ fontSize: "9px" }}>{ok ? "✓" : "✗"}</span>
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Trust signal */}
      <p style={{ margin: 0, fontSize: "11px", fontWeight: "500", color: trust.color }}>
        {trust.label}
      </p>

      {/* View details */}
      <a
        href={`/business/${business.id}`}
        style={{
          display:         "block",
          textAlign:       "center",
          padding:         "10px",
          backgroundColor: "#111827",
          color:           "#fff",
          borderRadius:    "10px",
          fontSize:        "13px",
          fontWeight:      "600",
          textDecoration:  "none",
          marginTop:       "2px",
        }}
      >
        View Full Accessibility Report →
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------
function EmptyState({ hasFilters }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 12px", color: "#6b7280" }}>
      <div style={{ fontSize: "36px", marginBottom: "12px" }}>{hasFilters ? "🔍" : "📍"}</div>
      <p style={{ fontWeight: "600", fontSize: "15px", color: "#374151", margin: "0 0 6px" }}>
        {hasFilters ? "No places match your filters." : "No locations found."}
      </p>
      <p style={{ fontSize: "13px", margin: 0 }}>
        {hasFilters ? "Try removing a filter to see more results." : "Try searching for a business name above."}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilterChips
// ---------------------------------------------------------------------------
function FilterChips({ activeFilters, onToggle }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {FILTER_CHIPS.map(({ key, label }) => {
        const active = activeFilters.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            style={{
              padding:         "5px 11px",
              borderRadius:    "999px",
              border:          `1.5px solid ${active ? "#2563eb" : "#e5e7eb"}`,
              backgroundColor: active ? "#eff6ff" : "#fff",
              color:           active ? "#2563eb" : "#6b7280",
              fontSize:        "12px",
              fontWeight:      active ? "600" : "400",
              cursor:          "pointer",
              transition:      "all 0.12s",
              whiteSpace:      "nowrap",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------
export default function HomePage() {
  const [businesses,       setBusinesses]       = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [activeFilters,    setActiveFilters]    = useState(new Set());

  useEffect(() => {
    getTopRated()
      .then(setBusinesses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBusiness = (business) => {
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
  };

  const toggleFilter = (key) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else               next.add(key);
      return next;
    });
  };

  const filteredBusinesses = applyFilters(businesses, activeFilters);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "sans-serif" }}>

      {/* Top bar — search + filter chips */}
      <div style={{
        padding:         "10px 20px",
        backgroundColor: "#f9fafb",
        borderBottom:    "1px solid #f0f0f0",
        zIndex:          10,
        position:        "relative",
        display:         "flex",
        flexDirection:   "column",
        gap:             "8px",
      }}>
        <SearchBar onSelectBusiness={handleSelectBusiness} />
        <FilterChips activeFilters={activeFilters} onToggle={toggleFilter} />
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left — map with floating preview card */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapView
            businesses={filteredBusinesses}
            selectedBusiness={selectedBusiness}
            onSelectBusiness={handleSelectBusiness}
            mapCenter={null}
          />

          {selectedBusiness && (
            <SelectedCard business={selectedBusiness} onClose={() => setSelectedBusiness(null)} />
          )}
        </div>

        {/* Right — ranked business list */}
        <div style={{
          width:           "340px",
          overflowY:       "auto",
          borderLeft:      "1px solid #ebebeb",
          padding:         "16px 12px",
          backgroundColor: "#f9fafb",
        }}>

          {/* Panel header */}
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "700", color: "#111827", letterSpacing: "0.1px" }}>
              Accessible Places Near You
            </h2>
            <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>
              {activeFilters.size > 0
                ? `Filtered by ${activeFilters.size} need${activeFilters.size > 1 ? "s" : ""} · ranked by Pathable score`
                : "Ranked by Pathable score · tap a card to preview"}
            </p>
          </div>

          {/* Score legend */}
          <div style={{
            display:         "flex",
            gap:             "10px",
            padding:         "7px 10px",
            backgroundColor: "#fff",
            borderRadius:    "8px",
            border:          "1px solid #f0f0f0",
            marginBottom:    "12px",
          }}>
            {[
              { color: "#16a34a", label: "75+ High" },
              { color: "#d97706", label: "55–74 Good" },
              { color: "#dc2626", label: "< 55 Low" },
              { color: "#9ca3af", label: "No data" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: color, display: "inline-block", flexShrink: 0,
                }} />
                <span style={{ fontSize: "10px", color: "#6b7280" }}>{label}</span>
              </div>
            ))}
          </div>

          {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading locations...</p>}
          {error   && <p style={{ color: "#dc2626", fontSize: "14px" }}>Error: {error}</p>}
          {!loading && !error && filteredBusinesses.length === 0 && (
            <EmptyState hasFilters={activeFilters.size > 0} />
          )}
          {!loading && !error && filteredBusinesses.map((business, index) => (
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

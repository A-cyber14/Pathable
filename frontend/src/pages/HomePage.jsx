import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MapView      from "../components/MapView";
import BusinessCard from "../components/BusinessCard";
import SearchBar    from "../components/SearchBar";
import { getTopRated } from "../services/api";
import { useIsMobile } from "../hooks/useIsMobile";

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
// MobileDrawer — Google Maps-style bottom sheet for mobile
// ---------------------------------------------------------------------------
function MobileDrawer({ isOpen, onToggle, loading, error, businesses, selectedBusiness, onSelectBusiness, activeFilters }) {
  const dragStartY = useRef(null);
  const handleTouchStart = (e) => { dragStartY.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e) => {
    if (dragStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - dragStartY.current;
    if (delta > 50) onToggle(false);
    dragStartY.current = null;
  };

  // ── Collapsed: small floating pill bottom-left ──────────────────────────
  if (!isOpen) {
    return (
      <div
        onClick={() => onToggle(true)}
        style={{
          position:        "absolute",
          /* 80px clears the 64px nav + up to 34px iOS safe-area gap even when
             env(safe-area-inset-bottom) fails to apply on the App wrapper.     */
          bottom:          "calc(80px + env(safe-area-inset-bottom, 0px))",
          left:            "16px",
          backgroundColor: "#fff",
          borderRadius:    "999px",
          padding:         "11px 18px 11px 14px",
          boxShadow:       "0 4px 18px rgba(0,0,0,0.18)",
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          cursor:          "pointer",
          zIndex:          20,
          userSelect:      "none",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827", whiteSpace: "nowrap" }}>
          Accessible Places Near You
        </span>
      </div>
    );
  }

  // ── Expanded: full-width bottom sheet ───────────────────────────────────
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position:        "absolute",
        bottom:          0,
        left:            0,
        right:           0,
        height:          "65vh",
        backgroundColor: "#fff",
        borderRadius:    "16px 16px 0 0",
        boxShadow:       "0 -4px 20px rgba(0,0,0,0.12)",
        zIndex:          20,
        overflow:        "hidden",
        display:         "flex",
        flexDirection:   "column",
      }}
    >
      {/* Sheet header with close chevron */}
      <div
        onClick={() => onToggle(false)}
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          gap:             "8px",
          height:          "52px",
          flexShrink:      0,
          cursor:          "pointer",
          borderBottom:    "1px solid #f0f0f0",
          userSelect:      "none",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>
          Accessible Places Near You
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "0 12px 16px" }}>
        <div style={{ display: "flex", gap: "10px", padding: "10px 0", overflowX: "auto" }}>
          {[
            { color: "#16a34a", label: "75+ High" },
            { color: "#d97706", label: "55–74 Good" },
            { color: "#dc2626", label: "< 55 Low" },
            { color: "#9ca3af", label: "No data" },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: color, display: "inline-block" }} />
              <span style={{ fontSize: "10px", color: "#6b7280" }}>{label}</span>
            </div>
          ))}
        </div>

        {loading && <p style={{ color: "#6b7280", fontSize: "13px" }}>Loading locations…</p>}
        {error   && <p style={{ color: "#dc2626", fontSize: "13px" }}>Error: {error}</p>}
        {!loading && !error && businesses.length === 0 && (
          <EmptyState hasFilters={activeFilters.size > 0} />
        )}
        {!loading && !error && businesses.map((business, index) => (
          <BusinessCard
            key={business.id}
            business={business}
            isSelected={selectedBusiness?.id === business.id}
            onClick={() => onSelectBusiness(business)}
            rank={index + 1}
            compact
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SelectedCard — compact floating preview for a Pathable business
// ---------------------------------------------------------------------------
function SelectedCard({ business, onClose, bottomOffset = 20 }) {
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
      bottom:          `${bottomOffset}px`,
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

      <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>📍 {business.address}</p>

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
// ExternalPlaceCard — floating preview for a non-Pathable external place
// ---------------------------------------------------------------------------
function ExternalPlaceCard({ place, onClose, bottomOffset = 20 }) {
  const navigate = useNavigate();

  return (
    <div style={{
      position:        "absolute",
      bottom:          `${bottomOffset}px`,
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
function FilterChips({ activeFilters, onToggle, isMobile }) {
  return (
    <div style={{
      display:        "flex",
      gap:            "6px",
      flexWrap:       isMobile ? "nowrap" : "wrap",
      overflowX:      isMobile ? "auto" : "visible",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    }}>
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
  const isMobile = useIsMobile();

  const [businesses,            setBusinesses]            = useState([]);
  const [selectedBusiness,      setSelectedBusiness]      = useState(null);
  const [selectedExternalPlace, setSelectedExternalPlace] = useState(null);
  const [loading,               setLoading]               = useState(true);
  const [error,                 setError]                 = useState(null);
  const [activeFilters,         setActiveFilters]         = useState(new Set());
  const [drawerOpen,            setDrawerOpen]            = useState(false);

  useEffect(() => {
    getTopRated()
      .then(setBusinesses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectBusiness = (business) => {
    setSelectedExternalPlace(null);
    setSelectedBusiness((prev) => (prev?.id === business.id ? null : business));
    if (isMobile) setDrawerOpen(false);
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

  const cardBottom = 20;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "sans-serif" }}>

      {/* Top bar — search + filter chips */}
      <div style={{
        padding:         isMobile ? "8px 12px" : "10px 20px",
        backgroundColor: "#f9fafb",
        borderBottom:    "1px solid #f0f0f0",
        zIndex:          10,
        position:        "relative",
        display:         "flex",
        flexDirection:   "column",
        gap:             "8px",
        flexShrink:      0,
      }}>
        <SearchBar
          onSelectBusiness={handleSelectBusiness}
          onSelectExternalPlace={(place) => {
            setSelectedBusiness(null);
            setSelectedExternalPlace(place);
            if (isMobile) setDrawerOpen(false);
          }}
        />
        <FilterChips activeFilters={activeFilters} onToggle={toggleFilter} isMobile={isMobile} />
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Map + absolutely-positioned drawer overlay */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapView
            businesses={filteredBusinesses}
            selectedBusiness={selectedBusiness}
            onSelectBusiness={handleSelectBusiness}
            mapCenter={null}
            externalPlace={selectedExternalPlace}
          />

          {/* Floating preview cards — hide while mobile drawer is open */}
          {(!isMobile || !drawerOpen) && selectedBusiness && (
            <SelectedCard
              business={selectedBusiness}
              onClose={() => setSelectedBusiness(null)}
              bottomOffset={cardBottom}
            />
          )}

          {(!isMobile || !drawerOpen) && selectedExternalPlace && !selectedBusiness && (
            <ExternalPlaceCard
              place={selectedExternalPlace}
              onClose={() => setSelectedExternalPlace(null)}
              bottomOffset={cardBottom}
            />
          )}

          {/* Drawer: position:absolute anchors to the bottom of THIS container,
              which ends exactly where the bottom nav begins (App height accounts
              for 64px nav + env(safe-area-inset-bottom)). */}
          {isMobile && (
            <MobileDrawer
              isOpen={drawerOpen}
              onToggle={setDrawerOpen}
              loading={loading}
              error={error}
              businesses={filteredBusinesses}
              selectedBusiness={selectedBusiness}
              onSelectBusiness={handleSelectBusiness}
              activeFilters={activeFilters}
            />
          )}
        </div>

        {/* Desktop right panel — hidden on mobile */}
        {!isMobile && (
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
        )}
      </div>
    </div>
  );
}

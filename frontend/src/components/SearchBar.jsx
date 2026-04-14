import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchUnified } from "../services/api";

// ---------------------------------------------------------------------------
// SearchBar — dual-section search: Pathable businesses + external (Google) places
//
// Props:
//   onSelectBusiness(business)    — called when a Pathable DB result is selected
//   onSelectExternalPlace(place)  — called when a non-Pathable place is selected
//
// External place search runs CLIENT-SIDE via the Maps JS Places library so it
// works on Vercel even when GOOGLE_MAPS_API_KEY is not set on the Railway
// backend. The backend's unified search supplies DB results (and external ones
// too when its key is present); client-side results fill the gap otherwise.
// ---------------------------------------------------------------------------

const PINELLAS_CENTER = { lat: 27.9072, lng: -82.7169 };
const SEARCH_RADIUS_M = 40000; // ~25 miles, matches backend

// ---------------------------------------------------------------------------
// searchGooglePlaces — AutocompleteService (no map instance required)
// Returns results shaped like backend UnifiedSearchResult with in_db=false.
// Coordinates are null here; they're fetched lazily on selection.
// ---------------------------------------------------------------------------
function searchGooglePlaces(query) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places) return resolve([]);
    const svc = new window.google.maps.places.AutocompleteService();
    svc.getPlacePredictions(
      {
        input:    query,
        location: new window.google.maps.LatLng(PINELLAS_CENTER.lat, PINELLAS_CENTER.lng),
        radius:   SEARCH_RADIUS_M,
        types:    ["establishment"],
      },
      (predictions, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !predictions?.length
        ) {
          return resolve([]);
        }
        resolve(
          predictions.slice(0, 6).map((p) => ({
            id:                  null,
            name:                p.structured_formatting?.main_text || p.description,
            address:             p.structured_formatting?.secondary_text || "",
            place_id:            p.place_id,
            latitude:            null,   // filled in fetchPlaceCoords on selection
            longitude:           null,
            in_db:               false,
            accessibility_score: null,
          }))
        );
      }
    );
  });
}

// ---------------------------------------------------------------------------
// fetchPlaceCoords — PlacesService.getDetails for a single place_id
// Called only when the user clicks a result that has no coordinates yet.
// ---------------------------------------------------------------------------
function fetchPlaceCoords(placeId) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places) return resolve(null);
    // PlacesService accepts a plain HTMLElement for attributions (no map needed).
    const attrDiv = document.createElement("div");
    const svc = new window.google.maps.places.PlacesService(attrDiv);
    svc.getDetails(
      { placeId, fields: ["geometry", "name", "formatted_address"] },
      (place, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          resolve({
            name:      place.name,
            address:   place.formatted_address,
            latitude:  place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
          });
        } else {
          resolve(null);
        }
      }
    );
  });
}

// ---------------------------------------------------------------------------
// SearchBar component
// ---------------------------------------------------------------------------
export default function SearchBar({ onSelectBusiness, onSelectExternalPlace }) {
  const [query,            setQuery]            = useState("");
  const [results,          setResults]          = useState([]);
  const [dropdownVisible,  setDropdownVisible]  = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading,          setLoading]          = useState(false);
  const [searchError,      setSearchError]      = useState(false);

  const debounceRef  = useRef(null);
  const containerRef = useRef(null);
  const navigate     = useNavigate();

  // Split results into the two sections
  const pathableResults = results.filter((r) =>  r.in_db);
  const externalResults = results.filter((r) => !r.in_db);

  // Flat ordered list used for keyboard navigation (Pathable first, then external)
  const allResults = [...pathableResults, ...externalResults];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownVisible(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search — fires 300 ms after the user stops typing
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setHighlightedIndex(-1);

    if (!value.trim()) {
      setDropdownVisible(false);
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // Run backend search (Firestore DB + Places if key is set on Railway)
        // and client-side Places search in parallel. Client-side search is the
        // reliable fallback that makes external results work on Vercel even
        // when GOOGLE_MAPS_API_KEY is absent from the Railway environment.
        const [backendResults, placesResults] = await Promise.all([
          searchUnified(value).catch((err) => {
            console.error("[SearchBar] backend search-unified failed:", err?.message ?? err);
            return [];
          }),
          searchGooglePlaces(value),
        ]);

        // Dedup: skip client-side results already returned by the backend.
        const backendPlaceIds = new Set(
          backendResults.map((r) => r.place_id).filter(Boolean)
        );
        const uniqueClientResults = placesResults.filter(
          (r) => !backendPlaceIds.has(r.place_id)
        );

        const merged = [...backendResults, ...uniqueClientResults];

        setSearchError(false);
        setResults(merged);
        setDropdownVisible(value.trim().length >= 2);
      } catch (err) {
        console.error("[SearchBar] search failed:", err?.message ?? err);
        setSearchError(true);
        setResults([]);
        setDropdownVisible(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Keyboard navigation on the flat allResults array
  const handleKeyDown = (e) => {
    if (!dropdownVisible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && allResults[highlightedIndex]) {
        selectResult(allResults[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setDropdownVisible(false);
      setHighlightedIndex(-1);
    }
  };

  const selectResult = async (result) => {
    setQuery(result.name);
    setDropdownVisible(false);
    setHighlightedIndex(-1);

    if (result.in_db) {
      // Known to Pathable — highlight on map + navigate to detail page
      if (onSelectBusiness) onSelectBusiness(result);
      navigate(`/business/${result.id}`);
    } else {
      // External place — fetch coordinates if not already present (autocomplete
      // results don't include geometry; only PlacesService.getDetails provides it).
      let enriched = result;
      if ((result.latitude == null || result.longitude == null) && result.place_id) {
        const coords = await fetchPlaceCoords(result.place_id);
        if (coords) enriched = { ...result, ...coords };
      }
      if (onSelectExternalPlace) onSelectExternalPlace(enriched);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearchError(false);
    setDropdownVisible(false);
    setHighlightedIndex(-1);
    if (onSelectExternalPlace) onSelectExternalPlace(null);
  };

  // Returns the flat index into allResults for a given result (for highlight sync)
  const flatIndex = (result) => allResults.findIndex(
    (r) => (r.place_id && r.place_id === result.place_id) || (r.id && r.id === result.id)
  );

  // ---------------------------------------------------------------------------
  // Sub-components (defined inside so they close over flatIndex / highlightedIndex)
  // ---------------------------------------------------------------------------

  const ResultRow = ({ result }) => {
    const idx = flatIndex(result);
    return (
      <div
        key={result.place_id || result.id}
        onClick={() => selectResult(result)}
        onMouseEnter={() => setHighlightedIndex(idx)}
        style={{
          padding:         "10px 16px",
          cursor:          "pointer",
          backgroundColor: idx === highlightedIndex ? "#f3f4f6" : "#fff",
          borderBottom:    "1px solid #f3f4f6",
          transition:      "background-color 0.1s",
          display:         "flex",
          alignItems:      "center",
          gap:             "10px",
        }}
      >
        <span style={{ fontSize: "16px", flexShrink: 0, color: result.in_db ? "#2563eb" : "#9ca3af" }}>
          {result.in_db ? "🏢" : "📍"}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
              {result.name}
            </span>
            {result.in_db && (
              <span
                style={{
                  fontSize:        "11px",
                  fontWeight:      "600",
                  color:           "#d97706",
                  backgroundColor: "#fef3c7",
                  border:          "1px solid #fde68a",
                  borderRadius:    "4px",
                  padding:         "1px 5px",
                  flexShrink:      0,
                }}
              >
                ★ Pathable
              </span>
            )}
          </div>
          <div style={{ fontSize: "12px", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {result.address}
          </div>
        </div>

        {result.in_db && result.accessibility_score != null && (
          <span
            style={{
              fontSize:        "12px",
              fontWeight:      "700",
              color:           result.accessibility_score >= 75 ? "#16a34a" : result.accessibility_score >= 50 ? "#d97706" : "#dc2626",
              backgroundColor: result.accessibility_score >= 75 ? "#f0fdf4" : result.accessibility_score >= 50 ? "#fffbeb" : "#fef2f2",
              borderRadius:    "6px",
              padding:         "2px 6px",
              flexShrink:      0,
            }}
          >
            {result.accessibility_score}
          </span>
        )}
      </div>
    );
  };

  const SectionHeader = ({ label }) => (
    <div
      style={{
        padding:         "6px 16px 4px",
        fontSize:        "10px",
        fontWeight:      "700",
        color:           "#9ca3af",
        textTransform:   "uppercase",
        letterSpacing:   "0.5px",
        backgroundColor: "#f9fafb",
        borderBottom:    "1px solid #f3f4f6",
      }}
    >
      {label}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>

      {/* Input row */}
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          border:          "1px solid #e5e7eb",
          borderRadius:    dropdownVisible ? "12px 12px 0 0" : "12px",
          padding:         "12px 18px",
          backgroundColor: "#fff",
          boxShadow:       dropdownVisible ? "none" : "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
          transition:      "border-radius 0.1s, box-shadow 0.15s",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search any place…"
          autoComplete="off"
          style={{
            flex:            1,
            border:          "none",
            outline:         "none",
            fontSize:        "16px",
            color:           "#111827",
            backgroundColor: "transparent",
          }}
        />

        {loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
            style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        )}

        {query && !loading && (
          <button
            onClick={clearSearch}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "16px", padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Dropdown — two sections */}
      {dropdownVisible && (
        <div
          style={{
            position:        "absolute",
            top:             "100%",
            left:            0,
            right:           0,
            backgroundColor: "#fff",
            border:          "1px solid #e5e7eb",
            borderTop:       "none",
            borderRadius:    "0 0 12px 12px",
            boxShadow:       "0 4px 16px rgba(0,0,0,0.10)",
            zIndex:          1000,
            overflow:        "hidden",
          }}
        >
          {searchError ? (
            <div style={{ padding: "12px 16px", fontSize: "13px", color: "#dc2626" }}>
              Search unavailable — check your connection and try again.
            </div>
          ) : allResults.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: "14px", color: "#6b7280" }}>
              No results found
            </div>
          ) : (
            <>
              {/* Section 1 — Pathable Locations */}
              {pathableResults.length > 0 && (
                <>
                  <SectionHeader label="Pathable Locations" />
                  {pathableResults.map((r) => <ResultRow key={r.id} result={r} />)}
                </>
              )}

              {/* Section 2 — Other Places */}
              {externalResults.length > 0 && (
                <>
                  <SectionHeader label="Other Places" />
                  {externalResults.map((r) => <ResultRow key={r.place_id} result={r} />)}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

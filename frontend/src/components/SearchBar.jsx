import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchUnified } from "../services/api";

// ---------------------------------------------------------------------------
// SearchBar — unified search across Firestore businesses + Google Places
//
// Props:
//   onSelectBusiness(business) — optional, called when a DB result is selected
//                                so the parent can highlight it on the map
//
// Result click behavior:
//   in_db  → navigate to /business/:id
//   !in_db → navigate to /place/:placeId  (UnverifiedBusinessPage)
// ---------------------------------------------------------------------------

export default function SearchBar({ onSelectBusiness }) {
  const [query,            setQuery]            = useState("");
  const [results,          setResults]          = useState([]);
  const [dropdownVisible,  setDropdownVisible]  = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading,          setLoading]          = useState(false);

  const debounceRef  = useRef(null);
  const containerRef = useRef(null);
  const navigate     = useNavigate();

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

  // Debounced unified search — fires 300ms after user stops typing
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
        const data = await searchUnified(value);
        setResults(data);
        setDropdownVisible(data.length > 0 && value.trim().length >= 2);
      } catch {
        setDropdownVisible(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!dropdownVisible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        selectResult(results[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setDropdownVisible(false);
      setHighlightedIndex(-1);
    }
  };

  const selectResult = (result) => {
    setQuery(result.name);
    setDropdownVisible(false);
    setHighlightedIndex(-1);

    if (result.in_db) {
      // Known to Pathable — go to full detail page
      if (onSelectBusiness) onSelectBusiness(result);
      navigate(`/business/${result.id}`);
    } else {
      // Google Places only — go to unverified detail page, pass data via state
      navigate(`/place/${result.place_id}`, { state: { place: result } });
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setDropdownVisible(false);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", flex: 1 }}>

      {/* Input row */}
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          border:          "1px solid #d1d5db",
          borderRadius:    dropdownVisible ? "8px 8px 0 0" : "8px",
          padding:         "8px 12px",
          backgroundColor: "#fff",
          transition:      "border-radius 0.1s",
        }}
      >
        {/* Magnifier icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search businesses or places..."
          autoComplete="off"
          style={{
            flex:            1,
            border:          "none",
            outline:         "none",
            fontSize:        "15px",
            color:           "#111827",
            backgroundColor: "transparent",
          }}
        />

        {/* Loading spinner */}
        {loading && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
            style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        )}

        {/* Clear */}
        {query && !loading && (
          <button
            onClick={clearSearch}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "16px", padding: 0, lineHeight: 1 }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Dropdown */}
      {dropdownVisible && (
        <div
          style={{
            position:        "absolute",
            top:             "100%",
            left:            0,
            right:           0,
            backgroundColor: "#fff",
            border:          "1px solid #d1d5db",
            borderTop:       "none",
            borderRadius:    "0 0 8px 8px",
            boxShadow:       "0 4px 16px rgba(0,0,0,0.12)",
            zIndex:          1000,
            overflow:        "hidden",
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: "12px 16px", fontSize: "14px", color: "#6b7280" }}>
              No results found
            </div>
          ) : (
            results.map((result, index) => (
              <div
                key={result.place_id || result.id || index}
                onClick={() => selectResult(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding:         "10px 16px",
                  cursor:          "pointer",
                  backgroundColor: index === highlightedIndex ? "#f3f4f6" : "#fff",
                  borderBottom:    index < results.length - 1 ? "1px solid #f3f4f6" : "none",
                  transition:      "background-color 0.1s",
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "10px",
                }}
              >
                {/* Icon: pin for Places, building for DB */}
                <span style={{ fontSize: "16px", flexShrink: 0, color: result.in_db ? "#2563eb" : "#9ca3af" }}>
                  {result.in_db ? "🏢" : "📍"}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                      {result.name}
                    </span>
                    {/* ★ badge — only for verified Pathable businesses */}
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

                {/* Score badge for DB results */}
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
            ))
          )}
        </div>
      )}
    </div>
  );
}

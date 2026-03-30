import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchBusinesses } from "../services/api";

// ---------------------------------------------------------------------------
// SearchBar
// Autocomplete search with dropdown, keyboard nav, outside-click close.
// Matches the search bar style from Image 1.
//
// Props:
//   onSearch(results) — called with the latest BusinessSummary[] after each
//                       search so HomePage can update the map/list
// ---------------------------------------------------------------------------

export default function SearchBar({ onSearch }) {
  const [query,          setQuery]          = useState("");
  const [searchResults,  setSearchResults]  = useState([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const debounceRef  = useRef(null);
  const containerRef = useRef(null);
  const navigate     = useNavigate();

  // ------------------------------------------------------------------
  // Close dropdown when user clicks outside the search container
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Debounced search — fires 300ms after user stops typing
  // ------------------------------------------------------------------
  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setHighlightedIndex(-1);

    // Clear dropdown immediately if input is cleared
    if (!value.trim()) {
      setDropdownVisible(false);
      setSearchResults([]);
      searchBusinesses("").then(onSearch).catch(() => {});
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchBusinesses(value);
        onSearch(results);                          // update map + list in HomePage
        setSearchResults(results.slice(0, 5));      // dropdown shows max 5
        setDropdownVisible(value.trim().length >= 2);
      } catch {
        setDropdownVisible(false);
      }
    }, 300);
  };

  // ------------------------------------------------------------------
  // Keyboard navigation — arrow keys + enter + escape
  // ------------------------------------------------------------------
  const handleKeyDown = (e) => {
    if (!dropdownVisible) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
        selectResult(searchResults[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setDropdownVisible(false);
      setHighlightedIndex(-1);
    }
  };

  // ------------------------------------------------------------------
  // Select a result — navigate to detail page, close dropdown
  // ------------------------------------------------------------------
  const selectResult = (business) => {
    setQuery(business.name);
    setDropdownVisible(false);
    setHighlightedIndex(-1);
    navigate(`/business/${business.id}`);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", flex: 1 }}
    >
      {/* Search input — matches Image 1 style */}
      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "8px",
          border:       "1px solid #d1d5db",
          borderRadius: dropdownVisible ? "8px 8px 0 0" : "8px",
          padding:      "8px 12px",
          backgroundColor: "#fff",
          transition:   "border-radius 0.1s",
        }}
      >
        <span style={{ color: "#9ca3af", fontSize: "16px" }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for accessible locations..."
          autoComplete="off"
          style={{
            flex:       1,
            border:     "none",
            outline:    "none",
            fontSize:   "15px",
            color:      "#111827",
            backgroundColor: "transparent",
          }}
        />
        {/* Clear button — only shown when there is a query */}
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setDropdownVisible(false);
              setSearchResults([]);
              searchBusinesses("").then(onSearch).catch(() => {});
            }}
            style={{
              background: "none",
              border:     "none",
              cursor:     "pointer",
              color:      "#9ca3af",
              fontSize:   "16px",
              padding:    "0",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
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
            boxShadow:       "0 4px 12px rgba(0,0,0,0.1)",
            zIndex:          1000,
            overflow:        "hidden",
          }}
        >
          {searchResults.length === 0 ? (
            // No results state
            <div
              style={{
                padding:  "12px 16px",
                fontSize: "14px",
                color:    "#6b7280",
              }}
            >
              No results found
            </div>
          ) : (
            searchResults.map((business, index) => (
              <div
                key={business.id}
                onClick={() => selectResult(business)}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding:         "10px 16px",
                  cursor:          "pointer",
                  backgroundColor: index === highlightedIndex ? "#f3f4f6" : "#fff",
                  borderBottom:    index < searchResults.length - 1 ? "1px solid #f3f4f6" : "none",
                  transition:      "background-color 0.1s",
                }}
              >
                {/* Business name */}
                <div
                  style={{
                    fontSize:   "14px",
                    fontWeight: "600",
                    color:      "#111827",
                    marginBottom: "2px",
                  }}
                >
                  {business.name}
                </div>
                {/* Address — smaller grey text */}
                <div
                  style={{
                    fontSize: "12px",
                    color:    "#6b7280",
                  }}
                >
                  {business.address}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

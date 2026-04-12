import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { setupBusiness, searchBusinesses } from "../services/api";

// ---------------------------------------------------------------------------
// BusinessSetupPage
// Route: /business-setup
// Reached from AccountTypePage after selecting "Business Account".
// The user must pick an existing Pathable business — no manual creation.
// ---------------------------------------------------------------------------

const inputStyle = {
  width:           "100%",
  padding:         "10px 12px",
  fontSize:        "14px",
  border:          "1.5px solid #d1d5db",
  borderRadius:    "8px",
  outline:         "none",
  backgroundColor: "#f9fafb",
  color:           "#111827",
  fontFamily:      "sans-serif",
  boxSizing:       "border-box",
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function BusinessSetupPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [query,         setQuery]         = useState("");
  const [results,       setResults]       = useState([]);
  const [searching,     setSearching]     = useState(false);
  const [selectedBiz,   setSelectedBiz]   = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState(null);

  const debouncedQuery = useDebounce(query, 350);

  // Fetch matching businesses as the user types
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchBusinesses(debouncedQuery)
      .then((res) => setResults(Array.isArray(res) ? res.slice(0, 8) : []))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  const handleSelect = (biz) => {
    setSelectedBiz(biz);
    setQuery(biz.name);
    setResults([]);
    setError(null);
  };

  const handleContinue = async () => {
    if (!selectedBiz) {
      setError("Please select your business from the list.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setupBusiness({ claim_id: selectedBiz.id });
      await refreshProfile();
      navigate("/business-profile");
    } catch (err) {
      setError(err.message || "Failed to link business. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        minHeight:      "100vh",
        backgroundColor: "#f9fafb",
        fontFamily:     "sans-serif",
        padding:        "48px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>🏢</div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
            Find Your Business
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: "1.6" }}>
            Search for your business in Pathable and link it to your account.
          </p>
        </div>

        {/* Search card */}
        <div
          style={{
            backgroundColor: "#fff",
            border:          "1px solid #e5e7eb",
            borderRadius:    "14px",
            padding:         "24px",
            boxShadow:       "0 1px 4px rgba(0,0,0,0.05)",
            marginBottom:    "16px",
          }}
        >
          <label
            style={{
              display:      "block",
              fontSize:     "12px",
              fontWeight:   "600",
              color:        "#6b7280",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Business Name
          </label>

          <div style={{ position: "relative" }}>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedBiz(null); setError(null); }}
              placeholder="Start typing to search…"
              style={inputStyle}
              autoFocus
            />

            {/* Search results dropdown */}
            {!searching && results.length > 0 && (
              <div
                style={{
                  position:        "absolute",
                  top:             "calc(100% + 6px)",
                  left:            0,
                  right:           0,
                  backgroundColor: "#fff",
                  border:          "1px solid #e5e7eb",
                  borderRadius:    "10px",
                  boxShadow:       "0 4px 16px rgba(0,0,0,0.1)",
                  zIndex:          10,
                  overflow:        "hidden",
                }}
              >
                {results.map((biz, i) => (
                  <button
                    key={biz.id}
                    onClick={() => handleSelect(biz)}
                    style={{
                      display:    "block",
                      width:      "100%",
                      textAlign:  "left",
                      padding:    "12px 14px",
                      background: "none",
                      border:     "none",
                      borderBottom: i < results.length - 1 ? "1px solid #f3f4f6" : "none",
                      cursor:     "pointer",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{biz.name}</div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{biz.address}</div>
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <div style={{ marginTop: "8px", fontSize: "13px", color: "#9ca3af" }}>Searching…</div>
            )}

            {!searching && debouncedQuery.trim() && results.length === 0 && !selectedBiz && (
              <div style={{ marginTop: "8px", fontSize: "13px", color: "#9ca3af" }}>
                No businesses found. Try a different name.
              </div>
            )}
          </div>

          {/* Selected confirmation */}
          {selectedBiz && (
            <div
              style={{
                marginTop:       "12px",
                padding:         "12px 14px",
                backgroundColor: "#f0fdf4",
                border:          "1.5px solid #bbf7d0",
                borderRadius:    "8px",
                display:         "flex",
                justifyContent:  "space-between",
                alignItems:      "center",
              }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{selectedBiz.name}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "1px" }}>{selectedBiz.address}</div>
              </div>
              <button
                onClick={() => { setSelectedBiz(null); setQuery(""); }}
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "16px", padding: "0 0 0 12px", flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {error && (
          <p style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 12px" }}>{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={submitting || !selectedBiz}
          style={{
            width:           "100%",
            padding:         "14px",
            backgroundColor: "#111827",
            color:           "#fff",
            border:          "none",
            borderRadius:    "10px",
            fontSize:        "15px",
            fontWeight:      "600",
            cursor:          submitting || !selectedBiz ? "not-allowed" : "pointer",
            opacity:         submitting || !selectedBiz ? 0.5 : 1,
            transition:      "opacity 0.15s",
          }}
        >
          {submitting ? "Linking your business…" : "Continue →"}
        </button>

        <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginTop: "12px", lineHeight: "1.5" }}>
          Your business must already be listed on Pathable. Contact us if you can't find it.
        </p>
      </div>
    </div>
  );
}

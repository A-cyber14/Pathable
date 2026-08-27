import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { setupBusiness, searchBusinesses, updateProfile } from "../services/api";

// ---------------------------------------------------------------------------
// BusinessSetupPage
// Route: /business-setup
// First business-specific onboarding step (before plan selection — you
// shouldn't pick a plan before knowing you can claim/create the right
// business). Lets the owner search all Pathable listings (verified and
// unverified — search already covers both), claim an unclaimed one, or add
// a brand new business if theirs isn't listed yet.
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

  const [query,       setQuery]       = useState("");
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [claimingId,  setClaimingId]  = useState(null);
  const [error,       setError]       = useState(null);

  const debouncedQuery = useDebounce(query, 350);

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

  const handleClaim = async (biz) => {
    if (claimingId) return;
    setClaimingId(biz.id);
    setError(null);
    try {
      await setupBusiness({ claim_id: biz.id });
      await refreshProfile();
      try { await updateProfile({ onboardingStep: "business-plan" }); } catch { /* non-blocking */ }
      navigate("/business-setup/plan");
    } catch (err) {
      setError(err.message || "Failed to claim this business. Please try again.");
    } finally {
      setClaimingId(null);
    }
  };

  const handleAddNew = () => navigate("/business-setup/new");

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        minHeight:      "100vh",
        backgroundColor: "#f9fafb",
        fontFamily:     "sans-serif",
        padding:        "48px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px", position: "relative" }}>

        <button
          onClick={() => navigate("/account-type")}
          aria-label="Close"
          style={{
            position: "absolute", top: 0, right: 0,
            background: "none", border: "none", fontSize: "22px",
            cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "4px",
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 22V12h6v10" />
              <path d="M3 9h18" />
            </svg>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
            Is your business already on Pathable?
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: "1.6" }}>
            Search by name to claim your existing listing, or add it if it isn't here yet.
          </p>
        </div>

        {/* Search card */}
        <div
          style={{
            backgroundColor: "#fff",
            border:          "1px solid #e5e7eb",
            borderRadius:    "14px",
            padding:         "22px",
            boxShadow:       "0 1px 4px rgba(0,0,0,0.05)",
            marginBottom:    "16px",
          }}
        >
          <label htmlFor="biz-search" style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Business Name
          </label>

          <input
            id="biz-search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null); }}
            placeholder="Start typing to search…"
            style={inputStyle}
            autoFocus
          />

          {searching && (
            <p style={{ marginTop: "10px", fontSize: "13px", color: "#9ca3af" }}>Searching…</p>
          )}

          {!searching && debouncedQuery.trim() && results.length === 0 && (
            <p style={{ marginTop: "10px", fontSize: "13px", color: "#9ca3af" }}>
              No businesses found matching "{debouncedQuery.trim()}".
            </p>
          )}

          {!searching && results.length > 0 && (
            <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {results.map((biz) => (
                <div
                  key={biz.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px",
                    padding: "12px 14px", border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#fafafa",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{biz.name}</span>
                      {biz.verified && (
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "999px", padding: "1px 7px" }}>
                          ✓ Pathable Verified
                        </span>
                      )}
                      {biz.claimed && (
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#92400e", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "999px", padding: "1px 7px" }}>
                          Already claimed
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                      {biz.address}{biz.category ? ` · ${biz.category}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaim(biz)}
                    disabled={biz.claimed || claimingId === biz.id}
                    style={{
                      flexShrink: 0, padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600",
                      border: "none",
                      backgroundColor: biz.claimed ? "#e5e7eb" : "#111827",
                      color: biz.claimed ? "#9ca3af" : "#fff",
                      cursor: biz.claimed || claimingId === biz.id ? "not-allowed" : "pointer",
                      minHeight: "36px",
                    }}
                  >
                    {claimingId === biz.id ? "Claiming…" : biz.claimed ? "Claimed" : "Claim this business"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 16px" }}>{error}</p>
        )}

        {/* Fallback actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={handleAddNew}
            style={{
              width: "100%", padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none",
              borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer", minHeight: "48px",
            }}
          >
            + Add a new business
          </button>
          <button
            onClick={handleAddNew}
            style={{
              width: "100%", padding: "12px", backgroundColor: "#fff", color: "#374151",
              border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600",
              cursor: "pointer", minHeight: "44px",
            }}
          >
            I can't find my business
          </button>
        </div>
      </div>
    </div>
  );
}

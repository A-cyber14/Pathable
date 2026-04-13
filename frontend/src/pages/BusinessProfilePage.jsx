import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getDashboardBusiness,
  updateDashboardBusiness,
  getDashboardReviews,
  getDashboardAnalytics,
  respondToReview,
  getBusinessPhotos,
  searchBusinesses,
  setupBusiness,
} from "../services/api";

// ---------------------------------------------------------------------------
// Style tokens — identical to the rest of Pathable
// ---------------------------------------------------------------------------

const card = {
  backgroundColor: "#fff",
  border:          "1px solid #e5e7eb",
  borderRadius:    "12px",
  padding:         "20px",
  marginBottom:    "16px",
  boxShadow:       "0 1px 3px rgba(0,0,0,0.04)",
};

const sectionLabel = {
  margin:        "0 0 14px",
  fontSize:      "12px",
  fontWeight:    "600",
  color:         "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

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

const fieldLabel = {
  display:      "block",
  fontSize:     "12px",
  fontWeight:   "600",
  color:        "#6b7280",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function Stars({ rating }) {
  return (
    <span style={{ letterSpacing: "1px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#f59e0b" : "#d1d5db", fontSize: "14px" }}>★</span>
      ))}
    </span>
  );
}

function FeatureRow({ icon, label, present }) {
  const color  = present === true ? "#16a34a" : present === false ? "#dc2626" : "#9ca3af";
  const bg     = present === true ? "#f0fdf4" : present === false ? "#fef2f2" : "#f9fafb";
  const border = present === true ? "#bbf7d0" : present === false ? "#fecaca" : "#e5e7eb";
  const text   = present === true ? "Yes"     : present === false ? "No"      : "Not confirmed";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: "14px", color: "#374151" }}>{icon} {label}</span>
      <span style={{ fontSize: "12px", fontWeight: "600", color, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: "999px", padding: "2px 10px" }}>
        {text}
      </span>
    </div>
  );
}

function PercentBar({ icon, label, value }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>{icon} {label}</span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{value}%</span>
      </div>
      <div style={{ height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", backgroundColor: "#2563eb", borderRadius: "999px", transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewCard
// ---------------------------------------------------------------------------

function ReviewCard({ review, onRespond }) {
  const [showForm,     setShowForm]     = useState(false);
  const [responseText, setResponseText] = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [err,          setErr]          = useState(null);

  const submit = async () => {
    if (!responseText.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await respondToReview(review.id, { message: responseText.trim() });
      onRespond(review.id, responseText.trim());
      setShowForm(false);
      setResponseText("");
    } catch (e) {
      setErr(e.message || "Failed to send response.");
    } finally {
      setSubmitting(false);
    }
  };

  const dateStr = review.submitted_at
    ? new Date(review.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div style={{ paddingBottom: "16px", borderBottom: "1px solid #f3f4f6", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <Stars rating={review.rating} />
        {dateStr && <span style={{ fontSize: "12px", color: "#9ca3af" }}>{dateStr}</span>}
      </div>
      <p style={{ fontSize: "14px", color: "#374151", margin: "0 0 8px", lineHeight: "1.6" }}>{review.comment}</p>

      {/* Positive feature tags */}
      {(() => {
        const tags = [];
        if (review.wheelchair_accessible === true) tags.push("Wheelchair ✓");
        if (review.accessible_parking    === true) tags.push("Parking ✓");
        if (review.accessible_restrooms  === true) tags.push("Restrooms ✓");
        if (review.elevator              === true) tags.push("Elevator ✓");
        if (review.auto_doors            === true) tags.push("Auto Doors ✓");
        if (!tags.length) return null;
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
            {tags.map((t) => (
              <span key={t} style={{ fontSize: "11px", fontWeight: "600", color: "#16a34a", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "999px", padding: "2px 8px" }}>
                {t}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Response */}
      {review.response ? (
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "8px", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            Your Response
          </div>
          <p style={{ fontSize: "13px", color: "#374151", margin: 0, lineHeight: "1.5" }}>{review.response.message}</p>
        </div>
      ) : (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{ fontSize: "13px", fontWeight: "500", color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              + Respond
            </button>
          ) : (
            <div>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write a response…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5", marginBottom: "8px" }}
              />
              {err && <p style={{ color: "#dc2626", fontSize: "12px", margin: "0 0 6px" }}>{err}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={submit}
                  disabled={submitting || !responseText.trim()}
                  style={{ padding: "8px 16px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: submitting || !responseText.trim() ? "not-allowed" : "pointer", opacity: submitting || !responseText.trim() ? 0.55 : 1 }}
                >
                  {submitting ? "Sending…" : "Send"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setResponseText(""); setErr(null); }}
                  style={{ padding: "8px 16px", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature constants
// ---------------------------------------------------------------------------

const FEATURES = [
  { key: "wheelchair_accessible",        label: "Wheelchair Accessible",        icon: "♿" },
  { key: "accessible_parking",           label: "Accessible Parking",           icon: "🚗" },
  { key: "accessible_restrooms",         label: "Accessible Restrooms",         icon: "🚻" },
  { key: "elevator",                     label: "Elevator",                     icon: "🛗" },
  { key: "auto_doors",                   label: "Automatic Doors",              icon: "🔄" },
  { key: "wheelchair_accessible_tables", label: "Wheelchair-Accessible Tables", icon: "🪑" },
  { key: "handrails_available",          label: "Handrails Available",          icon: "🪜" },
];

const ENTRANCE_LABELS = {
  wide:     "Wide — fully accessible",
  standard: "Standard — 36″ minimum",
  narrow:   "Narrow — may be challenging",
};

const ANALYTICS_ITEMS = [
  { key: "wheelchairAccessible", label: "Wheelchair Access",            icon: "♿" },
  { key: "parking",              label: "Accessible Parking",           icon: "🚗" },
  { key: "entrance",             label: "Wide Entrances",               icon: "🚪" },
  { key: "restroom",             label: "Accessible Restrooms",         icon: "🚻" },
  { key: "elevator",             label: "Elevator",                     icon: "🛗" },
  { key: "automaticDoors",       label: "Automatic Doors",              icon: "🔄" },
  { key: "tables",               label: "Wheelchair-Accessible Tables", icon: "🪑" },
  { key: "handrails",            label: "Handrails",                    icon: "🪜" },
];

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function BusinessProfilePage() {
  const { currentUser, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [business,  setBusiness]  = useState(null);
  const [reviews,   setReviews]   = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [photos,    setPhotos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error,     setError]     = useState(null);

  // Claim form state (used when forbidden)
  const [claimQuery,       setClaimQuery]       = useState("");
  const [claimResults,     setClaimResults]     = useState([]);
  const [claimSearching,   setClaimSearching]   = useState(false);
  const [claimSelected,    setClaimSelected]    = useState(null);
  const [claimSubmitting,  setClaimSubmitting]  = useState(false);
  const [claimError,       setClaimError]       = useState(null);

  const debouncedClaimQuery = useDebounce(claimQuery, 350);

  useEffect(() => {
    if (!debouncedClaimQuery.trim()) { setClaimResults([]); return; }
    setClaimSearching(true);
    searchBusinesses(debouncedClaimQuery)
      .then((res) => setClaimResults(Array.isArray(res) ? res.slice(0, 8) : []))
      .catch(() => setClaimResults([]))
      .finally(() => setClaimSearching(false));
  }, [debouncedClaimQuery]);

  const handleClaimContinue = async () => {
    if (!claimSelected) { setClaimError("Please select your business from the list."); return; }
    setClaimSubmitting(true);
    setClaimError(null);
    try {
      await setupBusiness({ claim_id: claimSelected.id });
      await refreshProfile();
      navigate("/business-profile");
    } catch (err) {
      setClaimError(err.message || "Failed to link business. Please try again.");
    } finally {
      setClaimSubmitting(false);
    }
  };

  // Edit state
  const [editing,     setEditing]     = useState(false);
  const [editName,    setEditName]    = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDesc,    setEditDesc]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [saveErr,     setSaveErr]     = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setLoading(true);
      try {
        const biz = await getDashboardBusiness();
        setBusiness(biz);
        setEditName(biz.name || "");
        setEditAddress(biz.address || "");
        setEditDesc(biz.description || "");

        const [revs, stats, photoList] = await Promise.all([
          getDashboardReviews(),
          getDashboardAnalytics(),
          getBusinessPhotos(biz.id),
        ]);
        setReviews(revs);
        setAnalytics(stats);
        setPhotos(photoList || []);
      } catch (e) {
        if (e.message?.toLowerCase().includes("business access required")) {
          setForbidden(true);
        } else {
          setError(e.message || "Failed to load your business profile.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [currentUser]);

  const handleSave = async () => {
    setSaving(true); setSaved(false); setSaveErr(null);
    try {
      await updateDashboardBusiness({
        name:        editName.trim()    || undefined,
        address:     editAddress.trim() || undefined,
        description: editDesc.trim()    || undefined,
      });
      setBusiness((b) => ({ ...b, name: editName.trim(), address: editAddress.trim(), description: editDesc.trim() }));
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setSaveErr(e.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(business?.name || "");
    setEditAddress(business?.address || "");
    setEditDesc(business?.description || "");
    setSaveErr(null);
  };

  const handleRespond = (reviewId, message) => {
    setReviews((prev) =>
      prev.map((r) => r.id === reviewId ? { ...r, response: { message, createdAt: new Date().toISOString() } } : r)
    );
  };

  // ── Loading / error states ────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>Please sign in to access your business profile.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading your business profile…</p>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
        <div style={{ maxWidth: "480px", margin: "0 auto" }}>

          {/* Header row with sign out */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px" }}>🏢</span>
              <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#111827", margin: 0 }}>Claim Your Business</h1>
            </div>
            <button
              onClick={async () => { await logout(); navigate("/"); }}
              style={{ padding: "7px 14px", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", flexShrink: 0 }}
            >
              Sign out
            </button>
          </div>

          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.6" }}>
            Search for your business in Pathable and link it to your account.
          </p>

          {/* Search card */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Business Name
            </label>

            <div style={{ position: "relative" }}>
              <input
                value={claimQuery}
                onChange={(e) => { setClaimQuery(e.target.value); setClaimSelected(null); setClaimError(null); }}
                placeholder="Start typing to search…"
                style={{ width: "100%", padding: "10px 12px", fontSize: "14px", border: "1.5px solid #d1d5db", borderRadius: "8px", outline: "none", backgroundColor: "#f9fafb", color: "#111827", fontFamily: "sans-serif", boxSizing: "border-box" }}
                autoFocus
              />

              {/* Search results dropdown */}
              {!claimSearching && claimResults.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", zIndex: 10, overflow: "hidden" }}>
                  {claimResults.map((biz, i) => (
                    <button
                      key={biz.id}
                      onClick={() => { setClaimSelected(biz); setClaimQuery(biz.name); setClaimResults([]); setClaimError(null); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 14px", background: "none", border: "none", borderBottom: i < claimResults.length - 1 ? "1px solid #f3f4f6" : "none", cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{biz.name}</div>
                      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{biz.address}</div>
                    </button>
                  ))}
                </div>
              )}

              {claimSearching && (
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#9ca3af" }}>Searching…</div>
              )}

              {!claimSearching && debouncedClaimQuery.trim() && claimResults.length === 0 && !claimSelected && (
                <div style={{ marginTop: "8px", fontSize: "13px", color: "#9ca3af" }}>No businesses found. Try a different name.</div>
              )}
            </div>

            {/* Selected confirmation */}
            {claimSelected && (
              <div style={{ marginTop: "12px", padding: "12px 14px", backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{claimSelected.name}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "1px" }}>{claimSelected.address}</div>
                </div>
                <button
                  onClick={() => { setClaimSelected(null); setClaimQuery(""); }}
                  style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "16px", padding: "0 0 0 12px", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {claimError && (
            <p style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 12px" }}>{claimError}</p>
          )}

          <button
            onClick={handleClaimContinue}
            disabled={claimSubmitting || !claimSelected}
            style={{ width: "100%", padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: claimSubmitting || !claimSelected ? "not-allowed" : "pointer", opacity: claimSubmitting || !claimSelected ? 0.5 : 1, transition: "opacity 0.15s" }}
          >
            {claimSubmitting ? "Linking your business…" : "Continue →"}
          </button>

          <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginTop: "12px", lineHeight: "1.5" }}>
            Your business must already be listed on Pathable. Contact us if you can't find it.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{ color: "#dc2626", fontSize: "14px" }}>{error}</p>
        </div>
      </div>
    );
  }

  const awaitingResponse = reviews.filter((r) => !r.response).length;

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 3px" }}>
              {business.name}
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>{business.address}</p>
          </div>
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            style={{ padding: "7px 14px", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", flexShrink: 0 }}
          >
            Sign out
          </button>
        </div>

        {/* ── Quick stats ── */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {[
            { icon: "💬", value: business.review_count ?? 0,       label: "Reviews"           },
            { icon: "📷", value: business.photos_count ?? 0,       label: "Photos"            },
            { icon: "👥", value: business.contributors_count ?? 0, label: "Contributors"      },
            { icon: "⚠️", value: awaitingResponse,                   label: "Awaiting Response" },
          ].map(({ icon, value, label }) => (
            <div
              key={label}
              style={{
                flex:            1,
                backgroundColor: "#fff",
                border:          "1px solid #e5e7eb",
                borderRadius:    "10px",
                padding:         "12px 8px",
                textAlign:       "center",
                boxShadow:       "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>{icon} {value}</div>
              <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px", lineHeight: "1.3" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 1. Business Overview                                        */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={sectionLabel}>Business Overview</p>
            {!editing && (
              <button
                onClick={() => { setEditing(true); setSaved(false); }}
                style={{ padding: "5px 12px", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "7px", fontSize: "12px", fontWeight: "500", cursor: "pointer" }}
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={fieldLabel}>Business Name</label>
                <input value={editName} onChange={(e) => { setEditName(e.target.value); setSaved(false); }} style={inputStyle} />
              </div>
              <div>
                <label style={fieldLabel}>Address</label>
                <input value={editAddress} onChange={(e) => { setEditAddress(e.target.value); setSaved(false); }} style={inputStyle} />
              </div>
              <div>
                <label style={fieldLabel}>Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => { setEditDesc(e.target.value); setSaved(false); }}
                  placeholder="Tell visitors about your business…"
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }}
                />
              </div>
              {saveErr && <p style={{ color: "#dc2626", fontSize: "13px", margin: 0 }}>{saveErr}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 1, padding: "11px", backgroundColor: saved ? "#16a34a" : "#111827", color: "#fff", border: "none", borderRadius: "9px", fontSize: "14px", fontWeight: "600", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, transition: "background-color 0.2s" }}
                >
                  {saved ? "✓ Saved" : saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  style={{ padding: "11px 18px", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "9px", fontSize: "14px", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#111827" }}>{business.name}</div>
              <div style={{ fontSize: "13px", color: "#6b7280" }}>{business.address}</div>
              {business.description
                ? <p style={{ fontSize: "14px", color: "#374151", margin: "4px 0 0", lineHeight: "1.6", paddingTop: "8px", borderTop: "1px solid #f3f4f6" }}>{business.description}</p>
                : <p style={{ fontSize: "13px", color: "#9ca3af", margin: "4px 0 0", fontStyle: "italic" }}>No description yet — click Edit to add one.</p>
              }

              {/* Community score */}
              {business.community_score != null && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f3f4f6" }}>
                  <Stars rating={Math.round(business.community_score)} />
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>
                    {business.community_score.toFixed(1)} average from {business.review_count} review{business.review_count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 2. Accessibility Details                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div style={card}>
          <p style={sectionLabel}>Accessibility Details</p>
          {FEATURES.map((f) => (
            <FeatureRow key={f.key} icon={f.icon} label={f.label} present={business[f.key] ?? null} />
          ))}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <span style={{ fontSize: "14px", color: "#374151" }}>🚪 Entrance Width</span>
            <span style={{ fontSize: "12px", fontWeight: "600", color: business.entrance_width_rating ? "#374151" : "#9ca3af", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "999px", padding: "2px 10px" }}>
              {business.entrance_width_rating
                ? ENTRANCE_LABELS[business.entrance_width_rating] ?? business.entrance_width_rating
                : "Not confirmed"}
            </span>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#9ca3af" }}>
            To update accessibility data, use the Contribute flow from the business's public page.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3. Media                                                    */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ ...sectionLabel, margin: 0 }}>Photos & Videos</p>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{photos.length} uploaded</span>
          </div>
          {photos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>📷</div>
              <p style={{ fontSize: "13px", margin: 0 }}>No media uploaded yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
              {photos.slice(0, 8).map((photo, i) => (
                <div key={photo.id ?? i} style={{ aspectRatio: "1", borderRadius: "8px", overflow: "hidden", backgroundColor: "#f3f4f6" }}>
                  {photo.mediaType === "video" ? (
                    <video src={photo.photoUrl} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <img src={photo.photoUrl} alt={photo.caption || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                </div>
              ))}
            </div>
          )}
          {photos.length > 8 && (
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "10px 0 0" }}>+ {photos.length - 8} more</p>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 4. Reviews                                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ ...sectionLabel, margin: 0 }}>Reviews</p>
            {awaitingResponse > 0 && (
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#d97706", backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "999px", padding: "2px 10px" }}>
                {awaitingResponse} awaiting response
              </span>
            )}
          </div>
          {reviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>💬</div>
              <p style={{ fontSize: "13px", margin: 0 }}>No reviews yet.</p>
            </div>
          ) : (
            reviews.map((r) => (
              <ReviewCard key={r.id} review={r} onRespond={handleRespond} />
            ))
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 5. Insights                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div style={card}>
          <p style={{ ...sectionLabel, marginBottom: "4px" }}>Accessibility Insights</p>
          <p style={{ margin: "0 0 18px", fontSize: "13px", color: "#6b7280" }}>
            What accessibility features matter most to people using Pathable.
          </p>
          {analytics ? (
            [...ANALYTICS_ITEMS]
              .sort((a, b) => (analytics[b.key] ?? 0) - (analytics[a.key] ?? 0))
              .map((item) => (
                <PercentBar key={item.key} icon={item.icon} label={item.label} value={analytics[item.key] ?? 0} />
              ))
          ) : (
            <p style={{ color: "#9ca3af", fontSize: "13px" }}>Loading insights…</p>
          )}
        </div>

      </div>
    </div>
  );
}

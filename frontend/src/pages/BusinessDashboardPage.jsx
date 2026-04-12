import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getDashboardBusiness,
  updateDashboardBusiness,
  getDashboardReviews,
  getDashboardAnalytics,
  respondToReview,
  getBusinessPhotos,
} from "../services/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["Profile", "Reviews", "Analytics"];

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
  { key: "wheelchairAccessible", label: "Wheelchair Access",           icon: "♿" },
  { key: "parking",              label: "Accessible Parking",          icon: "🚗" },
  { key: "entrance",             label: "Wide Entrances",              icon: "🚪" },
  { key: "restroom",             label: "Accessible Restrooms",        icon: "🚻" },
  { key: "elevator",             label: "Elevator",                    icon: "🛗" },
  { key: "automaticDoors",       label: "Automatic Doors",             icon: "🔄" },
  { key: "tables",               label: "Wheelchair-Accessible Tables",icon: "🪑" },
  { key: "handrails",            label: "Handrails",                   icon: "🪜" },
];

// ---------------------------------------------------------------------------
// Shared style tokens — match existing Pathable card/button style exactly
// ---------------------------------------------------------------------------

const cardStyle = {
  backgroundColor: "#fff",
  border:          "1px solid #e5e7eb",
  borderRadius:    "12px",
  padding:         "20px",
  marginBottom:    "16px",
  boxShadow:       "0 1px 3px rgba(0,0,0,0.04)",
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

const labelStyle = {
  display:      "block",
  fontSize:     "12px",
  fontWeight:   "600",
  color:        "#6b7280",
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

// ---------------------------------------------------------------------------
// Stars — read-only star display
// ---------------------------------------------------------------------------

function Stars({ rating }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= rating ? "#f59e0b" : "#d1d5db", fontSize: "15px" }}>
          ★
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Percentage bar — used in Analytics tab
// ---------------------------------------------------------------------------

function PercentBar({ icon, label, value }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{value}%</span>
      </div>
      <div style={{ height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
        <div
          style={{
            width:           `${value}%`,
            height:          "100%",
            backgroundColor: "#2563eb",
            borderRadius:    "999px",
            transition:      "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature pill — green/red/gray chip for accessibility data display
// ---------------------------------------------------------------------------

function FeaturePill({ present, label, icon }) {
  const color  = present === true ? "#16a34a" : present === false ? "#dc2626" : "#9ca3af";
  const bg     = present === true ? "#f0fdf4" : present === false ? "#fef2f2" : "#f9fafb";
  const border = present === true ? "#bbf7d0" : present === false ? "#fecaca" : "#e5e7eb";
  const text   = present === true ? "Yes"     : present === false ? "No"      : "Not confirmed";

  return (
    <div
      style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "10px 0",
        borderBottom:    "1px solid #f3f4f6",
      }}
    >
      <span style={{ fontSize: "14px", color: "#374151" }}>
        {icon} {label}
      </span>
      <span
        style={{
          fontSize:        "12px",
          fontWeight:      "600",
          color,
          backgroundColor: bg,
          border:          `1px solid ${border}`,
          borderRadius:    "999px",
          padding:         "2px 10px",
        }}
      >
        {text}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReviewCard — single review with inline response form
// ---------------------------------------------------------------------------

function ReviewCard({ review, onRespond }) {
  const [showForm,      setShowForm]      = useState(false);
  const [responseText,  setResponseText]  = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState(null);

  const handleSubmit = async () => {
    if (!responseText.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await respondToReview(review.id, { message: responseText.trim() });
      onRespond(review.id, responseText.trim());
      setShowForm(false);
      setResponseText("");
    } catch (err) {
      setError(err.message || "Failed to submit response.");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = review.submitted_at
    ? new Date(review.submitted_at).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <div style={{ ...cardStyle, marginBottom: "12px" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
        <Stars rating={review.rating} />
        {formattedDate && (
          <span style={{ fontSize: "12px", color: "#9ca3af", flexShrink: 0, marginLeft: "12px" }}>
            {formattedDate}
          </span>
        )}
      </div>

      {/* Review comment */}
      <p style={{ fontSize: "14px", color: "#374151", margin: "0 0 10px", lineHeight: "1.6" }}>
        {review.comment}
      </p>

      {/* Accessibility tags */}
      {(() => {
        const tags = [];
        if (review.wheelchair_accessible  === true)  tags.push("Wheelchair ✓");
        if (review.accessible_parking     === true)  tags.push("Parking ✓");
        if (review.accessible_restrooms   === true)  tags.push("Restrooms ✓");
        if (review.elevator               === true)  tags.push("Elevator ✓");
        if (review.auto_doors             === true)  tags.push("Auto Doors ✓");
        if (!tags.length) return null;
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: "11px", fontWeight: "600", color: "#16a34a",
                  backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: "999px", padding: "2px 8px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Business response or respond button */}
      {review.response ? (
        <div
          style={{
            backgroundColor: "#f9fafb",
            border:          "1px solid #f3f4f6",
            borderRadius:    "8px",
            padding:         "12px 14px",
          }}
        >
          <div
            style={{
              fontSize:      "11px",
              fontWeight:    "600",
              color:         "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom:  "4px",
            }}
          >
            Business Response
          </div>
          <p style={{ fontSize: "13px", color: "#374151", margin: 0, lineHeight: "1.5" }}>
            {review.response.message}
          </p>
          {review.response.createdAt && (
            <span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "6px", display: "block" }}>
              {new Date(review.response.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>
      ) : (
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              style={{
                fontSize:   "13px",
                fontWeight: "500",
                color:      "#2563eb",
                background: "none",
                border:     "none",
                cursor:     "pointer",
                padding:    0,
              }}
            >
              + Respond to this review
            </button>
          ) : (
            <div style={{ marginTop: "8px" }}>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write a response..."
                rows={3}
                style={{
                  ...inputStyle,
                  resize:     "vertical",
                  lineHeight: "1.5",
                }}
              />
              {error && (
                <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 8px" }}>{error}</p>
              )}
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !responseText.trim()}
                  style={{
                    padding:         "8px 18px",
                    backgroundColor: "#111827",
                    color:           "#fff",
                    border:          "none",
                    borderRadius:    "8px",
                    fontSize:        "13px",
                    fontWeight:      "600",
                    cursor:          submitting || !responseText.trim() ? "not-allowed" : "pointer",
                    opacity:         submitting || !responseText.trim() ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Sending…" : "Send Response"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setResponseText(""); setError(null); }}
                  style={{
                    padding:         "8px 18px",
                    backgroundColor: "#fff",
                    color:           "#6b7280",
                    border:          "1px solid #e5e7eb",
                    borderRadius:    "8px",
                    fontSize:        "13px",
                    fontWeight:      "500",
                    cursor:          "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function BusinessDashboardPage() {
  const { currentUser } = useAuth();

  const [activeTab,  setActiveTab]  = useState("Profile");
  const [business,   setBusiness]   = useState(null);
  const [reviews,    setReviews]    = useState([]);
  const [analytics,  setAnalytics]  = useState(null);
  const [photos,     setPhotos]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [forbidden,  setForbidden]  = useState(false);
  const [error,      setError]      = useState(null);

  // Profile edit state
  const [editing,     setEditing]     = useState(false);
  const [editName,    setEditName]    = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editDesc,    setEditDesc]    = useState("");
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [saveError,   setSaveError]   = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    async function load() {
      setLoading(true);
      setForbidden(false);
      setError(null);
      try {
        const biz = await getDashboardBusiness();
        setBusiness(biz);
        setEditName(biz.name    || "");
        setEditAddress(biz.address || "");
        setEditDesc(biz.description || "");

        // Load reviews, analytics, and photos in parallel
        const [revs, analytics, photoList] = await Promise.all([
          getDashboardReviews(),
          getDashboardAnalytics(),
          getBusinessPhotos(biz.id),
        ]);
        setReviews(revs);
        setAnalytics(analytics);
        setPhotos(photoList || []);
      } catch (err) {
        if (err.message?.toLowerCase().includes("business access required")) {
          setForbidden(true);
        } else {
          setError(err.message || "Failed to load dashboard.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentUser]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await updateDashboardBusiness({
        name:        editName.trim()    || undefined,
        address:     editAddress.trim() || undefined,
        description: editDesc.trim()    || undefined,
      });
      setBusiness((b) => ({
        ...b,
        name:        editName.trim(),
        address:     editAddress.trim(),
        description: editDesc.trim(),
      }));
      setSaved(true);
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditName(business?.name    || "");
    setEditAddress(business?.address || "");
    setEditDesc(business?.description || "");
    setSaveError(null);
  };

  // After a review response is submitted, update local state so it renders immediately
  const handleRespond = (reviewId, message) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, response: { message, createdAt: new Date().toISOString() } }
          : r
      )
    );
  };

  // ── Loading / error states ──────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>Please sign in to access the business dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🏢</div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: "0 0 8px" }}>
              Business Dashboard
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: "1.5" }}>
              This page is for verified business owners. If you manage a business on Pathable,
              contact us to get access.
            </p>
          </div>
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

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>

        {/* Page header */}
        <div style={{ marginBottom: "6px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 4px" }}>
            Business Dashboard
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            {business?.name} — Manage your profile, reviews, and accessibility insights
          </p>
        </div>

        {/* Quick stats row */}
        <div style={{ display: "flex", gap: "12px", margin: "20px 0" }}>
          {[
            { icon: "💬", value: business?.review_count ?? 0,  label: "Reviews"      },
            { icon: "📷", value: business?.photos_count ?? 0,  label: "Photos"       },
            { icon: "👥", value: business?.contributors_count ?? 0, label: "Contributors" },
          ].map(({ icon, value, label }) => (
            <div
              key={label}
              style={{
                flex:            1,
                backgroundColor: "#fff",
                border:          "1px solid #e5e7eb",
                borderRadius:    "10px",
                padding:         "14px",
                textAlign:       "center",
                boxShadow:       "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                {icon} {value}
              </div>
              <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div
          style={{
            display:         "flex",
            gap:             "4px",
            marginBottom:    "20px",
            backgroundColor: "#f3f4f6",
            borderRadius:    "10px",
            padding:         "4px",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex:            1,
                padding:         "8px 0",
                fontSize:        "13px",
                fontWeight:      "600",
                border:          "none",
                borderRadius:    "7px",
                cursor:          "pointer",
                transition:      "background-color 0.15s, color 0.15s",
                backgroundColor: activeTab === tab ? "#fff"     : "transparent",
                color:           activeTab === tab ? "#111827"  : "#6b7280",
                boxShadow:       activeTab === tab ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Profile tab ─────────────────────────────────────────────── */}
        {activeTab === "Profile" && (
          <>
            {/* Business info card */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Business Info
                </p>
                {!editing && (
                  <button
                    onClick={() => { setEditing(true); setSaved(false); }}
                    style={{
                      padding:         "6px 14px",
                      backgroundColor: "#fff",
                      color:           "#6b7280",
                      border:          "1px solid #e5e7eb",
                      borderRadius:    "8px",
                      fontSize:        "13px",
                      fontWeight:      "500",
                      cursor:          "pointer",
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={labelStyle}>Business Name</label>
                    <input
                      value={editName}
                      onChange={(e) => { setEditName(e.target.value); setSaved(false); }}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input
                      value={editAddress}
                      onChange={(e) => { setEditAddress(e.target.value); setSaved(false); }}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Description</label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => { setEditDesc(e.target.value); setSaved(false); }}
                      placeholder="Tell visitors about your business…"
                      rows={4}
                      style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }}
                    />
                  </div>

                  {saveError && (
                    <p style={{ color: "#dc2626", fontSize: "13px", margin: 0 }}>{saveError}</p>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        flex:            1,
                        padding:         "11px",
                        backgroundColor: saved ? "#16a34a" : "#111827",
                        color:           "#fff",
                        border:          "none",
                        borderRadius:    "9px",
                        fontSize:        "14px",
                        fontWeight:      "600",
                        cursor:          saving ? "not-allowed" : "pointer",
                        opacity:         saving ? 0.7 : 1,
                        transition:      "background-color 0.2s",
                      }}
                    >
                      {saved ? "✓ Saved" : saving ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      style={{
                        padding:         "11px 20px",
                        backgroundColor: "#fff",
                        color:           "#6b7280",
                        border:          "1px solid #e5e7eb",
                        borderRadius:    "9px",
                        fontSize:        "14px",
                        fontWeight:      "500",
                        cursor:          "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>{business.name}</div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>{business.address}</div>
                  </div>
                  {business.description && (
                    <p style={{ fontSize: "14px", color: "#374151", margin: 0, lineHeight: "1.6", paddingTop: "4px", borderTop: "1px solid #f3f4f6" }}>
                      {business.description}
                    </p>
                  )}
                  {!business.description && (
                    <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0, fontStyle: "italic" }}>
                      No description added yet — click Edit to add one.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Accessibility data card */}
            <div style={cardStyle}>
              <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Accessibility Details
              </p>
              {FEATURES.map((f) => (
                <FeaturePill
                  key={f.key}
                  icon={f.icon}
                  label={f.label}
                  present={business[f.key] ?? null}
                />
              ))}
              {/* Entrance width special case */}
              <div
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "space-between",
                  padding:      "10px 0",
                }}
              >
                <span style={{ fontSize: "14px", color: "#374151" }}>🚪 Entrance Width</span>
                <span
                  style={{
                    fontSize:        "12px",
                    fontWeight:      "600",
                    color:           business.entrance_width_rating ? "#374151" : "#9ca3af",
                    backgroundColor: "#f3f4f6",
                    border:          "1px solid #e5e7eb",
                    borderRadius:    "999px",
                    padding:         "2px 10px",
                  }}
                >
                  {business.entrance_width_rating
                    ? ENTRANCE_LABELS[business.entrance_width_rating] ?? business.entrance_width_rating
                    : "Not confirmed"}
                </span>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                To update accessibility data, use the Contribute flow from a business page.
              </p>
            </div>

            {/* Media card */}
            <div style={cardStyle}>
              <p style={{ margin: "0 0 14px", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Photos & Videos
              </p>
              {photos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af" }}>
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>📷</div>
                  <p style={{ fontSize: "13px", margin: 0 }}>No media uploaded yet.</p>
                </div>
              ) : (
                <div
                  style={{
                    display:             "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap:                 "8px",
                  }}
                >
                  {photos.slice(0, 8).map((photo, i) => (
                    <div
                      key={photo.id ?? i}
                      style={{
                        aspectRatio:     "1",
                        borderRadius:    "8px",
                        overflow:        "hidden",
                        backgroundColor: "#f3f4f6",
                      }}
                    >
                      {photo.mediaType === "video" ? (
                        <video
                          src={photo.photoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        <img
                          src={photo.photoUrl}
                          alt={photo.caption || ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {photos.length > 8 && (
                <p style={{ fontSize: "12px", color: "#9ca3af", margin: "10px 0 0" }}>
                  + {photos.length - 8} more
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Reviews tab ─────────────────────────────────────────────── */}
        {activeTab === "Reviews" && (
          <>
            {reviews.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "40px 24px" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>💬</div>
                <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                  No reviews yet. They'll show up here once customers start posting.
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 14px" }}>
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  {" · "}
                  {reviews.filter((r) => !r.response).length} awaiting response
                </p>
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} onRespond={handleRespond} />
                ))}
              </>
            )}
          </>
        )}

        {/* ── Analytics tab ───────────────────────────────────────────── */}
        {activeTab === "Analytics" && (
          <>
            <div style={cardStyle}>
              <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                User Accessibility Preferences
              </p>
              <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>
                What accessibility features matter most to people using Pathable.
              </p>
              {analytics ? (
                [...ANALYTICS_ITEMS]
                  .sort((a, b) => (analytics[b.key] ?? 0) - (analytics[a.key] ?? 0))
                  .map((item) => (
                    <PercentBar
                      key={item.key}
                      icon={item.icon}
                      label={item.label}
                      value={analytics[item.key] ?? 0}
                    />
                  ))
              ) : (
                <p style={{ color: "#9ca3af", fontSize: "13px" }}>Loading analytics…</p>
              )}
            </div>

            <div style={{ ...cardStyle, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "600", color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Tip
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.6" }}>
                Features that rank highest here are what your visitors care about most.
                Make sure your accessibility data is up to date for those features.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

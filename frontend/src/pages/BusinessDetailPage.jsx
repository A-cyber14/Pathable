import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBusiness, addBookmark, getProfile } from "../services/api";

const PHOTO_SLOTS = [
  { label: "Entrance",            icon: "🚪" },
  { label: "Bathroom",            icon: "🚻" },
  { label: "Parking Lot",         icon: "🚗" },
  { label: "Interior Navigation", icon: "🗺" },
  { label: "Seating / Service",   icon: "🪑" },
  { label: "Other",               icon: "📷" },
];

// ---------------------------------------------------------------------------
// calculatePathableScore
//
// Score = featuresScore + preferenceScore + confidenceRaw
// This is the ONLY place scores are calculated for display.
// The badge always shows s.total — the exact sum of the three sections below.
// ---------------------------------------------------------------------------
function calculatePathableScore(business, userPreferences = []) {

  // --- 1. FEATURES SCORE (0–50) ---
  const featureChecks = [
    { key: "wheelchair_accessible", label: "Ramps / Wheelchair Access", icon: "♿", weight: 15 },
    { key: "accessible_parking",    label: "Accessible Parking",         icon: "🚗", weight: 10 },
    { key: "entrance_width",        label: "Accessible Entrance Width",  icon: "🚪", weight: 10 },
    { key: "accessible_restrooms",  label: "Accessible Restrooms",       icon: "🚻", weight: 8  },
    { key: "elevator",              label: "Elevator",                   icon: "🛗", weight: 4  },
    { key: "auto_doors",            label: "Automatic Doors",            icon: "🔄", weight: 3  },
  ];

  const features = featureChecks.map((f) => {
    let present = false;
    if (f.key === "entrance_width") {
      present = business.entrance_width_rating === "wide" || business.entrance_width_rating === "standard";
    } else {
      present = !!business[f.key];
    }
    return { ...f, present };
  });

  const featuresScore = features.reduce((sum, f) => sum + (f.present ? f.weight : 0), 0);

  // --- 2. PREFERENCE MATCH SCORE (0–30) ---
  const prefToFeature = {
    accessible_parking:   "accessible_parking",
    wide_entrances:       "entrance_width",
    accessible_restrooms: "accessible_restrooms",
    elevators:            "elevator",
    automatic_doors:      "auto_doors",
  };

  let matchedCount = 0;
  const totalPrefs = userPreferences.length;

  userPreferences.forEach((pref) => {
    const featureKey = prefToFeature[pref];
    if (featureKey) {
      const feature = features.find((f) => f.key === featureKey);
      if (feature?.present) matchedCount++;
    }
  });

  const preferenceScore = totalPrefs > 0
    ? Math.round((matchedCount / totalPrefs) * 30)
    : 15;

  const matchPercent = totalPrefs > 0
    ? Math.round((matchedCount / totalPrefs) * 100)
    : null;

  // --- 3. CONFIDENCE SCORE (0–20) ---
  const filledFields = features.filter((f) => {
    if (f.key === "entrance_width") return business.entrance_width_rating != null;
    return business[f.key] !== undefined && business[f.key] !== null;
  }).length;

  const confidenceRaw = Math.round((filledFields / features.length) * 20);

  const confidenceLabel =
    confidenceRaw >= 15 ? "High"   :
    confidenceRaw >= 8  ? "Medium" : "Low";

  const confidenceColor =
    confidenceRaw >= 15 ? "#16a34a" :
    confidenceRaw >= 8  ? "#d97706" : "#dc2626";

  // --- TOTAL — badge always shows this exact number ---
  const total = featuresScore + preferenceScore + confidenceRaw;

  const scoreColor  = total >= 75 ? "#16a34a" : total >= 50 ? "#d97706" : "#dc2626";
  const scoreBg     = total >= 75 ? "#f0fdf4" : total >= 50 ? "#fffbeb" : "#fef2f2";
  const scoreBorder = total >= 75 ? "#bbf7d0" : total >= 50 ? "#fde68a" : "#fecaca";

  return {
    total,
    featuresScore,
    preferenceScore,
    confidenceRaw,
    confidenceLabel,
    confidenceColor,
    confidencePct: Math.round((filledFields / features.length) * 100),
    features,
    matchedCount,
    totalPrefs,
    matchPercent,
    scoreColor,
    scoreBg,
    scoreBorder,
  };
}

// ---------------------------------------------------------------------------
// ScoreBar
// ---------------------------------------------------------------------------
function ScoreBar({ value, max, color }) {
  return (
    <div style={{ flex: 1, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", backgroundColor: color, borderRadius: "999px" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PathableRatingBadge
// Badge shows s.total — the literal sum of the three breakdown sections.
// ---------------------------------------------------------------------------
function PathableRatingBadge({ business, userPreferences }) {
  const [open, setOpen] = useState(false);
  const s = calculatePathableScore(business, userPreferences);

  return (
    <div style={{ position: "relative" }}>

      <button
        onClick={() => setOpen((v) => !v)}
        title="Click to see score breakdown"
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <span style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Pathable Score
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: s.scoreBg, border: `1.5px solid ${s.scoreBorder}`, borderRadius: "10px", padding: "6px 14px" }}>
          <span style={{ fontSize: "24px", fontWeight: "800", color: s.scoreColor, lineHeight: 1 }}>
            {s.total}
          </span>
          <span style={{ fontSize: "13px", color: "#9ca3af" }}>/100</span>
          <span style={{ fontSize: "11px", color: "#9ca3af" }}>▾</span>
        </div>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: "320px", backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "14px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, overflow: "hidden" }}>

            <div style={{ padding: "14px 16px", backgroundColor: s.scoreBg, borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>Score Breakdown</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "1px" }}>How this rating is calculated</div>
              </div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: s.scoreColor }}>
                {s.total}<span style={{ fontSize: "14px", color: "#9ca3af", fontWeight: "400" }}>/100</span>
              </div>
            </div>

            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Features */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>Accessibility Features</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{s.featuresScore}/50</span>
                </div>
                <ScoreBar value={s.featuresScore} max={50} color="#2563eb" />
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                  {s.features.map((f) => (
                    <div key={f.key} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px", borderRadius: "6px", backgroundColor: f.present ? "#f0fdf4" : "#f9fafb" }}>
                      <span style={{ fontSize: "14px", width: "20px", textAlign: "center" }}>{f.icon}</span>
                      <span style={{ flex: 1, fontSize: "13px", color: "#374151" }}>{f.label}</span>
                      <span style={{ fontWeight: "700", fontSize: "13px", color: f.present ? "#16a34a" : "#d1d5db" }}>
                        {f.present ? `+${f.weight}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preference Match */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Preference Match</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#111827" }}>{s.preferenceScore}/30</span>
                </div>
                <ScoreBar value={s.preferenceScore} max={30} color="#7c3aed" />
                <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>
                  {s.matchPercent !== null
                    ? `${s.matchedCount} of ${s.totalPrefs} preferred features present (${s.matchPercent}% match)`
                    : "Set preferences in your profile to get a personalized score."}
                </div>
              </div>

              {/* Confidence */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#374151", textTransform: "uppercase", letterSpacing: "0.5px" }}>Data Confidence</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: s.confidenceColor }}>{s.confidenceLabel} ({s.confidenceRaw}/20)</span>
                </div>
                <ScoreBar value={s.confidenceRaw} max={20} color={s.confidenceColor} />
                <div style={{ marginTop: "6px", fontSize: "12px", color: "#6b7280" }}>
                  {s.confidencePct}% of accessibility fields have reported data
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FeatureCard + CheckRow
// ---------------------------------------------------------------------------
function FeatureCard({ title, icon, children }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", flex: "1 1 calc(50% - 8px)", minWidth: "240px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function CheckRow({ label, value, note }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: "14px", color: "#374151" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {note && <span style={{ fontSize: "12px", color: "#6b7280" }}>{note}</span>}
        <span style={{ color: value ? "#16a34a" : "#9ca3af", fontSize: "16px" }}>{value ? "✓" : "✗"}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BusinessDetailPage
// ---------------------------------------------------------------------------
export default function BusinessDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [business,    setBusiness]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [bookmarked,  setBookmarked]  = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [userPrefs,   setUserPrefs]   = useState([]);

  useEffect(() => {
    getBusiness(id)
      .then(setBusiness)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getProfile()
      .then((data) => setUserPrefs(data.featurePreferences || []))
      .catch(() => {});
  }, []);

  const handleBookmark = async () => {
    if (bookmarked || bookmarking) return;
    setBookmarking(true);
    try {
      await addBookmark(business.id);
      setBookmarked(true);
    } catch (err) {
      alert(err.message || "Failed to bookmark. Are you signed in?");
    } finally {
      setBookmarking(false);
    }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontFamily: "sans-serif" }}>Loading...</div>;
  if (error || !business) return <div style={{ padding: "40px", textAlign: "center", color: "#dc2626", fontFamily: "sans-serif" }}>{error || "Business not found."}</div>;

  const photos = /*business.photos ||*/ ["/photos/Chipotle_Entrance_Picture.jpg", "/photos/Chipotle_Interior.jpg", "/photos/Chipotle_Parking.jpeg", "/photos/Chipotle_Bathroom_Pic.jpeg"];
  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 20px" }}>

        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "14px", padding: 0, marginBottom: "20px", display: "flex", alignItems: "center", gap: "4px" }}>
          ← Back to Map
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#111827", paddingRight: "16px" }}>
            {business.name}
          </h1>
          <PathableRatingBadge business={business} userPreferences={userPrefs} />
        </div>

        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#6b7280" }}>📍 {business.address}</p>

        {business.description && (
          <p style={{ margin: "0 0 28px", fontSize: "15px", color: "#374151", lineHeight: "1.6" }}>{business.description}</p>
        )}

        {/* Photos */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "16px" }}>🖼</span>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>Photos</h2>
            <span style={{ backgroundColor: photos.length > 0 ? "#111827" : "#e5e7eb", color: photos.length > 0 ? "#fff" : "#6b7280", borderRadius: "999px", padding: "1px 8px", fontSize: "12px", fontWeight: "600" }}>
              {photos.length}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {PHOTO_SLOTS.map((slot, i) => {
              const url = photos[i];
              return url ? (
                <img key={i} src={url} alt={slot.label} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: "10px", display: "block" }} />
              ) : (
                <div key={i} style={{ aspectRatio: "4/3", borderRadius: "10px", backgroundColor: "#f3f4f6", border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px" }}>
                  <span style={{ fontSize: "22px" }}>{slot.icon}</span>
                  <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", fontWeight: "500" }}>{slot.label}</span>
                  <span style={{ fontSize: "10px", color: "#d1d5db" }}>No photo yet</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature cards */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
          <FeatureCard title="Parking" icon="🚗">
            <CheckRow label="Accessible Parking" value={business.accessible_parking} note={business.accessible_parking ? "Available" : "Not available"} />
          </FeatureCard>
          <FeatureCard title="Door Width" icon="🚪">
            {business.entrance_width_rating ? (
              <>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#111827", marginBottom: "4px" }}>
                  {business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)}
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                  {business.entrance_width_rating === "wide"
                    ? "Fully accessible (wide entry)"
                    : business.entrance_width_rating === "standard"
                    ? 'Accessible (standard 36" minimum)'
                    : "May be difficult for some mobility aids"}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>Not reported</p>
            )}
          </FeatureCard>
          <FeatureCard title="Restrooms" icon="♿">
            <CheckRow label="Accessible Restrooms" value={business.accessible_restrooms} note={business.accessible_restrooms ? "Accessible" : "Not confirmed"} />
          </FeatureCard>
          <FeatureCard title="Building" icon="🏢">
            <CheckRow label="Elevator"        value={business.elevator} />
            <CheckRow label="Ramps"           value={business.wheelchair_accessible} />
            <CheckRow label="Automatic Doors" value={business.auto_doors} />
          </FeatureCard>
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={handleBookmark}
            disabled={bookmarked || bookmarking}
            style={{ flex: 1, padding: "14px", backgroundColor: bookmarked ? "#16a34a" : "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: bookmarked || bookmarking ? "default" : "pointer", opacity: bookmarking ? 0.7 : 1, transition: "background-color 0.2s" }}
          >
            {bookmarked ? "✓ Bookmarked" : bookmarking ? "Saving..." : "Add to Bookmarks"}
          </button>
          <button
            onClick={() => console.log("Report Issue — auth required")}
            style={{ padding: "14px 20px", backgroundColor: "#fff", color: "#111827", border: "1px solid #d1d5db", borderRadius: "10px", fontSize: "15px", fontWeight: "500", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Report Issue / Update Info
          </button>
        </div>

      </div>
    </div>
  );
}

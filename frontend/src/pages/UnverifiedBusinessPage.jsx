import { useParams, useLocation, useNavigate } from "react-router-dom";

// Photo slot placeholders — same labels as BusinessDetailPage
const PHOTO_SLOTS = [
  { label: "Entrance",            icon: "🚪" },
  { label: "Bathroom",            icon: "🚻" },
  { label: "Parking Lot",         icon: "🚗" },
  { label: "Interior Navigation", icon: "🗺" },
  { label: "Seating / Service",   icon: "🪑" },
  { label: "Other",               icon: "📷" },
];

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

function NotReported() {
  return <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>Not yet reported</p>;
}

// ---------------------------------------------------------------------------
// UnverifiedBusinessPage
// Route: /place/:placeId
//
// Shown when a user clicks a Google Places result that is NOT in Pathable's DB.
// Data is passed via React Router location.state.place — if missing (e.g. direct
// URL navigation) we redirect home rather than show a blank page.
// ---------------------------------------------------------------------------
export default function UnverifiedBusinessPage() {
  const { placeId } = useParams();
  const { state }   = useLocation();
  const navigate    = useNavigate();

  const place = state?.place;

  // Guard: no data means someone hit this URL directly — send them home
  if (!place) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 20px" }}>

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "14px", padding: 0, marginBottom: "20px", display: "flex", alignItems: "center", gap: "4px" }}
        >
          ← Back to Map
        </button>

        {/* Unverified disclaimer banner */}
        <div
          style={{
            backgroundColor: "#fffbeb",
            border:          "1px solid #fde68a",
            borderRadius:    "10px",
            padding:         "12px 16px",
            marginBottom:    "20px",
            display:         "flex",
            alignItems:      "flex-start",
            gap:             "10px",
          }}
        >
          <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#92400e", marginBottom: "2px" }}>
              Not yet verified in Pathable
            </div>
            <div style={{ fontSize: "13px", color: "#78350f" }}>
              This location was found via Google. Accessibility data may be incomplete or unavailable. You can still contribute information to help others.
            </div>
          </div>
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#111827", paddingRight: "16px" }}>
            {place.name}
          </h1>

          {/* N/A score badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
            <span style={{ fontSize: "11px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Pathable Score
            </span>
            <div
              style={{
                display:         "flex",
                alignItems:      "center",
                gap:             "6px",
                backgroundColor: "#f3f4f6",
                border:          "1.5px solid #e5e7eb",
                borderRadius:    "10px",
                padding:         "6px 14px",
              }}
            >
              <span style={{ fontSize: "20px", fontWeight: "800", color: "#9ca3af", lineHeight: 1 }}>N/A</span>
              <span style={{ fontSize: "13px", color: "#9ca3af" }}>/100</span>
            </div>
          </div>
        </div>

        {/* Address + coordinates */}
        <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#6b7280" }}>📍 {place.address}</p>
        {place.latitude && place.longitude && (
          <p style={{ margin: "0 0 24px", fontSize: "12px", color: "#9ca3af" }}>
            {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          </p>
        )}

        {/* Photo grid — all empty slots */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "16px" }}>🖼</span>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>Photos</h2>
            <span style={{ backgroundColor: "#e5e7eb", color: "#6b7280", borderRadius: "999px", padding: "1px 8px", fontSize: "12px", fontWeight: "600" }}>
              0
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {PHOTO_SLOTS.map((slot, i) => (
              <div
                key={i}
                style={{ aspectRatio: "4/3", borderRadius: "10px", backgroundColor: "#f3f4f6", border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px" }}
              >
                <span style={{ fontSize: "22px" }}>{slot.icon}</span>
                <span style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", fontWeight: "500" }}>{slot.label}</span>
                <span style={{ fontSize: "10px", color: "#d1d5db" }}>No photo yet</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards — all N/A */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
          <FeatureCard title="Parking" icon="🚗"><NotReported /></FeatureCard>
          <FeatureCard title="Door Width" icon="🚪"><NotReported /></FeatureCard>
          <FeatureCard title="Restrooms" icon="♿"><NotReported /></FeatureCard>
          <FeatureCard title="Building" icon="🏢"><NotReported /></FeatureCard>
        </div>

        {/* Action bar — Contribute CTA */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border:          "1px solid #bfdbfe",
            borderRadius:    "12px",
            padding:         "20px 24px",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            gap:             "16px",
            flexWrap:        "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: "700", fontSize: "15px", color: "#1e40af", marginBottom: "4px" }}>
              Know this location?
            </div>
            <div style={{ fontSize: "13px", color: "#1e3a8a" }}>
              Help others by contributing photos and accessibility features.
            </div>
          </div>
          <button
            onClick={() => navigate("/contribute")}
            style={{
              padding:         "11px 20px",
              backgroundColor: "#2563eb",
              color:           "#fff",
              border:          "none",
              borderRadius:    "8px",
              fontSize:        "14px",
              fontWeight:      "600",
              cursor:          "pointer",
              whiteSpace:      "nowrap",
            }}
          >
            Contribute Info
          </button>
        </div>

      </div>
    </div>
  );
}

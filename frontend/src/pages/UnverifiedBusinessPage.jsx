import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { createFromExternal } from "../services/api";

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
// AddToPathableModal
// Pre-fills name + address from the external place.
// User can adjust details and optionally set accessibility fields.
// ---------------------------------------------------------------------------
function AddToPathableModal({ place, onClose, onSuccess }) {
  const [name,     setName]     = useState(place.name    || "");
  const [address,  setAddress]  = useState(place.address || "");
  const [wheelchair, setWheelchair] = useState(null);  // null = unknown
  const [parking,    setParking]    = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim()) {
      setError("Name and address are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await createFromExternal({
        name:                  name.trim(),
        address:               address.trim(),
        lat:                   place.latitude  || null,
        lng:                   place.longitude || null,
        place_id:              place.place_id  || null,
        wheelchair_accessible: wheelchair,
        accessible_parking:    parking,
      });
      onSuccess(result.id, result.existing);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const TriToggle = ({ label, value, onChange }) => (
    <div style={{ marginBottom: "12px" }}>
      <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>{label}</div>
      <div style={{ display: "flex", gap: "6px" }}>
        {[{ v: true, label: "Yes" }, { v: false, label: "No" }, { v: null, label: "Unknown" }].map(({ v, label: l }) => (
          <button
            key={l}
            onClick={() => onChange(v)}
            style={{
              padding:         "5px 12px",
              borderRadius:    "6px",
              border:          `1px solid ${value === v ? "#2563eb" : "#e5e7eb"}`,
              backgroundColor: value === v ? "#eff6ff" : "#fff",
              color:           value === v ? "#2563eb" : "#6b7280",
              fontSize:        "13px",
              fontWeight:      value === v ? "600" : "400",
              cursor:          "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    // Backdrop
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: "rgba(0,0,0,0.45)",
        zIndex:          1000,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "20px",
      }}
    >
      {/* Modal */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius:    "16px",
        padding:         "28px 24px",
        width:           "100%",
        maxWidth:        "480px",
        boxShadow:       "0 8px 40px rgba(0,0,0,0.18)",
        position:        "relative",
      }}>
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "14px", right: "16px", background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
        >✕</button>

        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "800", color: "#111827" }}>
          Add to Pathable
        </h2>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>
          Confirm the details below. You can always contribute more info later.
        </p>

        {/* Name */}
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>
            Business Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1px solid #e5e7eb", borderRadius: "8px",
              padding: "9px 12px", fontSize: "14px", color: "#111827",
              outline: "none",
            }}
          />
        </div>

        {/* Address */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>
            Address
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1px solid #e5e7eb", borderRadius: "8px",
              padding: "9px 12px", fontSize: "14px", color: "#111827",
              outline: "none",
            }}
          />
        </div>

        {/* Optional accessibility fields */}
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "16px", marginBottom: "16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Accessibility (optional)
          </p>
          <TriToggle label="Wheelchair accessible?" value={wheelchair} onChange={setWheelchair} />
          <TriToggle label="Accessible parking?"   value={parking}    onChange={setParking} />
        </div>

        {error && (
          <div style={{ padding: "10px 12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width:           "100%",
            padding:         "12px",
            backgroundColor: submitting ? "#93c5fd" : "#2563eb",
            color:           "#fff",
            border:          "none",
            borderRadius:    "8px",
            fontSize:        "15px",
            fontWeight:      "700",
            cursor:          submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Adding…" : "Add to Pathable"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// UnverifiedBusinessPage
// Route: /place/:placeId
//
// Shown when a user clicks a Google Places result that is NOT in Pathable's DB.
// Data is passed via React Router location.state.place — if missing (e.g. direct
// URL navigation) we redirect home rather than show a blank page.
//
// state.openAddModal = true → immediately open the Add to Pathable modal
// (set by ExternalPlaceCard's "Add to Pathable" button on the map).
// ---------------------------------------------------------------------------
export default function UnverifiedBusinessPage() {
  const { placeId }  = useParams();
  const { state }    = useLocation();
  const navigate     = useNavigate();

  const place = state?.place;

  const [showModal, setShowModal] = useState(!!state?.openAddModal);

  // Guard: no data means someone hit this URL directly — send them home
  useEffect(() => {
    if (!place) navigate("/", { replace: true });
  }, [place, navigate]);

  if (!place) return null;

  const handleAddSuccess = (id, existing) => {
    setShowModal(false);
    navigate(`/business/${id}`, { replace: true, state: existing ? { fromDuplicate: true } : undefined });
  };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      {showModal && (
        <AddToPathableModal
          place={place}
          onClose={() => setShowModal(false)}
          onSuccess={handleAddSuccess}
        />
      )}

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

        {/* Action bar — Add to Pathable + Contribute */}
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
              Add it to Pathable so the community can benefit from accessibility info.
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/contribute")}
              style={{
                padding:         "10px 16px",
                backgroundColor: "#fff",
                color:           "#2563eb",
                border:          "1px solid #bfdbfe",
                borderRadius:    "8px",
                fontSize:        "13px",
                fontWeight:      "600",
                cursor:          "pointer",
                whiteSpace:      "nowrap",
              }}
            >
              Contribute Info
            </button>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding:         "10px 20px",
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
              + Add to Pathable
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

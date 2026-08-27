import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { createFromExternal, requestBusinessListing } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import TriToggle from "../components/TriToggle";

// Photo slot placeholders — same labels as BusinessDetailPage
const PHOTO_SLOTS = [
  { label: "Entrance",            icon: "🚪" },
  { label: "Bathroom",            icon: "🚻" },
  { label: "Parking Lot",         icon: "🚗" },
  { label: "Interior Navigation", icon: "🗺" },
  { label: "Seating / Service",   icon: "🪑" },
  { label: "Other",               icon: "📷" },
];

const MIN_NOTE_LENGTH = 10;

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

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #e5e7eb", borderRadius: "8px",
  padding: "9px 12px", fontSize: "14px", color: "#111827",
  outline: "none",
};
const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" };

// ---------------------------------------------------------------------------
// AddToPathableModal
//
// Two distinct paths, per the "don't create empty business listings"
// requirement:
//   A) "Request this business" — no business document is created. Just
//      enough info for Pathable/admins to identify and add it later.
//   B) "Add information about this business" — creates the business, but
//      only once the user has provided a real initial contribution (a
//      description of at least MIN_NOTE_LENGTH characters), so this can't
//      be used to spin up a blank listing.
//
// Both require sign-in, matching every other contribution surface.
// ---------------------------------------------------------------------------
function AddToPathableModal({ place, onClose, onAdded, onRequested }) {
  const { currentUser } = useAuth();
  const { showToast }   = useToast();
  const navigate        = useNavigate();

  const [mode, setMode] = useState(null); // null | "request" | "add"

  // Shared
  const [name,     setName]     = useState(place.name    || "");
  const [address,  setAddress]  = useState(place.address || "");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  // Option A — request
  const [requestNotes, setRequestNotes] = useState("");

  // Option B — add information
  const [description, setDescription] = useState("");
  const [wheelchair, setWheelchair] = useState(null);
  const [parking,    setParking]    = useState(null);

  const descTrimmed = description.trim();
  const addValid = name.trim() && address.trim() && descTrimmed.length >= MIN_NOTE_LENGTH;

  const handleRequest = async () => {
    if (submitting) return;
    if (!name.trim() || !address.trim()) { setError("Name and address are required."); return; }
    setSubmitting(true);
    setError(null);
    try {
      await requestBusinessListing({
        name:     name.trim(),
        address:  address.trim(),
        place_id: place.place_id || null,
        notes:    requestNotes.trim() || null,
      });
      showToast("Request submitted — thanks!", "success");
      onRequested();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdd = async () => {
    if (submitting || !addValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createFromExternal({
        name:                  name.trim(),
        address:               address.trim(),
        description:           descTrimmed,
        lat:                   place.latitude  || null,
        lng:                   place.longitude || null,
        place_id:              place.place_id  || null,
        wheelchair_accessible: wheelchair,
        accessible_parking:    parking,
      });
      onAdded(result.id, result.existing);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const modalShell = (children) => (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
    >
      <div style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "28px 24px", width: "100%", maxWidth: "480px", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "14px", right: "16px", background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        {children}
      </div>
    </div>
  );

  // ── Auth gate — every write here needs a signed-in uid ───────────────────
  if (!currentUser) {
    return modalShell(
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: "800", color: "#111827" }}>Sign in required</h2>
        <p style={{ margin: "0 0 22px", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
          You need to be signed in to add or request a business on Pathable.
        </p>
        <button
          onClick={() => navigate("/login")}
          style={{ width: "100%", padding: "12px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
        >
          Sign In
        </button>
      </div>
    );
  }

  // ── Step 1: choose a path ────────────────────────────────────────────────
  if (mode === null) {
    return modalShell(
      <>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "800", color: "#111827" }}>Add to Pathable</h2>
        <p style={{ margin: "0 0 22px", fontSize: "13px", color: "#6b7280" }}>
          How would you like to help? We don't create empty listings — either option gives Pathable something real to work with.
        </p>
        <button
          onClick={() => setMode("request")}
          style={{ width: "100%", textAlign: "left", padding: "16px", marginBottom: "10px", backgroundColor: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: "10px", cursor: "pointer" }}
        >
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginBottom: "3px" }}>Request this business</div>
          <div style={{ fontSize: "12px", color: "#6b7280" }}>Flag it so Pathable/admins can identify and add it later. Quick — no accessibility details needed.</div>
        </button>
        <button
          onClick={() => setMode("add")}
          style={{ width: "100%", textAlign: "left", padding: "16px", backgroundColor: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: "10px", cursor: "pointer" }}
        >
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#1e40af", marginBottom: "3px" }}>Add information about this business</div>
          <div style={{ fontSize: "12px", color: "#1e3a8a" }}>Create the listing now with a short description of what you know. You can add photos and a full review right after.</div>
        </button>
      </>
    );
  }

  // ── Option A: request ────────────────────────────────────────────────────
  if (mode === "request") {
    return modalShell(
      <>
        <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "13px", cursor: "pointer", padding: 0, marginBottom: "14px" }}>← Back</button>
        <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "800", color: "#111827" }}>Request this business</h2>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>We'll review this and add it to Pathable.</p>

        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>Business Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: "12px" }}>
          <label style={labelStyle}>Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
          <textarea value={requestNotes} onChange={(e) => setRequestNotes(e.target.value)} rows={3}
            placeholder="Anything that helps us find/verify this location…" style={{ ...inputStyle, resize: "vertical" }} />
        </div>

        {error && (
          <div role="alert" style={{ padding: "10px 12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleRequest}
          aria-disabled={submitting || !name.trim() || !address.trim()}
          title={!name.trim() || !address.trim() ? "Name and address are required." : undefined}
          style={{ width: "100%", padding: "12px", backgroundColor: submitting || !name.trim() || !address.trim() ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer" }}
        >
          {submitting ? "Submitting…" : "Submit Request"}
        </button>
      </>
    );
  }

  // ── Option B: add information ───────────────────────────────────────────
  return modalShell(
    <>
      <button onClick={() => setMode(null)} style={{ background: "none", border: "none", color: "#2563eb", fontSize: "13px", cursor: "pointer", padding: 0, marginBottom: "14px" }}>← Back</button>
      <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: "800", color: "#111827" }}>Add information</h2>
      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>
        Confirm the details below. A short description is required so this listing starts with real information.
      </p>

      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>Business Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label htmlFor="add-to-pathable-desc" style={labelStyle}>
          What do you know about this place? <span style={{ color: "#dc2626" }}>*</span>
          <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: "6px" }}>(min. {MIN_NOTE_LENGTH} characters)</span>
        </label>
        <textarea
          id="add-to-pathable-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          aria-describedby="add-to-pathable-desc-hint"
          placeholder="e.g. Small coffee shop with a step-free entrance and one accessible restroom."
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p id="add-to-pathable-desc-hint" style={{ margin: "4px 0 0", fontSize: "12px", color: descTrimmed.length < MIN_NOTE_LENGTH ? "#9ca3af" : "#16a34a" }}>
          {descTrimmed.length} / {MIN_NOTE_LENGTH} minimum characters
        </p>
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "16px", marginBottom: "16px" }}>
        <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Accessibility (optional)
        </p>
        <TriToggle label="Wheelchair accessible?" value={wheelchair} onChange={setWheelchair} />
        <TriToggle label="Accessible parking?"   value={parking}    onChange={setParking} />
      </div>

      {error && (
        <div role="alert" style={{ padding: "10px 12px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", fontSize: "13px", color: "#dc2626", marginBottom: "14px" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleAdd}
        aria-disabled={submitting || !addValid}
        title={!addValid ? `Enter a name, address, and at least ${MIN_NOTE_LENGTH} characters of description.` : undefined}
        style={{ width: "100%", padding: "12px", backgroundColor: submitting || !addValid ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer" }}
      >
        {submitting ? "Adding…" : "Add to Pathable"}
      </button>
    </>
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
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(!!state?.openAddModal);
  const [requested, setRequested] = useState(false);

  // Guard: no data means someone hit this URL directly — send them home
  useEffect(() => {
    if (!place) navigate("/", { replace: true });
  }, [place, navigate]);

  if (!place) return null;

  const handleAdded = (id, existing) => {
    setShowModal(false);
    if (existing) showToast("This business is already on Pathable — showing the existing listing", "success");
    navigate(`/business/${id}`, { replace: true, state: existing ? { fromDuplicate: true } : undefined });
  };

  const handleRequested = () => {
    setShowModal(false);
    setRequested(true);
  };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      {showModal && (
        <AddToPathableModal
          place={place}
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
          onRequested={handleRequested}
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

        {requested && (
          <div role="status" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px", color: "#15803d" }}>
            ✓ Request submitted — thanks for letting us know about this place.
          </div>
        )}

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
        <p style={{ margin: "0 0 6px", fontSize: "14px", color: "#6b7280" }}>{place.address}</p>
        {place.latitude && place.longitude && (
          <p style={{ margin: "0 0 24px", fontSize: "12px", color: "#9ca3af" }}>
            {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
          </p>
        )}

        {/* Photo grid — all empty slots */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
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
              Request it or add what you know so the community can benefit from accessibility info.
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

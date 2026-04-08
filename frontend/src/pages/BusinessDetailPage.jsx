import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { getBusiness, addBookmark, getProfile, getBusinessPhotos, submitPhoto, submitFeatures, submitReview } from "../services/api";
import { useAuth } from "../context/AuthContext";
import CommunityRating from "../components/CommunityRating";
import StarRating from "../components/StarRating";

const PHOTO_SLOTS = [
  { label: "Entrance",          key: "entrance", icon: "🚪" },
  { label: "Bathroom",          key: "bathroom", icon: "🚻" },
  { label: "Parking Lot",       key: "parking",  icon: "🚗" },
  { label: "Interior",          key: "interior", icon: "🗺" },
  { label: "Seating / Service", key: "seating",  icon: "🪑" },
  { label: "Other",             key: "other",    icon: "📷" },
];

// Normalize any category value from Firestore to one of the canonical keys above.
// Handles both old records ("Entrance") and new records ("entrance").
const CATEGORY_NORMALIZE = {
  "entrance":            "entrance",
  "bathroom":            "bathroom",
  "parking":             "parking",
  "parking lot":         "parking",
  "interior":            "interior",
  "interior navigation": "interior",
  "seating":             "seating",
  "seating / service":   "seating",
  "other":               "other",
};
function normalizeCategory(cat) {
  if (!cat) return "other";
  return CATEGORY_NORMALIZE[cat.toLowerCase()] || "other";
}

function getMediaType(item) {
  return item.mediaType === "video" ? "video" : "image";
}

function PhotoModal({ photos, category, initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === "ArrowLeft")  setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [photos.length, onClose]);

  const photo = photos[index];
  if (!photo) return null;

  const arrowBase = {
    position:        "absolute",
    top:             "50%",
    transform:       "translateY(-50%)",
    background:      "rgba(255,255,255,0.15)",
    border:          "none",
    color:           "#fff",
    fontSize:        "32px",
    cursor:          "pointer",
    width:           "56px",
    height:          "56px",
    borderRadius:    "50%",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    zIndex:          10,
    transition:      "background 0.15s",
  };

  return (
    <div
      onClick={onClose}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: "rgba(0,0,0,0.88)",
        zIndex:          200,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "16px",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position:   "absolute",
          top:        "16px",
          right:      "20px",
          background: "none",
          border:     "none",
          color:      "#fff",
          fontSize:   "28px",
          cursor:     "pointer",
          lineHeight: 1,
          padding:    "4px",
        }}
      >✕</button>

      <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "12px", userSelect: "none" }}>
        {category} · {index + 1} / {photos.length}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position:   "relative",
          display:    "flex",
          alignItems: "center",
          width:      "100%",
          maxWidth:   "860px",
        }}
      >
        {/* Left arrow */}
        <button
          onClick={() => setIndex((i) => Math.max(i - 1, 0))}
          style={{
            ...arrowBase,
            left:       "8px",
            visibility: index === 0 ? "hidden" : "visible",
          }}
        >‹</button>

        {getMediaType(photo) === "video" ? (
          <video
            src={photo.photoUrl}
            controls
            style={{
              width:        "100%",
              maxHeight:    "70vh",
              borderRadius: "10px",
              display:      "block",
              backgroundColor: "#000",
            }}
          />
        ) : (
          <img
            src={photo.photoUrl}
            alt={photo.caption || category}
            style={{
              width:        "100%",
              maxHeight:    "70vh",
              objectFit:    "contain",
              borderRadius: "10px",
              display:      "block",
            }}
          />
        )}

        {/* Right arrow */}
        <button
          onClick={() => setIndex((i) => Math.min(i + 1, photos.length - 1))}
          style={{
            ...arrowBase,
            right:      "8px",
            visibility: index === photos.length - 1 ? "hidden" : "visible",
          }}
        >›</button>
      </div>

      {photo.caption && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            color:      "#d1d5db",
            fontSize:   "13px",
            marginTop:  "12px",
            maxWidth:   "600px",
            textAlign:  "center",
            lineHeight: "1.5",
          }}
        >
          {photo.caption}
        </div>
      )}
    </div>
  );
}

function calculatePathableScore(business, userPreferences = []) {
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

  const filledFields = features.filter((f) => {
    if (f.key === "entrance_width") return business.entrance_width_rating != null;
    return business[f.key] !== undefined && business[f.key] !== null;
  }).length;

  function volumeScore(count) {
    const n = count ?? 0;
    if (n === 0)  return 0;
    if (n <= 3)   return 1;
    if (n <= 10)  return 2;
    if (n <= 25)  return 3;
    if (n <= 50)  return 4;
    return 5;
  }

  const featureConfidence = Math.round((filledFields / features.length) * 10);
  const reviewConfidence  = volumeScore(business.review_count);
  const confidenceRaw     = featureConfidence + reviewConfidence;

  const confidenceLabel =
    confidenceRaw >= 15 ? "High"   :
    confidenceRaw >= 8  ? "Medium" : "Low";

  const confidenceColor =
    confidenceRaw >= 15 ? "#16a34a" :
    confidenceRaw >= 8  ? "#d97706" : "#dc2626";

  const total = featuresScore + preferenceScore + confidenceRaw;

  const scoreColor  = total >= 75 ? "#16a34a" : total >= 50 ? "#d97706" : "#dc2626";
  const scoreBg     = total >= 75 ? "#f0fdf4" : total >= 50 ? "#fffbeb" : "#fef2f2";
  const scoreBorder = total >= 75 ? "#bbf7d0" : total >= 50 ? "#fde68a" : "#fecaca";

  return {
    total, featuresScore, preferenceScore, confidenceRaw, confidenceLabel,
    confidenceColor, confidencePct: Math.round((filledFields / features.length) * 100),
    features, matchedCount, totalPrefs, matchPercent,
    scoreColor, scoreBg, scoreBorder,
  };
}

function ScoreBar({ value, max, color }) {
  return (
    <div style={{ flex: 1, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", backgroundColor: color, borderRadius: "999px" }} />
    </div>
  );
}

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
          <span style={{ fontSize: "24px", fontWeight: "800", color: s.scoreColor, lineHeight: 1 }}>{s.total}</span>
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

function CheckRow({ label, value, note }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {note && <span style={{ fontSize: "12px", color: "#6b7280" }}>{note}</span>}
        <span style={{
          width: "22px", height: "22px", borderRadius: "50%",
          backgroundColor: value ? "#f0fdf4" : "#f9fafb",
          border: `1px solid ${value ? "#bbf7d0" : "#e5e7eb"}`,
          color: value ? "#16a34a" : "#9ca3af",
          fontSize: "13px", fontWeight: "700",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {value ? "✓" : "✗"}
        </span>
      </div>
    </div>
  );
}

// Quick at-a-glance summary strip shown directly below the community rating
function QuickSummary({ business }) {
  const items = [
    { icon: "♿", label: "Wheelchair", value: business.wheelchair_accessible,
      text: business.wheelchair_accessible == null ? "Unknown" : business.wheelchair_accessible ? "Yes" : "No" },
    { icon: "🚗", label: "Parking",   value: business.accessible_parking,
      text: business.accessible_parking == null ? "Unknown" : business.accessible_parking ? "Yes" : "No" },
    { icon: "🚪", label: "Entrance",
      value: business.entrance_width_rating ? business.entrance_width_rating !== "narrow" : null,
      text: business.entrance_width_rating
        ? business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)
        : "Unknown" },
    { icon: "🚻", label: "Restrooms", value: business.accessible_restrooms,
      text: business.accessible_restrooms == null ? "Unknown" : business.accessible_restrooms ? "Yes" : "No" },
  ];
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "28px" }}>
      {items.map(({ icon, label, value, text }) => {
        const unknown  = value == null;
        const positive = value === true;
        return (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "8px 14px", borderRadius: "999px",
            backgroundColor: unknown ? "#f9fafb" : positive ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${unknown ? "#e5e7eb" : positive ? "#bbf7d0" : "#fecaca"}`,
          }}>
            <span style={{ fontSize: "14px" }}>{icon}</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: unknown ? "#9ca3af" : positive ? "#16a34a" : "#b91c1c" }}>
              {label}: {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContributeModal — tabbed: Review | Photo | Accessibility Info
// ---------------------------------------------------------------------------
const PHOTO_CATS  = [
  { key: "entrance", label: "Entrance", icon: "🚪" },
  { key: "bathroom", label: "Bathroom", icon: "🚻" },
  { key: "parking",  label: "Parking",  icon: "🚗" },
  { key: "interior", label: "Interior", icon: "🗺" },
  { key: "other",    label: "Other",    icon: "📷" },
];
const ACPT_VID = ["video/mp4", "video/webm", "video/quicktime"];

function ContributeModal({ businessId, onClose, onReviewSuccess }) {
  const { currentUser } = useAuth();
  const navigate        = useNavigate();
  const [tab, setTab]   = useState("review"); // "review" | "photo" | "features"
  const [success, setSuccess] = useState(null); // per-tab success message
  const [error,   setError]   = useState(null);

  // ── Review state ────────────────────────────────────────────────────────
  const [reviewForm, setReviewForm] = useState({
    rating: 0, comment: "",
    wheelchair_accessible: false, accessible_parking: false,
    accessible_restrooms: false, elevator: false, auto_doors: false,
    entrance_width_rating: "standard",
  });
  const [hoverRating,      setHoverRating]      = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  // ── Photo state ──────────────────────────────────────────────────────────
  const [category,   setCategory]   = useState("entrance");
  const [file,       setFile]       = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [caption,    setCaption]    = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [uploadPct,  setUploadPct]  = useState(0);
  const fileInputRef = useRef(null);

  // ── Features state ───────────────────────────────────────────────────────
  const [featureForm, setFeatureForm] = useState({
    wheelchairAccessible: false, accessibleParking: false,
    accessibleRestroom: false, doorWidth: "",
  });
  const [submittingFeatures, setSubmittingFeatures] = useState(false);

  const switchTab = (t) => { setTab(t); setSuccess(null); setError(null); };

  function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleReviewSubmit = async () => {
    if (!currentUser) { navigate("/login"); return; }
    if (reviewForm.rating < 1 || reviewForm.comment.trim().length < 10) return;
    setError(null); setSubmittingReview(true);
    try {
      await submitReview({
        business_id: businessId, rating: reviewForm.rating,
        comment: reviewForm.comment.trim(),
        wheelchair_accessible: reviewForm.wheelchair_accessible,
        accessible_parking:    reviewForm.accessible_parking,
        accessible_restrooms:  reviewForm.accessible_restrooms,
        elevator:              reviewForm.elevator,
        auto_doors:            reviewForm.auto_doors,
        entrance_width_rating: reviewForm.entrance_width_rating,
      });
      setSuccess("Review submitted — thank you!");
      onReviewSuccess?.();
    } catch (err) { setError(err.message || "Failed to submit."); }
    finally { setSubmittingReview(false); }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ok = ["image/jpeg","image/jpg","image/png","image/webp",...ACPT_VID];
    if (!ok.includes(f.type))                         { setError("Unsupported file type."); return; }
    if (ACPT_VID.includes(f.type) && f.size > 100e6)  { setError("Video too large (max 100MB)."); return; }
    if (!ACPT_VID.includes(f.type) && f.size > 10e6)  { setError("Image too large (max 10MB)."); return; }
    setFile(f); setPreviewUrl(URL.createObjectURL(f)); setError(null);
  };

  const handlePhotoSubmit = async () => {
    if (!file) { setError("Please choose a file."); return; }
    setError(null); setUploading(true);
    try {
      const isVid = ACPT_VID.includes(file.type);
      const ext   = file.name.split(".").pop();
      const sRef  = ref(storage, `business-photos/${businessId}/${category}/${genId()}.${ext}`);
      await new Promise((res, rej) => {
        const task = uploadBytesResumable(sRef, file);
        task.on("state_changed", (s) => setUploadPct(Math.round((s.bytesTransferred/s.totalBytes)*100)), rej, res);
      });
      const url = await getDownloadURL(sRef);
      await submitPhoto(businessId, { photoUrl: url, caption, category, mediaType: isVid ? "video" : "image" });
      setSuccess("Photo/Video uploaded!");
      setFile(null); setPreviewUrl(null); setCaption("");
    } catch (err) { setError(err.message || "Upload failed."); }
    finally { setUploading(false); setUploadPct(0); }
  };

  const handleFeaturesSubmit = async () => {
    setError(null); setSubmittingFeatures(true);
    try {
      await submitFeatures(businessId, {
        ...featureForm,
        doorWidth: featureForm.doorWidth ? parseInt(featureForm.doorWidth, 10) : null,
      });
      setSuccess("Accessibility info submitted — thank you!");
    } catch (err) { setError(err.message || "Submission failed."); }
    finally { setSubmittingFeatures(false); }
  };

  const inp = { width: "100%", padding: "9px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "8px", outline: "none", boxSizing: "border-box", color: "#111827" };
  const reviewValid = reviewForm.rating >= 1 && reviewForm.comment.trim().length >= 10;
  const TABS = [
    { key: "review",   label: "Review"       },
    { key: "photo",    label: "Photo/Video"  },
    { key: "features", label: "Access Info"  },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "460px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 48px rgba(0,0,0,0.18)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>Contribute</span>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: "20px", lineHeight: 1 }}>✕</button>
          </div>
          {/* Tab bar */}
          <div style={{ display: "flex", gap: "0" }}>
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                style={{ flex: 1, padding: "8px 4px", background: "none", border: "none", borderBottom: `2.5px solid ${tab === key ? "#2563eb" : "transparent"}`, color: tab === key ? "#2563eb" : "#6b7280", fontSize: "13px", fontWeight: tab === key ? "700" : "500", cursor: "pointer", transition: "color 0.15s, border-color 0.15s" }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Per-tab success banner */}
          {success && (
            <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#15803d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>✓ {success}</span>
              <button onClick={() => setSuccess(null)} style={{ background: "none", border: "none", color: "#15803d", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>✕</button>
            </div>
          )}
          {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

          {/* ── REVIEW TAB ─────────────────────────────────────────────── */}
          {tab === "review" && (
            <>
              {!currentUser ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#374151" }}>Sign in to leave a review.</p>
                  <button onClick={() => navigate("/login")} style={{ padding: "10px 24px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Sign In</button>
                </div>
              ) : (
                <>
                  <div>
                    <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      Your Rating <span style={{ color: "#dc2626" }}>*</span>
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <StarRating value={reviewForm.rating} size={30} interactive hoverValue={hoverRating || undefined}
                        onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))}
                        onHover={setHoverRating} onLeave={() => setHoverRating(0)} />
                      {reviewForm.rating > 0 && (
                        <span style={{ fontSize: "13px", color: "#6b7280" }}>
                          {["","Poor","Fair","Good","Very Good","Excellent"][reviewForm.rating]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                      Your Experience <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <textarea value={reviewForm.comment} onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                      placeholder="Describe the accessibility at this location…" rows={3}
                      style={{ ...inp, resize: "vertical", fontFamily: "sans-serif" }} />
                    <p style={{ margin: "3px 0 0", fontSize: "11px", color: reviewForm.comment.trim().length < 10 ? "#9ca3af" : "#16a34a" }}>
                      {reviewForm.comment.trim().length}/10 minimum characters
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>Accessibility Notes</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {[
                        { key: "wheelchair_accessible", label: "♿ Ramps / wheelchair accessible" },
                        { key: "accessible_parking",    label: "🚗 Accessible parking"           },
                        { key: "accessible_restrooms",  label: "🚻 Accessible restrooms"         },
                        { key: "elevator",              label: "🛗 Elevator"                     },
                        { key: "auto_doors",            label: "🚪 Automatic doors"              },
                      ].map(({ key, label }) => (
                        <label key={key} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
                          <input type="checkbox" checked={reviewForm[key]} onChange={(e) => setReviewForm((f) => ({ ...f, [key]: e.target.checked }))} style={{ width: "15px", height: "15px", cursor: "pointer" }} />
                          {label}
                        </label>
                      ))}
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <label style={{ display: "block", marginBottom: "5px", fontSize: "12px", color: "#374151" }}>Entrance width</label>
                      <select value={reviewForm.entrance_width_rating} onChange={(e) => setReviewForm((f) => ({ ...f, entrance_width_rating: e.target.value }))}
                        style={{ ...inp, backgroundColor: "#fff", cursor: "pointer" }}>
                        <option value="wide">Wide — fully accessible</option>
                        <option value="standard">Standard — 36" minimum</option>
                        <option value="narrow">Narrow — may be difficult</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleReviewSubmit} disabled={!reviewValid || submittingReview}
                    style={{ padding: "11px", backgroundColor: !reviewValid || submittingReview ? "#d1d5db" : "#111827", color: !reviewValid || submittingReview ? "#9ca3af" : "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: !reviewValid || submittingReview ? "default" : "pointer" }}>
                    {submittingReview ? "Submitting…" : "Submit Review"}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── PHOTO TAB ──────────────────────────────────────────────── */}
          {tab === "photo" && (
            <>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "600", color: "#374151" }}>Category</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {PHOTO_CATS.map(({ key, label, icon }) => (
                    <button key={key} onClick={() => setCategory(key)}
                      style={{ padding: "5px 12px", borderRadius: "999px", fontSize: "13px", border: `1.5px solid ${category === key ? "#2563eb" : "#e5e7eb"}`, backgroundColor: category === key ? "#eff6ff" : "#fff", color: category === key ? "#1d4ed8" : "#374151", cursor: "pointer", fontWeight: category === key ? "600" : "400" }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: "600", color: "#374151" }}>Photo or Video</p>
                <div onClick={() => fileInputRef.current?.click()}
                  style={{ border: "2px dashed #d1d5db", borderRadius: "10px", padding: "20px", textAlign: "center", cursor: "pointer", backgroundColor: "#f9fafb" }}>
                  {previewUrl ? (
                    ACPT_VID.includes(file?.type)
                      ? <video src={previewUrl} style={{ maxHeight: "120px", maxWidth: "100%", borderRadius: "6px" }} />
                      : <img src={previewUrl} alt="preview" style={{ maxHeight: "120px", maxWidth: "100%", borderRadius: "6px", objectFit: "cover" }} />
                  ) : (
                    <><div style={{ fontSize: "24px", marginBottom: "6px" }}>📁</div>
                    <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Click to choose a photo or video</p></>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={handleFileChange} style={{ display: "none" }} />
                </div>
              </div>
              <input type="text" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} style={inp} />
              {uploading && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}><span>Uploading…</span><span>{uploadPct}%</span></div>
                  <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px" }}>
                    <div style={{ width: `${uploadPct}%`, backgroundColor: "#2563eb", height: "100%", borderRadius: "4px", transition: "width 0.2s" }} />
                  </div>
                </div>
              )}
              <button onClick={handlePhotoSubmit} disabled={uploading}
                style={{ padding: "11px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1 }}>
                {uploading ? `Uploading… ${uploadPct}%` : "Upload Photo/Video"}
              </button>
            </>
          )}

          {/* ── ACCESSIBILITY INFO TAB ─────────────────────────────────── */}
          {tab === "features" && (
            <>
              {[
                { id: "wheelchairAccessible", label: "Wheelchair Accessible", desc: "Ramps or step-free access",       icon: "♿" },
                { id: "accessibleParking",    label: "Accessible Parking",    desc: "Designated spaces near entrance", icon: "🚗" },
                { id: "accessibleRestroom",   label: "Accessible Restroom",   desc: "Wheelchair-accessible restroom",  icon: "🚻" },
              ].map(({ id, label, desc, icon }, i, arr) => (
                <label key={id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid #f3f4f6" : "none", cursor: "pointer" }}>
                  <input type="checkbox" checked={featureForm[id]} onChange={(e) => setFeatureForm((p) => ({ ...p, [id]: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ fontSize: "18px" }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{label}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{desc}</div>
                  </div>
                </label>
              ))}
              <input type="number" placeholder="Door width in inches (e.g. 36)" value={featureForm.doorWidth} onChange={(e) => setFeatureForm((p) => ({ ...p, doorWidth: e.target.value }))} style={inp} min="0" />
              <button onClick={handleFeaturesSubmit} disabled={submittingFeatures}
                style={{ padding: "11px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: submittingFeatures ? "not-allowed" : "pointer", opacity: submittingFeatures ? 0.7 : 1 }}>
                {submittingFeatures ? "Submitting…" : "Submit Info"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BusinessDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [business,         setBusiness]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(null);
  const [bookmarked,       setBookmarked]       = useState(false);
  const [bookmarking,      setBookmarking]      = useState(false);
  const [showContribute,   setShowContribute]   = useState(false);
  const [ratingRefreshKey, setRatingRefreshKey] = useState(0);
  const [userPrefs,        setUserPrefs]        = useState([]);
  const [allPhotos,        setAllPhotos]        = useState([]);
  const [modal,            setModal]            = useState(null);

  useEffect(() => {
    getBusiness(id)
      .then(setBusiness)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getBusinessPhotos(id)
      .then(setAllPhotos)
      .catch(() => setAllPhotos([]));
  }, [id]);

  useEffect(() => {
    getProfile()
      .then((data) => setUserPrefs(data.featurePreferences || []))
      .catch(() => {});
  }, []);

  const groupedPhotos = useMemo(() => {
    const groups = {};
    allPhotos.forEach((photo) => {
      const cat = normalizeCategory(photo.category);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(photo);
    });
    return groups;
  }, [allPhotos]);

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

        <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#6b7280" }}>📍 {business.address}</p>

        {/* Community rating — near the top so users see social proof immediately */}
        <CommunityRating key={ratingRefreshKey} businessId={id} />

        {/* Quick summary chips */}
        <QuickSummary business={business} />

        {/* Photos — only show populated slots + one "Add Media" tile */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px" }}>🖼</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Photos</h2>
            {allPhotos.length > 0 && (
              <span style={{ backgroundColor: "#111827", color: "#fff", borderRadius: "999px", padding: "1px 8px", fontSize: "11px", fontWeight: "600" }}>
                {allPhotos.length}
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {PHOTO_SLOTS.filter((slot) => (groupedPhotos[slot.key] || []).length > 0).map((slot) => {
              const slotPhotos   = groupedPhotos[slot.key];
              const preview      = slotPhotos[0];
              const previewIsVid = getMediaType(preview) === "video";
              return (
                <div key={slot.key} onClick={() => setModal({ category: slot.key, index: 0 })}
                  style={{ position: "relative", cursor: "pointer", borderRadius: "10px", overflow: "hidden", aspectRatio: "4/3" }}>
                  {previewIsVid ? (
                    <div style={{ width: "100%", height: "100%", backgroundColor: "#111827", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                      <span style={{ fontSize: "28px" }}>🎬</span>
                      <span style={{ fontSize: "11px", color: "#9ca3af" }}>Video</span>
                    </div>
                  ) : (
                    <img src={preview.photoUrl} alt={slot.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  )}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 8px 7px", background: "linear-gradient(transparent, rgba(0,0,0,0.55))", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#fff", fontWeight: "600" }}>{slot.label}</span>
                    {slotPhotos.length > 1 && (
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#fff", backgroundColor: "rgba(0,0,0,0.45)", borderRadius: "999px", padding: "1px 7px" }}>+{slotPhotos.length - 1}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Media tile */}
            <div
              onClick={() => setShowContribute(true)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.backgroundColor = "#f0f7ff"; e.currentTarget.style.color = "#2563eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.backgroundColor = "#f9fafb"; e.currentTarget.style.color = "#9ca3af"; }}
              style={{ aspectRatio: "4/3", borderRadius: "10px", backgroundColor: "#f9fafb", border: "2px dashed #d1d5db", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer", transition: "border-color 0.15s, background-color 0.15s", color: "#9ca3af" }}
            >
              <span style={{ fontSize: "22px", lineHeight: 1 }}>+</span>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "inherit" }}>Add Media</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {business.description && (
          <p style={{ margin: "0 0 28px", fontSize: "15px", color: "#374151", lineHeight: "1.6" }}>{business.description}</p>
        )}

        {/* Accessibility Details — unified block */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px", marginBottom: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <span style={{ fontSize: "16px" }}>♿</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Accessibility Details</h2>
          </div>
          <CheckRow label="Accessible Parking"  value={business.accessible_parking}  note={business.accessible_parking  ? "Available"   : "Not reported"} />
          <CheckRow label="Accessible Restrooms" value={business.accessible_restrooms} note={business.accessible_restrooms ? "Accessible"  : "Not confirmed"} />
          <CheckRow label="Elevator"             value={business.elevator} />
          <CheckRow label="Ramps / Wheelchair"   value={business.wheelchair_accessible} />
          <CheckRow label="Automatic Doors"      value={business.auto_doors} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <span style={{ fontSize: "14px", color: "#374151" }}>Entrance Width</span>
            <span style={{ fontSize: "13px", color: business.entrance_width_rating ? "#374151" : "#9ca3af", fontWeight: business.entrance_width_rating ? "600" : "400" }}>
              {business.entrance_width_rating
                ? `${business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)} — ${business.entrance_width_rating === "wide" ? "Fully accessible" : business.entrance_width_rating === "standard" ? '36" minimum' : "May be difficult"}`
                : "Not reported"}
            </span>
          </div>
        </div>

        {/* Action bar — Contribute (primary) + Bookmark (outline) */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowContribute(true)}
            style={{ flex: 2, padding: "13px 8px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 1px 3px rgba(37,99,235,0.3)" }}
          >
            Contribute
          </button>
          <button
            onClick={handleBookmark}
            disabled={bookmarked || bookmarking}
            style={{
              flex: 1, padding: "13px 8px",
              backgroundColor: "#fff",
              color: bookmarked ? "#16a34a" : "#374151",
              border: `1px solid ${bookmarked ? "#bbf7d0" : "#e5e7eb"}`,
              borderRadius: "10px", fontSize: "14px", fontWeight: "600",
              cursor: bookmarked || bookmarking ? "default" : "pointer",
              opacity: bookmarking ? 0.7 : 1, transition: "all 0.2s",
            }}
          >
            {bookmarked ? "✓ Saved" : bookmarking ? "Saving…" : "Bookmark"}
          </button>
        </div>

      </div>

      {modal && (
        <PhotoModal
          photos={groupedPhotos[modal.category] || []}
          category={modal.category}
          initialIndex={modal.index}
          onClose={() => setModal(null)}
        />
      )}

      {showContribute && (
        <ContributeModal
          businessId={id}
          onClose={() => setShowContribute(false)}
          onReviewSuccess={() => setRatingRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
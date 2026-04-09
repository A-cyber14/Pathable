import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { getBusiness, addBookmark, removeBookmark, getBookmarks, getProfile, getBusinessPhotos, submitPhoto, submitFeatures, submitReview } from "../services/api";
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

// Renders a real video frame as the tile thumbnail.
// Seeks to 0.5 s on metadata load to skip the all-black frame 0.
// Falls back to a static icon if the source can't be loaded (deleted / broken URL).
// onError is the correct place to mark a video as broken — not the lightbox player,
// which can error for transient reasons (network, two concurrent loads of the same URL).
function VideoThumbnail({ src, onError }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  const handleMetadata = () => {
    if (ref.current) ref.current.currentTime = 0.5;
  };

  const handleError = () => {
    setFailed(true);
    onError?.();
  };

  if (failed) {
    return (
      <div style={{ width: "100%", height: "100%", backgroundColor: "#111827", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" }}>
        <span style={{ fontSize: "24px" }}>🎬</span>
        <span style={{ fontSize: "10px", color: "#6b7280" }}>Unavailable</span>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      src={src}
      muted
      playsInline
      preload="metadata"
      onLoadedMetadata={handleMetadata}
      onError={handleError}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
    />
  );
}

function PhotoModal({ photos, category, initialIndex, onClose, onMediaError }) {
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

// ---------------------------------------------------------------------------
// Accessibility summary — rules-based insight generator
// ---------------------------------------------------------------------------

/**
 * Produces 2–4 insight bullets from raw business data and submitted photos.
 * Rules are ordered by user-decision weight: wheelchair first, then entrance,
 * restrooms, then supporting evidence. Each bullet has:
 *   type  — "positive" | "warning" | "unknown" | "evidence"
 *   icon  — emoji used in the UI
 *   text  — one-sentence human-readable insight
 *
 * @param {object}   business
 * @param {object[]} allPhotos
 * @returns {{ type: string, icon: string, text: string }[]}
 */
function generateAccessibilitySummary(business, allPhotos) {
  const bullets = [];

  const {
    wheelchair_accessible: wheelchair,
    accessible_parking:    parking,
    accessible_restrooms:  restrooms,
    elevator,
    auto_doors:            autoDoors,
    entrance_width_rating: entranceWidth,
  } = business;

  // ── 1. Wheelchair access — highest weight, always generates a bullet ──────
  if (wheelchair === true && parking === true) {
    bullets.push({
      type: "positive", icon: "♿",
      text: "Step-free access and accessible parking are both confirmed.",
    });
  } else if (wheelchair === true) {
    bullets.push({
      type: "positive", icon: "♿",
      text: "Wheelchair ramps or step-free access are confirmed.",
    });
  } else if (wheelchair === false) {
    bullets.push({
      type: "warning", icon: "♿",
      text: "Wheelchair accessibility has been reported as unavailable at this location.",
    });
  } else {
    bullets.push({
      type: "unknown", icon: "♿",
      text: "Wheelchair access hasn't been confirmed yet — community input welcome.",
    });
  }

  // ── 2. Accessible parking (only if not bundled into wheelchair combo above) ─
  if (wheelchair !== true && parking === true && bullets.length < 4) {
    bullets.push({
      type: "positive", icon: "🚗",
      text: "Accessible parking is available near the entrance.",
    });
  }

  // ── 3. Entrance width ─────────────────────────────────────────────────────
  if (entranceWidth === "wide" && bullets.length < 4) {
    bullets.push({
      type: "positive", icon: "🚪",
      text: "The entrance is wide and fully accessible.",
    });
  } else if (entranceWidth === "narrow" && bullets.length < 4) {
    bullets.push({
      type: "warning", icon: "🚪",
      text: "The entrance may be narrow — could be challenging for some wheelchair users.",
    });
  } else if (entranceWidth === "standard" && bullets.length < 3) {
    bullets.push({
      type: "positive", icon: "🚪",
      text: 'The entrance meets the standard 36\u2033 minimum accessible width.',
    });
  }

  // ── 4. Restrooms ──────────────────────────────────────────────────────────
  if (restrooms === true && bullets.length < 4) {
    bullets.push({
      type: "positive", icon: "🚻",
      text: "Accessible restrooms are confirmed on site.",
    });
  } else if (restrooms === false && bullets.length < 4) {
    bullets.push({
      type: "warning", icon: "🚻",
      text: "Accessible restrooms have been reported as unavailable here.",
    });
  } else if (restrooms === null && bullets.length < 3) {
    bullets.push({
      type: "unknown", icon: "🚻",
      text: "Restroom accessibility hasn't been confirmed yet.",
    });
  }

  // ── 5. Bonus positive features (elevator, auto-doors) — only if room ─────
  if (elevator === true && bullets.length < 4) {
    bullets.push({
      type: "positive", icon: "🛗",
      text: "An elevator is available, supporting access to multiple floors.",
    });
  }
  if (autoDoors === true && bullets.length < 4) {
    bullets.push({
      type: "positive", icon: "🔄",
      text: "Automatic doors make independent entry easier.",
    });
  }

  // ── 6. Photo evidence or data-quality note (always last) ──────────────────
  if (bullets.length < 4) {
    const CAT_LABELS = {
      entrance: "the entrance",
      bathroom: "the restroom",
      parking:  "the parking area",
      interior: "the interior",
      seating:  "the seating area",
      other:    "other areas",
    };

    // Collect unique categories that have at least one photo
    const photoCats = [...new Set(allPhotos.map((p) => normalizeCategory(p.category)))]
      .filter((cat) => allPhotos.some((p) => normalizeCategory(p.category) === cat));

    if (photoCats.length > 0) {
      const labels = photoCats.map((c) => CAT_LABELS[c] || c);
      const listStr =
        labels.length === 1 ? labels[0] :
        labels.length === 2 ? `${labels[0]} and ${labels[1]}` :
        `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
      bullets.push({
        type: "evidence", icon: "📷",
        text: `Photo evidence is available for ${listStr}.`,
      });
    } else {
      // Only add a data-quality note if the data is genuinely sparse
      const knownCount = [wheelchair, parking, restrooms, entranceWidth, elevator, autoDoors]
        .filter((v) => v !== null && v !== undefined).length;
      if (knownCount <= 1 && bullets.length < 3) {
        bullets.push({
          type: "unknown", icon: "📋",
          text: "Accessibility data here is still very limited. Your contribution can help others.",
        });
      }
    }
  }

  return bullets.slice(0, 4);
}

const SUMMARY_TYPE_STYLES = {
  positive: { textColor: "#15803d", iconBg: "#dcfce7", dotColor: "#16a34a" },
  warning:  { textColor: "#b91c1c", iconBg: "#fee2e2", dotColor: "#dc2626" },
  unknown:  { textColor: "#92400e", iconBg: "#fef9c3", dotColor: "#d97706" },
  evidence: { textColor: "#1d4ed8", iconBg: "#dbeafe", dotColor: "#2563eb" },
};

function AccessibilitySummaryCard({ business, allPhotos, onContribute }) {
  const bullets = generateAccessibilitySummary(business, allPhotos);
  if (bullets.length === 0) return null;

  const hasUnknowns = bullets.some((b) => b.type === "unknown");

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: "14px",
      padding: "18px 20px",
      marginBottom: "24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{ fontSize: "15px" }}>⚡</span>
          <span style={{ fontSize: "11px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            At a Glance
          </span>
        </div>
        {hasUnknowns && onContribute && (
          <button
            onClick={onContribute}
            style={{ fontSize: "12px", color: "#b45309", background: "none", border: "1px solid #fde68a", borderRadius: "6px", cursor: "pointer", padding: "3px 10px", fontWeight: "600", backgroundColor: "#fffbeb" }}
          >
            + Contribute missing info
          </button>
        )}
      </div>

      {/* Bullet list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {bullets.map((bullet, i) => {
          const s = SUMMARY_TYPE_STYLES[bullet.type] || SUMMARY_TYPE_STYLES.unknown;
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              {/* Icon badge */}
              <span style={{
                flexShrink: 0,
                width: "28px", height: "28px",
                borderRadius: "8px",
                backgroundColor: s.iconBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px",
              }}>
                {bullet.icon}
              </span>
              {/* Text */}
              <span style={{
                fontSize: "14px",
                color: "#374151",
                lineHeight: "1.55",
                paddingTop: "5px",
              }}>
                {bullet.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Three semantic states for any boolean accessibility attribute:
//   true  → confirmed present  (green)
//   false → confirmed absent   (red)
//   null  → not yet reported   (amber — a gap, not a negative)
function CheckRow({ label, value, note, confidence, onContribute }) {
  const isUnknown  = value == null;
  const isPositive = value === true;

  const indicator = isUnknown
    ? { bg: "#fffbeb", border: "#fde68a", color: "#b45309", symbol: "?" }
    : isPositive
      ? { bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a", symbol: "✓" }
      : { bg: "#fef2f2", border: "#fecaca", color: "#dc2626", symbol: "✗" };

  const metaChips = [];
  if (!isUnknown && confidence) {
    if (confidence.confirmations > 0)
      metaChips.push(`Confirmed by ${confidence.confirmations} contributor${confidence.confirmations !== 1 ? "s" : ""}`);
    if (confidence.hasPhotoEvidence) metaChips.push("Photo evidence available");
    if (confidence.conflicts > 0)
      metaChips.push(`${confidence.conflicts} conflicting report${confidence.conflicts !== 1 ? "s" : ""}`);
    if (confidence.lastUpdatedDays !== null) metaChips.push(`Updated ${confidence.lastUpdatedDays}d ago`);
  }

  return (
    <div style={{ padding: "11px 0", borderBottom: "1px solid #f3f4f6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isUnknown && onContribute ? (
            <button
              onClick={onContribute}
              style={{ fontSize: "11px", color: "#b45309", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}
            >
              Contribute info →
            </button>
          ) : (
            note && <span style={{ fontSize: "12px", color: "#6b7280" }}>{note}</span>
          )}
          <span style={{
            width: "22px", height: "22px", borderRadius: "50%",
            backgroundColor: indicator.bg,
            border: `1px solid ${indicator.border}`,
            color: indicator.color,
            fontSize: isUnknown ? "14px" : "13px", fontWeight: "700",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {indicator.symbol}
          </span>
        </div>
      </div>

      {isUnknown ? (
        <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "#9ca3af" }}>Not yet confirmed</span>
          {onContribute && (
            <button
              onClick={onContribute}
              style={{ fontSize: "11px", color: "#b45309", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}
            >
              · Help confirm
            </button>
          )}
        </div>
      ) : confidence ? (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "5px" }}>
          {metaChips.length === 0 ? (
            <span style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>Not enough data yet</span>
          ) : (
            metaChips.map((chip, i) => (
              <span key={i} style={{ fontSize: "11px", color: "#4b5563", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", padding: "1px 7px", borderRadius: "4px", lineHeight: "1.6" }}>
                {chip}
              </span>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

// Quick at-a-glance summary strip shown directly below the community rating.
// Unknown pills use amber to signal a gap worth filling, not a negative result.
// Clicking an unknown pill opens the contribute modal.
function QuickSummary({ business, onContribute }) {
  const items = [
    { icon: "♿", label: "Wheelchair", value: business.wheelchair_accessible,
      text: business.wheelchair_accessible == null ? "Unconfirmed" : business.wheelchair_accessible ? "Yes" : "No" },
    { icon: "🚗", label: "Parking",   value: business.accessible_parking,
      text: business.accessible_parking == null ? "Unconfirmed" : business.accessible_parking ? "Yes" : "No" },
    { icon: "🚪", label: "Entrance",
      value: business.entrance_width_rating ? business.entrance_width_rating !== "narrow" : null,
      text: business.entrance_width_rating
        ? business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)
        : "Unconfirmed" },
    { icon: "🚻", label: "Restrooms", value: business.accessible_restrooms,
      text: business.accessible_restrooms == null ? "Unconfirmed" : business.accessible_restrooms ? "Yes" : "No" },
  ];
  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "28px" }}>
      {items.map(({ icon, label, value, text }) => {
        const unknown  = value == null;
        const positive = value === true;
        return (
          <div
            key={label}
            onClick={unknown && onContribute ? onContribute : undefined}
            title={unknown && onContribute ? `Help confirm ${label.toLowerCase()} accessibility` : undefined}
            style={{
              display: "flex", alignItems: "center", gap: "7px",
              padding: "8px 14px", borderRadius: "999px",
              backgroundColor: unknown ? "#fffbeb" : positive ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${unknown ? "#fde68a" : positive ? "#bbf7d0" : "#fecaca"}`,
              cursor: unknown && onContribute ? "pointer" : "default",
              transition: "opacity 0.15s",
            }}
          >
            <span style={{ fontSize: "14px" }}>{icon}</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: unknown ? "#b45309" : positive ? "#16a34a" : "#b91c1c" }}>
              {label}: {text}
            </span>
            {unknown && (
              <span style={{ fontSize: "12px", color: "#d97706", fontWeight: "700", lineHeight: 1 }}>?</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust & Confidence helpers
// ---------------------------------------------------------------------------

/**
 * Derives confidence data from available business fields and submitted photos.
 * This is the mock/fallback implementation — once the backend tracks per-attribute
 * confirmation counts, this function should be replaced by an API call whose
 * response matches the BusinessConfidenceData type in src/types/confidence.d.ts.
 *
 * @param {object} business
 * @param {object[]} allPhotos
 * @returns {import('../types/confidence').BusinessConfidenceData}
 */
function buildConfidenceData(business, allPhotos) {
  const photoCount = allPhotos.filter((p) => p.mediaType !== "video").length;
  const videoCount = allPhotos.filter((p) => p.mediaType === "video").length;
  const contributors = business.review_count || 0;
  const isVerified = !!(business.pathable_verified || business.verified);
  const score = calculatePathableScore(business);
  const overallLevel = score.confidenceLabel.toLowerCase(); // "low" | "medium" | "high"

  // Map each attribute key to the most relevant photo category for evidence lookup
  const ATTR_PHOTO_CAT = {
    accessible_parking:    "parking",
    accessible_restrooms:  "bathroom",
    wheelchair_accessible: "entrance",
    entrance_width_rating: "entrance",
    elevator:              "interior",
    auto_doors:            "entrance",
  };

  const catHasPhotos = (cat) =>
    allPhotos.some((p) => normalizeCategory(p.category) === cat);

  const makeAttr = (photoCat) => {
    const hasPhotoEvidence = catHasPhotos(photoCat);
    // `contributors` is used as a proxy for confirmations until the backend
    // tracks per-attribute confirmation counts separately.
    const confirmations = contributors;
    const level =
      confirmations >= 5 ? "high" :
      confirmations >= 2 ? "medium" :
      confirmations >= 1 ? "low" : "unknown";
    return { level, confirmations, conflicts: 0, hasPhotoEvidence, lastUpdatedDays: null };
  };

  return {
    lastUpdatedDate: business.last_updated || business.updated_at || null,
    totalContributors: contributors,
    photoCount,
    videoCount,
    isVerified,
    overallLevel,
    attributes: Object.fromEntries(
      Object.entries(ATTR_PHOTO_CAT).map(([key, cat]) => [key, makeAttr(cat)])
    ),
  };
}

const CONFIDENCE_LEVEL_CONFIG = {
  high:    { label: "High",    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  medium:  { label: "Medium",  color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  low:     { label: "Low",     color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  unknown: { label: "Unknown", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
};

function DataConfidenceSection({ confidenceData, onContribute }) {
  const { lastUpdatedDate, totalContributors, photoCount, videoCount, isVerified, overallLevel } = confidenceData;
  const level = CONFIDENCE_LEVEL_CONFIG[overallLevel] || CONFIDENCE_LEVEL_CONFIG.unknown;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  };

  const totalMedia = photoCount + videoCount;

  // Each stat tile: value = display string, cta = optional actionable label + handler
  const stats = [
    {
      icon: "🕐", label: "Last Updated",
      value: formatDate(lastUpdatedDate) || "Not available",
      empty: !lastUpdatedDate,
    },
    {
      icon: "👥", label: "Contributors",
      value: totalContributors > 0 ? String(totalContributors) : null,
      emptyText: "None yet",
      cta: totalContributors === 0 ? "Be the first →" : null,
      empty: totalContributors === 0,
    },
    {
      icon: "📷", label: "Media",
      value: totalMedia > 0
        ? `${photoCount} photo${photoCount !== 1 ? "s" : ""} · ${videoCount} video${videoCount !== 1 ? "s" : ""}`
        : null,
      emptyText: "No media yet",
      cta: totalMedia === 0 ? "Add yours →" : null,
      empty: totalMedia === 0,
    },
    {
      icon: isVerified ? "✅" : "👤", label: "Source",
      value: isVerified ? "Pathable Verified" : "Community Submitted",
      highlight: isVerified,
      empty: false,
    },
  ];

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px", marginBottom: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "16px" }}>🛡️</span>
        <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Data Confidence</h2>
        <span style={{
          fontSize: "11px", fontWeight: "700",
          color: level.color, backgroundColor: level.bg,
          border: `1px solid ${level.border}`,
          borderRadius: "999px", padding: "2px 9px", marginLeft: "4px",
        }}>
          {level.label}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {stats.map(({ icon, label, value, emptyText, cta, empty, highlight }) => (
          <div
            key={label}
            style={{
              backgroundColor: empty ? "#fffbeb" : "#f9fafb",
              border: `1px solid ${empty ? "#fde68a" : "#f3f4f6"}`,
              borderRadius: "10px", padding: "10px 12px",
            }}
          >
            <div style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "500", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              {icon} {label}
            </div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: highlight ? "#15803d" : empty ? "#b45309" : "#111827" }}>
              {value || emptyText}
              {cta && onContribute && (
                <button
                  onClick={onContribute}
                  style={{ display: "block", marginTop: "2px", fontSize: "11px", color: "#b45309", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}
                >
                  {cta}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ContributeModal — tabbed: Review | Photo | Accessibility Info
// ---------------------------------------------------------------------------
const PHOTO_CATS  = [
  { key: "entrance", label: "Entrance",        icon: "🚪" },
  { key: "bathroom", label: "Bathroom",        icon: "🚻" },
  { key: "parking",  label: "Parking Lot",     icon: "🚗" },
  { key: "interior", label: "Interior",        icon: "🗺" },
  { key: "seating",  label: "Seating/Service", icon: "🪑" },
  { key: "other",    label: "Other",           icon: "📷" },
];
const ACPT_VID = ["video/mp4", "video/webm", "video/quicktime"];

function ContributeModal({ businessId, onClose, onReviewSuccess, initialTab = "review", initialCategory = "entrance" }) {
  const { currentUser } = useAuth();
  const navigate        = useNavigate();
  const [tab, setTab]   = useState(initialTab); // "review" | "photo" | "features"
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
  const [category,   setCategory]   = useState(initialCategory);
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
  const [showContribute,   setShowContribute]   = useState(null); // null | { tab?, category? }
  const [ratingRefreshKey, setRatingRefreshKey] = useState(0);
  const [userPrefs,        setUserPrefs]        = useState([]);
  const [allPhotos,        setAllPhotos]        = useState([]);
  const [modal,            setModal]            = useState(null);
  const [brokenPhotoIds,   setBrokenPhotoIds]   = useState(() => new Set());

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

  useEffect(() => {
    if (!id) return;
    getBookmarks()
      .then((bookmarks) => {
        if (bookmarks.some((b) => b.id === id)) setBookmarked(true);
      })
      .catch(() => {});
  }, [id]);

  const markPhotoBroken = (photoId) =>
    setBrokenPhotoIds((prev) => new Set([...prev, photoId]));

  const groupedPhotos = useMemo(() => {
    const groups = {};
    allPhotos
      .filter((p) => !brokenPhotoIds.has(p.id))
      .forEach((photo) => {
        const cat = normalizeCategory(photo.category);
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(photo);
      });
    return groups;
  }, [allPhotos, brokenPhotoIds]);

  const validPhotoCount = useMemo(
    () => allPhotos.filter((p) => !brokenPhotoIds.has(p.id)).length,
    [allPhotos, brokenPhotoIds],
  );

  const handleBookmark = async () => {
    if (bookmarking) return;
    setBookmarking(true);
    try {
      if (bookmarked) {
        await removeBookmark(business.id);
        setBookmarked(false);
      } else {
        await addBookmark(business.id);
        setBookmarked(true);
      }
    } catch (err) {
      alert(err.message || "Failed to update bookmark. Are you signed in?");
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

        {/* At-a-glance accessibility summary */}
        <AccessibilitySummaryCard business={business} allPhotos={allPhotos} onContribute={() => setShowContribute({})} />

        {/* Quick summary chips */}
        <QuickSummary business={business} onContribute={() => setShowContribute({})} />

        {/* Photos — all 6 slots always shown; empty ones are clickable to add media */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontSize: "15px" }}>🖼</span>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Photos</h2>
            {validPhotoCount > 0 && (
              <span style={{ backgroundColor: "#111827", color: "#fff", borderRadius: "999px", padding: "1px 8px", fontSize: "11px", fontWeight: "600" }}>
                {validPhotoCount}
              </span>
            )}
            <button
              onClick={() => setShowContribute({ tab: "photo" })}
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", fontSize: "12px", fontWeight: "600", color: "#2563eb", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", cursor: "pointer" }}
            >
              + Add Media
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {PHOTO_SLOTS.map((slot) => {
              const slotPhotos = groupedPhotos[slot.key] || [];
              if (slotPhotos.length === 0) {
                return (
                  <div
                    key={slot.key}
                    onClick={() => setShowContribute({ tab: "photo", category: slot.key })}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#bfdbfe"; e.currentTarget.style.backgroundColor = "#f0f7ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                    style={{ aspectRatio: "4/3", borderRadius: "10px", backgroundColor: "#f9fafb", border: "1.5px dashed #e5e7eb", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer", transition: "border-color 0.15s, background-color 0.15s" }}
                  >
                    <span style={{ fontSize: "22px", opacity: 0.4 }}>{slot.icon}</span>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: "#9ca3af" }}>{slot.label}</div>
                      <div style={{ fontSize: "10px", color: "#d1d5db", marginTop: "1px" }}>Be the first to upload</div>
                    </div>
                  </div>
                );
              }
              const preview      = slotPhotos[0];
              const previewIsVid = getMediaType(preview) === "video";
              return (
                <div key={slot.key} onClick={() => setModal({ category: slot.key, index: 0 })}
                  style={{ position: "relative", cursor: "pointer", borderRadius: "10px", overflow: "hidden", aspectRatio: "4/3", backgroundColor: "#000" }}>
                  {previewIsVid
                    ? <VideoThumbnail src={preview.photoUrl} onError={() => markPhotoBroken(preview.id)} />
                    : <img src={preview.photoUrl} alt={slot.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  }
                  {/* Play button overlay — only for video tiles */}
                  {previewIsVid && (
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <span style={{ fontSize: "14px", color: "#fff", marginLeft: "2px" }}>▶</span>
                    </div>
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
          </div>
        </div>

        {/* Description */}
        {business.description && (
          <p style={{ margin: "0 0 28px", fontSize: "15px", color: "#374151", lineHeight: "1.6" }}>{business.description}</p>
        )}

        {/* Accessibility Details — unified block */}
        {(() => {
          const confidenceData = buildConfidenceData(business, allPhotos);
          const attrs = confidenceData.attributes;
          return (
            <>
              <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "20px", marginBottom: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "16px" }}>♿</span>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#111827" }}>Accessibility Details</h2>
                </div>
                <CheckRow label="Accessible Parking"   value={business.accessible_parking}   note={business.accessible_parking === true ? "Confirmed available" : business.accessible_parking === false ? "Reported unavailable" : null}  confidence={attrs.accessible_parking}   onContribute={() => setShowContribute({})} />
                <CheckRow label="Accessible Restrooms" value={business.accessible_restrooms}  note={business.accessible_restrooms === true ? "Confirmed accessible" : business.accessible_restrooms === false ? "Reported inaccessible" : null} confidence={attrs.accessible_restrooms}  onContribute={() => setShowContribute({})} />
                <CheckRow label="Elevator"             value={business.elevator}              note={business.elevator === true ? "Present" : business.elevator === false ? "Not present" : null}                                                confidence={attrs.elevator}              onContribute={() => setShowContribute({})} />
                <CheckRow label="Ramps / Wheelchair"   value={business.wheelchair_accessible} note={business.wheelchair_accessible === true ? "Accessible" : business.wheelchair_accessible === false ? "Not accessible" : null}               confidence={attrs.wheelchair_accessible} onContribute={() => setShowContribute({})} />
                <CheckRow label="Automatic Doors"      value={business.auto_doors}            note={business.auto_doors === true ? "Present" : business.auto_doors === false ? "Not present" : null}                                           confidence={attrs.auto_doors}            onContribute={() => setShowContribute({})} />

                {/* Entrance Width — non-boolean, handled inline to support tri-state amber */}
                {(() => {
                  const r = business.entrance_width_rating;
                  const isUnknown = r == null;
                  const c = attrs.entrance_width_rating;
                  const chips = !isUnknown && c
                    ? [
                        c.confirmations > 0 && `Confirmed by ${c.confirmations} contributor${c.confirmations !== 1 ? "s" : ""}`,
                        c.hasPhotoEvidence && "Photo evidence available",
                      ].filter(Boolean)
                    : [];
                  return (
                    <div style={{ padding: "11px 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", fontWeight: "500", color: "#111827" }}>Entrance Width</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {isUnknown ? (
                            <button
                              onClick={() => setShowContribute({})}
                              style={{ fontSize: "11px", color: "#b45309", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}
                            >
                              Contribute info →
                            </button>
                          ) : (
                            <span style={{ fontSize: "13px", color: "#374151", fontWeight: "600" }}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                              {" — "}
                              {r === "wide" ? "Fully accessible" : r === "standard" ? '36" minimum' : "May be difficult"}
                            </span>
                          )}
                          <span style={{
                            width: "22px", height: "22px", borderRadius: "50%",
                            backgroundColor: isUnknown ? "#fffbeb" : r !== "narrow" ? "#f0fdf4" : "#fef2f2",
                            border: `1px solid ${isUnknown ? "#fde68a" : r !== "narrow" ? "#bbf7d0" : "#fecaca"}`,
                            color: isUnknown ? "#b45309" : r !== "narrow" ? "#16a34a" : "#dc2626",
                            fontSize: isUnknown ? "14px" : "13px", fontWeight: "700",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            {isUnknown ? "?" : r !== "narrow" ? "✓" : "✗"}
                          </span>
                        </div>
                      </div>
                      {isUnknown ? (
                        <div style={{ marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>Not yet confirmed</span>
                          <button onClick={() => setShowContribute({})} style={{ fontSize: "11px", color: "#b45309", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: "600" }}>
                            · Help confirm
                          </button>
                        </div>
                      ) : chips.length > 0 ? (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "5px" }}>
                          {chips.map((chip, i) => (
                            <span key={i} style={{ fontSize: "11px", color: "#4b5563", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", padding: "1px 7px", borderRadius: "4px", lineHeight: "1.6" }}>{chip}</span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ marginTop: "4px" }}>
                          <span style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>Not enough data yet</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <DataConfidenceSection confidenceData={confidenceData} onContribute={() => setShowContribute({})} />
            </>
          );
        })()}

        {/* Action bar — Contribute (primary) + Bookmark (outline) */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowContribute({})}
            style={{ flex: 2, padding: "13px 8px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", boxShadow: "0 1px 3px rgba(37,99,235,0.3)" }}
          >
            Contribute
          </button>
          <button
            onClick={handleBookmark}
            disabled={bookmarking}
            style={{
              flex: 1, padding: "13px 8px",
              backgroundColor: "#fff",
              color: bookmarked ? "#16a34a" : "#374151",
              border: `1px solid ${bookmarked ? "#bbf7d0" : "#e5e7eb"}`,
              borderRadius: "10px", fontSize: "14px", fontWeight: "600",
              cursor: bookmarking ? "default" : "pointer",
              opacity: bookmarking ? 0.7 : 1, transition: "all 0.2s",
            }}
          >
            {bookmarking ? (bookmarked ? "Removing…" : "Saving…") : bookmarked ? "✓ Saved" : "Bookmark"}
          </button>
        </div>

      </div>

      {modal && (
        <PhotoModal
          photos={groupedPhotos[modal.category] || []}
          category={modal.category}
          initialIndex={modal.index}
          onClose={() => setModal(null)}
          onMediaError={markPhotoBroken}
        />
      )}

      {showContribute && (
        <ContributeModal
          businessId={id}
          onClose={() => setShowContribute(null)}
          onReviewSuccess={() => setRatingRefreshKey((k) => k + 1)}
          initialTab={showContribute.tab || "review"}
          initialCategory={showContribute.category || "entrance"}
        />
      )}
    </div>
  );
}
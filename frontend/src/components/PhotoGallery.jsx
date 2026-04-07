import { useState, useEffect, useCallback } from "react";
import { getBusinessPhotos } from "../services/api";

// ---------------------------------------------------------------------------
// Photo categories — matches storage structure and seed slots
// ---------------------------------------------------------------------------

export const PHOTO_CATEGORIES = [
  { key: "entrance",  label: "Entrance",            icon: "🚪" },
  { key: "bathroom",  label: "Bathroom",             icon: "🚻" },
  { key: "parking",   label: "Parking Lot",          icon: "🚗" },
  { key: "interior",  label: "Interior Navigation",  icon: "🗺" },
  { key: "seating",   label: "Seating / Service",    icon: "🪑" },
  { key: "other",     label: "Other",                icon: "📷" },
];

// ---------------------------------------------------------------------------
// Modal — scrollable gallery for one category
// ---------------------------------------------------------------------------

function PhotoModal({ photos, initialIndex = 0, category, onClose }) {
  const [index, setIndex] = useState(initialIndex);

  const go = useCallback(
    (delta) => setIndex((i) => Math.max(0, Math.min(photos.length - 1, i + delta))),
    [photos.length]
  );

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft")  go(-1);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "Escape")     onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go, onClose]);

  const photo = photos[index];

  return (
    <div
      onClick={onClose}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: "rgba(0,0,0,0.88)",
        zIndex:          1000,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "24px",
      }}
    >
      {/* Modal content — stop click-through */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position:        "relative",
          maxWidth:        "860px",
          width:           "100%",
          backgroundColor: "#111827",
          borderRadius:    "16px",
          overflow:        "hidden",
          display:         "flex",
          flexDirection:   "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            padding:         "14px 20px",
            borderBottom:    "1px solid #1f2937",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>
              {PHOTO_CATEGORIES.find((c) => c.key === category)?.icon ?? "📷"}
            </span>
            <span style={{ fontWeight: "700", fontSize: "15px", color: "#f9fafb" }}>
              {PHOTO_CATEGORIES.find((c) => c.key === category)?.label ?? category}
            </span>
            <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "4px" }}>
              {index + 1} / {photos.length}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background:   "none",
              border:       "1px solid #374151",
              borderRadius: "8px",
              color:        "#9ca3af",
              fontSize:     "18px",
              cursor:       "pointer",
              width:        "32px",
              height:       "32px",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              lineHeight:   1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Main image */}
        <div style={{ position: "relative", backgroundColor: "#000" }}>
          <img
            src={photo.photoUrl}
            alt={photo.caption || category}
            style={{
              width:      "100%",
              maxHeight:  "560px",
              objectFit:  "contain",
              display:    "block",
            }}
          />

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => go(-1)}
                disabled={index === 0}
                style={navBtnStyle("left")}
              >
                ‹
              </button>
              <button
                onClick={() => go(1)}
                disabled={index === photos.length - 1}
                style={navBtnStyle("right")}
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Caption */}
        {photo.caption && (
          <div
            style={{
              padding:    "12px 20px",
              fontSize:   "13px",
              color:      "#d1d5db",
              borderTop:  "1px solid #1f2937",
            }}
          >
            {photo.caption}
          </div>
        )}

        {/* Thumbnail strip — when multiple images */}
        {photos.length > 1 && (
          <div
            style={{
              display:    "flex",
              gap:        "6px",
              padding:    "10px 16px",
              overflowX:  "auto",
              borderTop:  "1px solid #1f2937",
            }}
          >
            {photos.map((p, i) => (
              <img
                key={i}
                src={p.photoUrl}
                alt={p.caption || `Photo ${i + 1}`}
                onClick={() => setIndex(i)}
                style={{
                  width:        "60px",
                  height:       "44px",
                  objectFit:    "cover",
                  borderRadius: "6px",
                  cursor:       "pointer",
                  flexShrink:   0,
                  border:       i === index ? "2px solid #2563eb" : "2px solid transparent",
                  opacity:      i === index ? 1 : 0.55,
                  transition:   "opacity 0.15s, border-color 0.15s",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position:        "absolute",
    top:             "50%",
    [side]:          "12px",
    transform:       "translateY(-50%)",
    backgroundColor: "rgba(0,0,0,0.55)",
    border:          "none",
    borderRadius:    "50%",
    color:           "#fff",
    fontSize:        "28px",
    width:           "44px",
    height:          "44px",
    cursor:          "pointer",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    lineHeight:      1,
  };
}

// ---------------------------------------------------------------------------
// CategoryTile — preview card for one category
// ---------------------------------------------------------------------------

function CategoryTile({ category, photos, onOpenModal }) {
  const { key, label, icon } = category;
  const hasPhotos = photos.length > 0;
  const preview   = photos[0]; // most recent (API returns newest-first)
  const extra     = photos.length - 1; // stacked count

  return (
    <div
      onClick={() => hasPhotos && onOpenModal(key, 0)}
      style={{
        borderRadius:    "12px",
        overflow:        "hidden",
        border:          "1.5px solid #e5e7eb",
        backgroundColor: "#f9fafb",
        cursor:          hasPhotos ? "pointer" : "default",
        transition:      "box-shadow 0.15s, border-color 0.15s",
        position:        "relative",
      }}
      onMouseEnter={(e) => {
        if (hasPhotos) {
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.12)";
          e.currentTarget.style.borderColor = "#2563eb";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "#e5e7eb";
      }}
    >
      {/* Image area */}
      <div style={{ position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6" }}>
        {hasPhotos ? (
          <>
            <img
              src={preview.photoUrl}
              alt={preview.caption || label}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            {/* Stacked indicator */}
            {extra > 0 && (
              <div
                style={{
                  position:        "absolute",
                  bottom:          "8px",
                  right:           "8px",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  color:           "#fff",
                  borderRadius:    "6px",
                  padding:         "2px 8px",
                  fontSize:        "12px",
                  fontWeight:      "600",
                  backdropFilter:  "blur(2px)",
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "3px",
                }}
              >
                <span style={{ fontSize: "10px" }}>⧉</span> +{extra}
              </div>
            )}
            {/* Expand icon overlay */}
            <div
              style={{
                position:        "absolute",
                inset:           0,
                backgroundColor: "rgba(0,0,0,0)",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                transition:      "background-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.25)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(0,0,0,0)"; }}
            >
              <span style={{ fontSize: "22px", opacity: 0, transition: "opacity 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >🔍</span>
            </div>
          </>
        ) : (
          /* Placeholder */
          <div
            style={{
              width:           "100%",
              height:          "100%",
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "center",
              justifyContent:  "center",
              gap:             "6px",
              border:          "2px dashed #d1d5db",
              borderRadius:    "10px",
            }}
          >
            <span style={{ fontSize: "26px" }}>{icon}</span>
            <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "500" }}>No photo yet</span>
          </div>
        )}
      </div>

      {/* Label */}
      <div
        style={{
          padding:    "8px 12px",
          display:    "flex",
          alignItems: "center",
          gap:        "6px",
          borderTop:  "1px solid #f3f4f6",
        }}
      >
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>{label}</span>
        {hasPhotos && (
          <span
            style={{
              marginLeft:      "auto",
              backgroundColor: "#dbeafe",
              color:           "#1d4ed8",
              borderRadius:    "999px",
              padding:         "1px 7px",
              fontSize:        "11px",
              fontWeight:      "600",
            }}
          >
            {photos.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PhotoGallery — main export
// Props: businessId (string)
// ---------------------------------------------------------------------------

export default function PhotoGallery({ businessId }) {
  const [photosByCategory, setPhotosByCategory] = useState({});
  const [loading, setLoading]                   = useState(true);
  const [modal, setModal]                       = useState(null); // { category, index }

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    getBusinessPhotos(businessId)
      .then((photos) => {
        // Group by category
        const grouped = {};
        PHOTO_CATEGORIES.forEach(({ key }) => { grouped[key] = []; });
        photos.forEach((p) => {
          const cat = p.category || "other";
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(p);
        });
        setPhotosByCategory(grouped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [businessId]);

  const openModal  = (category, index) => setModal({ category, index });
  const closeModal = () => setModal(null);

  const modalPhotos = modal ? (photosByCategory[modal.category] ?? []) : [];

  const totalPhotos = Object.values(photosByCategory).reduce((n, arr) => n + arr.length, 0);

  return (
    <>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontSize: "16px" }}>🖼</span>
        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>Photos</h2>
        <span
          style={{
            backgroundColor: totalPhotos > 0 ? "#111827" : "#e5e7eb",
            color:           totalPhotos > 0 ? "#fff" : "#6b7280",
            borderRadius:    "999px",
            padding:         "1px 8px",
            fontSize:        "12px",
            fontWeight:      "600",
          }}
        >
          {loading ? "…" : totalPhotos}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: "13px", color: "#9ca3af" }}>Loading photos…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {PHOTO_CATEGORIES.map((cat) => (
            <CategoryTile
              key={cat.key}
              category={cat}
              photos={photosByCategory[cat.key] ?? []}
              onOpenModal={openModal}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && modalPhotos.length > 0 && (
        <PhotoModal
          photos={modalPhotos}
          initialIndex={modal.index}
          category={modal.category}
          onClose={closeModal}
        />
      )}
    </>
  );
}

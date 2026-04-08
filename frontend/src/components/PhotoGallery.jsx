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

// Backward compat helper: old records without mediaType default to "image"
function getMediaType(item) {
  return item.mediaType === "video" ? "video" : "image";
}

// ---------------------------------------------------------------------------
// MediaItem — renders either an image or a video
// ---------------------------------------------------------------------------

function MediaItem({ item, style = {} }) {
  if (getMediaType(item) === "video") {
    return (
      <video
        src={item.photoUrl}
        controls
        style={{ width: "100%", maxHeight: "560px", display: "block", backgroundColor: "#000", ...style }}
      />
    );
  }
  return (
    <img
      src={item.photoUrl}
      alt={item.caption || ""}
      style={{ width: "100%", maxHeight: "560px", objectFit: "contain", display: "block", ...style }}
    />
  );
}

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

  // Trap body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const item = photos[index];

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
              background:     "none",
              border:         "1px solid #374151",
              borderRadius:   "8px",
              color:          "#9ca3af",
              fontSize:       "18px",
              cursor:         "pointer",
              width:          "32px",
              height:         "32px",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              lineHeight:     1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Main media area */}
        <div style={{ position: "relative", backgroundColor: "#000" }}>
          <MediaItem item={item} />

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
        {item.caption && (
          <div
            style={{
              padding:   "12px 20px",
              fontSize:  "13px",
              color:     "#d1d5db",
              borderTop: "1px solid #1f2937",
            }}
          >
            {item.caption}
          </div>
        )}

        {/* Thumbnail strip — when multiple items */}
        {photos.length > 1 && (
          <div
            style={{
              display:   "flex",
              gap:       "6px",
              padding:   "10px 16px",
              overflowX: "auto",
              borderTop: "1px solid #1f2937",
            }}
          >
            {photos.map((p, i) => (
              <ThumbnailStrip
                key={i}
                item={p}
                active={i === index}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Small thumbnail for the strip at the bottom of the modal
function ThumbnailStrip({ item, active, onClick }) {
  const isVideo = getMediaType(item) === "video";
  const baseStyle = {
    width:        "60px",
    height:       "44px",
    objectFit:    "cover",
    borderRadius: "6px",
    cursor:       "pointer",
    flexShrink:   0,
    border:       active ? "2px solid #2563eb" : "2px solid transparent",
    opacity:      active ? 1 : 0.55,
    transition:   "opacity 0.15s, border-color 0.15s",
    backgroundColor: "#000",
    display:      "block",
  };

  if (isVideo) {
    return (
      <div
        onClick={onClick}
        style={{
          ...baseStyle,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontSize:       "18px",
          backgroundColor: "#1f2937",
        }}
      >
        🎬
      </div>
    );
  }

  return (
    <img
      src={item.photoUrl}
      alt={item.caption || ""}
      onClick={onClick}
      style={baseStyle}
    />
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
  const hasMedia = photos.length > 0;
  const preview  = photos[0]; // most recent (API returns newest-first)
  const extra    = photos.length - 1;
  const previewIsVideo = hasMedia && getMediaType(preview) === "video";
  const hasAnyVideo    = photos.some((p) => getMediaType(p) === "video");

  return (
    <div
      onClick={() => hasMedia && onOpenModal(key, 0)}
      style={{
        borderRadius:    "12px",
        overflow:        "hidden",
        border:          "1.5px solid #e5e7eb",
        backgroundColor: "#f9fafb",
        cursor:          hasMedia ? "pointer" : "default",
        transition:      "box-shadow 0.15s, border-color 0.15s",
        position:        "relative",
      }}
      onMouseEnter={(e) => {
        if (hasMedia) {
          e.currentTarget.style.boxShadow  = "0 4px 14px rgba(0,0,0,0.12)";
          e.currentTarget.style.borderColor = "#2563eb";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow  = "none";
        e.currentTarget.style.borderColor = "#e5e7eb";
      }}
    >
      {/* Media preview area */}
      <div style={{ position: "relative", aspectRatio: "4/3", backgroundColor: "#f3f4f6" }}>
        {hasMedia ? (
          <>
            {previewIsVideo ? (
              /* Video thumbnail — show a muted preview */
              <div
                style={{
                  width:           "100%",
                  height:          "100%",
                  display:         "flex",
                  flexDirection:   "column",
                  alignItems:      "center",
                  justifyContent:  "center",
                  backgroundColor: "#111827",
                  gap:             "6px",
                }}
              >
                <span style={{ fontSize: "28px" }}>🎬</span>
                <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "500" }}>Video</span>
              </div>
            ) : (
              <img
                src={preview.photoUrl}
                alt={preview.caption || label}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}

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

            {/* Video badge — shown when category has any video (but preview is image) */}
            {!previewIsVideo && hasAnyVideo && (
              <div
                style={{
                  position:        "absolute",
                  top:             "8px",
                  left:            "8px",
                  backgroundColor: "rgba(0,0,0,0.65)",
                  color:           "#fff",
                  borderRadius:    "6px",
                  padding:         "2px 6px",
                  fontSize:        "10px",
                  fontWeight:      "600",
                  backdropFilter:  "blur(2px)",
                }}
              >
                🎬
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
              <span
                style={{ fontSize: "22px", opacity: 0, transition: "opacity 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
              >
                🔍
              </span>
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
            <span style={{ fontSize: "11px", color: "#9ca3af", fontWeight: "500" }}>No media yet</span>
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
        {hasMedia && (
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

  const totalMedia = Object.values(photosByCategory).reduce((n, arr) => n + arr.length, 0);

  return (
    <>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
        <span style={{ fontSize: "16px" }}>🖼</span>
        <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>Photos & Videos</h2>
        <span
          style={{
            backgroundColor: totalMedia > 0 ? "#111827" : "#e5e7eb",
            color:           totalMedia > 0 ? "#fff" : "#6b7280",
            borderRadius:    "999px",
            padding:         "1px 8px",
            fontSize:        "12px",
            fontWeight:      "600",
          }}
        >
          {loading ? "…" : totalMedia}
        </span>
      </div>

      {loading ? (
        <p style={{ fontSize: "13px", color: "#9ca3af" }}>Loading media…</p>
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

import { useRef, useState } from "react";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ACCEPTED_TYPES       = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

const MAX_IMAGE_MB    = 10;
const MAX_VIDEO_MB    = 100;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

// ---------------------------------------------------------------------------
// DragDropZone
//
// Props:
//   onFileSelected(file) — called with a valid File object
//   disabled             — grays out the zone while uploading
// ---------------------------------------------------------------------------
export default function DragDropZone({ onFileSelected, disabled }) {
  const inputRef  = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error,    setError]    = useState(null);

  function handleFile(file) {
    setError(null);

    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      return setError("Only JPG, PNG, WebP images or MP4, WebM, MOV videos are accepted.");
    }

    const isVideo    = ACCEPTED_VIDEO_TYPES.includes(file.type);
    const maxBytes   = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const maxLabel   = isVideo ? `${MAX_VIDEO_MB}MB` : `${MAX_IMAGE_MB}MB`;

    if (file.size > maxBytes) {
      return setError(`File is too large. Maximum size is ${maxLabel}.`);
    }

    onFileSelected(file);
  }

  const onDragOver  = (e) => { e.preventDefault(); if (!disabled) setDragging(true);  };
  const onDragLeave = ()  => setDragging(false);
  const onDrop      = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files[0]);
  };

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const openPicker    = ()  => { if (!disabled) inputRef.current?.click(); };

  return (
    <div>
      <div
        onClick={openPicker}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border:          `2px dashed ${dragging ? "#2563eb" : "#d1d5db"}`,
          borderRadius:    "12px",
          padding:         "36px 20px",
          textAlign:       "center",
          cursor:          disabled ? "not-allowed" : "pointer",
          backgroundColor: dragging ? "#eff6ff" : "#f9fafb",
          transition:      "border-color 0.15s, background-color 0.15s",
          opacity:         disabled ? 0.6 : 1,
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "8px" }}>📁</div>
        <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
          Drag & drop a photo or video here
        </p>
        <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>
          or <span style={{ color: "#2563eb", textDecoration: "underline" }}>click to browse</span>
        </p>
        <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#d1d5db" }}>
          Images: JPG, PNG, WebP (max 10MB) · Videos: MP4, WebM, MOV (max 100MB)
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        onChange={onInputChange}
        style={{ display: "none" }}
      />

      {error && (
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#dc2626" }}>{error}</p>
      )}
    </div>
  );
}

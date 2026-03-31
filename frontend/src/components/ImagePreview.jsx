// ---------------------------------------------------------------------------
// ImagePreview
// Shows a thumbnail of the selected file with a remove button.
//
// Props:
//   file      — File object from the input / drop
//   onRemove  — called when user clicks "Remove"
// ---------------------------------------------------------------------------
export default function ImagePreview({ file, onRemove }) {
  if (!file) return null;

  // Create a temporary URL so we can preview the image without uploading it
  const previewUrl = URL.createObjectURL(file);
  const sizeMB     = (file.size / (1024 * 1024)).toFixed(1);

  return (
    <div
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           "12px",
        padding:       "12px",
        backgroundColor: "#f9fafb",
        border:        "1px solid #e5e7eb",
        borderRadius:  "10px",
      }}
    >
      {/* Thumbnail */}
      <img
        src={previewUrl}
        alt="Preview"
        style={{
          width:        "72px",
          height:       "72px",
          objectFit:    "cover",
          borderRadius: "8px",
          flexShrink:   0,
        }}
      />

      {/* File info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: "600", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </p>
        <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
          {sizeMB} MB
        </p>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        style={{
          background:   "none",
          border:       "1px solid #e5e7eb",
          borderRadius: "6px",
          padding:      "5px 10px",
          fontSize:     "12px",
          color:        "#dc2626",
          cursor:       "pointer",
          flexShrink:   0,
        }}
      >
        Remove
      </button>
    </div>
  );
}

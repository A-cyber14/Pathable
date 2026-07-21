// Small illustrative mockup of a photo grid, matching the tile grid used on
// BusinessProfilePage's "Photos & Videos" section.
const COLORS = ["#dbeafe", "#fef3c7", "#dcfce7", "#fce7f3", "#e0e7ff", "#fee2e2"];

function CameraGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function PhotosPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
      {COLORS.map((c, i) => (
        <div
          key={i}
          style={{
            aspectRatio: "1", borderRadius: "8px", backgroundColor: c,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {i === 2 && (
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CameraGlyph />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

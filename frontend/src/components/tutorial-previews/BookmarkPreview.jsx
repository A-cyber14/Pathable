// Small illustrative mockup of a saved/bookmarked location card.
function RibbonGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563eb" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function BookmarkPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
      <div style={{ width: "44px", height: "44px", borderRadius: "10px", backgroundColor: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <RibbonGlyph />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ width: "80%", height: "8px", borderRadius: "4px", backgroundColor: "#e5e7eb", marginBottom: "6px" }} />
        <div style={{ width: "55%", height: "6px", borderRadius: "3px", backgroundColor: "#f3f4f6" }} />
      </div>
    </div>
  );
}

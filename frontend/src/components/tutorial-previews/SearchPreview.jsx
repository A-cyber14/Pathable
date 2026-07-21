// Small illustrative mockup of the map search bar + result pins.
function PinGlyph({ color }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function SearchPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "999px", padding: "9px 14px", marginBottom: "14px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <div style={{ width: "100px", height: "7px", borderRadius: "4px", backgroundColor: "#e5e7eb" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <PinGlyph color="#2563eb" />
        <PinGlyph color="#16a34a" />
        <PinGlyph color="#9ca3af" />
      </div>
    </div>
  );
}

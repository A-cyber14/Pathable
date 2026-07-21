// Small illustrative mockup of the accessibility status rows (Yes/No/Unsure
// pills) used across BusinessAccessibilityPage / BusinessProfilePage.
const ROWS = [
  { width: 74, label: "Yes",    bg: "#dcfce7", fg: "#16a34a" },
  { width: 58, label: "Unsure", bg: "#f3f4f6", fg: "#9ca3af" },
  { width: 66, label: "No",     bg: "#fee2e2", fg: "#dc2626" },
];

export default function AccessibilityPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      {ROWS.map((row, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ width: `${row.width}px`, height: "8px", borderRadius: "4px", backgroundColor: "#e5e7eb" }} />
          <span style={{ fontSize: "10px", fontWeight: 700, color: row.fg, backgroundColor: row.bg, borderRadius: "999px", padding: "2px 9px" }}>
            {row.label}
          </span>
        </div>
      ))}
    </div>
  );
}

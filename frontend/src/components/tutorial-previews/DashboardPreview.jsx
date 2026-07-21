// Small illustrative mockup of the business dashboard's profile-completion
// card — not a live screenshot, just a static preview built from the same
// visual language (rounded cards, blue accent, gray progress track).
export default function DashboardPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ width: "90px", height: "8px", borderRadius: "4px", backgroundColor: "#e5e7eb" }} />
        <div style={{ width: "24px", height: "8px", borderRadius: "4px", backgroundColor: "#16a34a" }} />
      </div>
      <div style={{ height: "6px", borderRadius: "3px", backgroundColor: "#e5e7eb", overflow: "hidden", marginBottom: "12px" }}>
        <div style={{ width: "65%", height: "100%", backgroundColor: "#2563eb" }} />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderTop: i === 1 ? "1px solid #f3f4f6" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: i < 3 ? "#dcfce7" : "#f3f4f6", color: i < 3 ? "#16a34a" : "#d1d5db", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              {i < 3 ? "✓" : ""}
            </span>
            <div style={{ width: `${70 - i * 10}px`, height: "6px", borderRadius: "3px", backgroundColor: "#e5e7eb" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

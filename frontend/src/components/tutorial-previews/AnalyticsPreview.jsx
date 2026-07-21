// Small illustrative mockup of the accessibility-insights bar chart used on
// BusinessProfilePage (PercentBar).
const BARS = [92, 67, 41];

export default function AnalyticsPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      {BARS.map((pct, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <div style={{ width: "60px", height: "6px", borderRadius: "3px", backgroundColor: "#e5e7eb" }} />
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#111827" }}>{pct}%</span>
          </div>
          <div style={{ height: "5px", borderRadius: "3px", backgroundColor: "#e5e7eb", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#2563eb" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

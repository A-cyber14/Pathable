// Small illustrative mockup of a star rating + an owner reply, matching
// BusinessProfilePage's ReviewCard.
function Star({ filled }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? "#f59e0b" : "none"} stroke="#f59e0b" strokeWidth="1.5">
      <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
    </svg>
  );
}

export default function ReviewsPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
        {[1, 1, 1, 1, 0].map((f, i) => <Star key={i} filled={!!f} />)}
      </div>
      <div style={{ width: "85%", height: "6px", borderRadius: "3px", backgroundColor: "#e5e7eb", marginBottom: "5px" }} />
      <div style={{ width: "60%", height: "6px", borderRadius: "3px", backgroundColor: "#e5e7eb", marginBottom: "12px" }} />
      <div style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "8px", padding: "8px 10px" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "5px" }}>
          Your Response
        </div>
        <div style={{ width: "70%", height: "6px", borderRadius: "3px", backgroundColor: "#e5e7eb" }} />
      </div>
    </div>
  );
}

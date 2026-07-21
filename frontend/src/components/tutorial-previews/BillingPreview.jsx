// Small illustrative mockup of the dashboard's plan/billing card.
export default function BillingPreview() {
  return (
    <div style={{ width: "100%", maxWidth: "260px", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "14px" }}>
      <div style={{ width: "50px", height: "7px", borderRadius: "3px", backgroundColor: "#e5e7eb", marginBottom: "8px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <div style={{ width: "60px", height: "10px", borderRadius: "4px", backgroundColor: "#111827" }} />
        <span style={{ fontSize: "9px", fontWeight: 700, color: "#1d4ed8", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "999px", padding: "2px 8px" }}>
          Active
        </span>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: 1, padding: "8px", textAlign: "center", borderRadius: "8px", border: "1.5px solid #e5e7eb", fontSize: "10px", fontWeight: 700, color: "#374151" }}>
          Manage Billing
        </div>
        <div style={{ flex: 1, padding: "8px", textAlign: "center", borderRadius: "8px", backgroundColor: "#111827", fontSize: "10px", fontWeight: 700, color: "#fff" }}>
          Change Plan
        </div>
      </div>
    </div>
  );
}

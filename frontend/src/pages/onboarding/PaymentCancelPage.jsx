import { useNavigate } from "react-router-dom";

// ---------------------------------------------------------------------------
// PaymentCancelPage
// Route: /business-setup/payment/cancel
// Stripe redirects here if the owner backs out of Checkout. Nothing was
// charged or activated — just send them back to Review.
// ---------------------------------------------------------------------------

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "sans-serif", padding: "32px 24px" }}>
      <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "40px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>↩️</div>
        <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>Checkout canceled</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px", lineHeight: "1.6" }}>
          No charge was made. You can try again or pick a different plan.
        </p>
        <button
          onClick={() => navigate("/business-setup/review")}
          style={{ width: "100%", padding: "13px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
        >
          Back to Review
        </button>
      </div>
    </div>
  );
}

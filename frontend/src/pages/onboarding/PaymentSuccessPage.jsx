import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardBusiness, updateProfile } from "../../services/api";

// ---------------------------------------------------------------------------
// PaymentSuccessPage
// Route: /business-setup/payment/success
// Stripe redirects here right after Checkout — but the subscription isn't
// actually "active" until the webhook lands (POST /api/billing/webhook),
// which can be a moment behind the redirect. This polls briefly rather than
// trusting the redirect alone, per "do not fake successful payments."
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 8;
const POLL_MS = 1500;

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("confirming"); // "confirming" | "confirmed" | "slow"
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const biz = await getDashboardBusiness();
        if (cancelled) return;
        if (biz.subscriptionStatus === "active") {
          setStatus("confirmed");
          try { await updateProfile({ onboardingStep: "business-tutorial" }); } catch { /* non-blocking */ }
          navigate("/business-setup/tutorial");
          return;
        }
      } catch {
        // ignore transient errors and keep polling
      }
      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) {
        if (!cancelled) setStatus("slow");
      } else if (!cancelled) {
        setTimeout(poll, POLL_MS);
      }
    };

    poll();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueAnyway = async () => {
    try { await updateProfile({ onboardingStep: "business-tutorial" }); } catch { /* non-blocking */ }
    navigate("/business-setup/tutorial");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "sans-serif", padding: "32px 24px" }}>
      <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "40px", maxWidth: "420px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
        {status !== "slow" ? (
          <>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#eff6ff",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"
                style={{ animation: "spin 0.9s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>Confirming your payment…</h1>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: "1.6" }}>This only takes a moment.</p>
          </>
        ) : (
          <>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fffbeb",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h1 style={{ fontSize: "18px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>Still confirming</h1>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 20px", lineHeight: "1.6" }}>
              This is taking longer than expected. You can continue to your dashboard — we'll update your plan automatically once payment is confirmed.
            </p>
            <button
              onClick={continueAnyway}
              style={{ width: "100%", padding: "13px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
            >
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}

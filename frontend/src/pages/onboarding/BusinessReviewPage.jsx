import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardBusiness, getBusinessPhotos, createCheckoutSession, activateFreePlan, updateProfile } from "../../services/api";
import { PLAN_BY_ID } from "../../constants/plans";
import { getCompletionChecklist } from "../../utils/profileCompletion";

// ---------------------------------------------------------------------------
// BusinessReviewPage
// Route: /business-setup/review
// Last stop before payment (or immediate activation for Freemium). Shows
// what's about to happen — business, plan, price, and what's been completed
// — with a chance to back out or change plan first.
// ---------------------------------------------------------------------------

export default function BusinessReviewPage() {
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [photosCount, setPhotosCount] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const biz = await getDashboardBusiness();
        setBusiness(biz);
        const photos = await getBusinessPhotos(biz.id);
        setPhotosCount(Array.isArray(photos) ? photos.length : 0);
      } catch (e) {
        setError(e.message || "Failed to load your business.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleContinue = async () => {
    if (redirecting || !business) return;
    setRedirecting(true);
    setError(null);

    const plan = business.selectedPlan;
    try {
      if (plan === "freemium") {
        await activateFreePlan();
        try { await updateProfile({ onboardingStep: "business-tutorial" }); } catch { /* non-blocking */ }
        navigate("/business-setup/tutorial");
      } else {
        try { await updateProfile({ onboardingStep: "business-payment" }); } catch { /* non-blocking */ }
        const { url } = await createCheckoutSession();
        window.location.href = url;
      }
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setRedirecting(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  if (error && !business) {
    return (
      <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px" }}>
        <p style={{ color: "#dc2626", fontSize: "14px", maxWidth: "560px", margin: "0 auto" }}>{error}</p>
      </div>
    );
  }

  const plan = PLAN_BY_ID[business.selectedPlan];
  const checklist = getCompletionChecklist(business, photosCount);

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px 60px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>Review your setup</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.5" }}>
          Take one last look before {plan?.id === "freemium" ? "you go live" : "checkout"}.
        </p>

        <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "22px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", marginBottom: "14px", borderBottom: "1px solid #f3f4f6" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Business</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>{business.name}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "14px", marginBottom: "14px", borderBottom: "1px solid #f3f4f6" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Plan</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>{plan?.name || business.selectedPlan}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Monthly Price</div>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>{plan ? `${plan.price}${plan.cadence}` : "—"}</div>
            </div>
          </div>

          <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Completed</div>
          {checklist.map(({ label, done }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "5px 0", fontSize: "13px", color: "#374151" }}>
              <span aria-hidden="true" style={{ color: done ? "#16a34a" : "#d1d5db" }}>{done ? "✓" : "○"}</span>
              {label}
            </div>
          ))}
        </div>

        {error && <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 14px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "14px 18px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            ← Back
          </button>
          <button
            onClick={() => navigate("/business-setup/plan")}
            style={{ padding: "14px 18px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            Change Plan
          </button>
          <button
            onClick={handleContinue}
            disabled={redirecting}
            style={{
              flex: 1, padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none",
              borderRadius: "10px", fontSize: "15px", fontWeight: "700",
              cursor: redirecting ? "not-allowed" : "pointer", opacity: redirecting ? 0.7 : 1, minHeight: "48px",
            }}
          >
            {redirecting
              ? (plan?.id === "freemium" ? "Activating…" : "Redirecting to checkout…")
              : (plan?.id === "freemium" ? "Go Live →" : "Continue to Payment →")}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile, getDashboardBusiness, updateDashboardBusiness } from "../services/api";
import { useIsMobile } from "../hooks/useIsMobile";

// ---------------------------------------------------------------------------
// PlanSelectionPage
// Route: /business-setup/plan
//
// Used both as the first step of business onboarding (no business exists
// yet — selection is stashed on the user doc as pendingPlan until the
// business is created/claimed) and as "Manage plan" from the dashboard
// (business already exists — selection is saved directly to it).
//
// No payment is collected here — see backend/services/billing.py for where
// Stripe would plug in. Freemium is free and immediate; Beta/Premium are
// saved as payment_pending.
// ---------------------------------------------------------------------------

const PLANS = [
  {
    id: "freemium",
    name: "Freemium",
    price: "Free",
    cadence: "",
    cta: "Continue for Free",
    features: [
      "Basic business accessibility profile",
      "Display accessibility information",
      "Upload up to 3 photos",
      "Appear in Pathable search results",
      "Update business information",
    ],
  },
  {
    id: "beta",
    name: "Beta",
    price: "$4.99",
    cadence: "/month",
    badge: "Limited Availability",
    cta: "Join Beta",
    features: [
      "Everything in Freemium",
      "Early access to new features",
      "Priority onboarding support",
      "Beta feedback opportunities",
      "Up to 15 photos",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$14.99",
    cadence: "/month",
    recommended: true,
    cta: "Choose Premium",
    features: [
      "Accessibility analytics",
      "Respond to reviews",
      "Unlimited media uploads",
      "Additional business insights",
      "Premium business management tools",
    ],
  },
];

export default function PlanSelectionPage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const isManaging = !!userProfile?.businessId; // "Manage plan" from the dashboard, vs. fresh onboarding
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    (async () => {
      try {
        if (isManaging) {
          const biz = await getDashboardBusiness();
          setSelected(biz.selectedPlan || null);
        } else {
          setSelected(userProfile?.pendingPlan || null);
        }
      } catch {
        // fine to start with nothing selected
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManaging]);

  const handleContinue = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (isManaging) {
        await updateDashboardBusiness({ selectedPlan: selected });
        navigate("/business-profile");
      } else {
        await updateProfile({ pendingPlan: selected, onboardingStep: "business-search" });
        await refreshProfile();
        navigate("/business-setup");
      }
    } catch (err) {
      setError(err.message || "Failed to save your plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: isMobile ? "28px 16px 100px" : "48px 24px" }}>
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>

        {isManaging && (
          <button
            onClick={() => navigate("/business-profile")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "14px", padding: 0, marginBottom: "20px" }}
          >
            ← Back to dashboard
          </button>
        )}

        <div style={{ textAlign: "center", marginBottom: isMobile ? "28px" : "40px" }}>
          <h1 style={{ fontSize: isMobile ? "24px" : "30px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
            Choose the plan that fits your business
          </h1>
          <p style={{ fontSize: "15px", color: "#6b7280", margin: 0 }}>
            You can change your plan later.
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Business plan"
          style={{
            display:        "flex",
            flexDirection:  isMobile ? "column" : "row",
            gap:             "20px",
            alignItems:      "stretch",
          }}
        >
          {PLANS.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <div
                key={plan.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onClick={() => setSelected(plan.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(plan.id); } }}
                style={{
                  flex:            1,
                  display:         "flex",
                  flexDirection:   "column",
                  backgroundColor: plan.recommended && !isSelected ? "#fff" : "#fff",
                  border:          isSelected ? "2px solid #2563eb" : plan.recommended ? "2px solid #c7d2fe" : "1.5px solid #e5e7eb",
                  borderRadius:    "16px",
                  padding:         "26px 22px",
                  cursor:          "pointer",
                  boxShadow:       isSelected ? "0 8px 28px rgba(37,99,235,0.16)" : plan.recommended ? "0 4px 16px rgba(0,0,0,0.06)" : "0 1px 4px rgba(0,0,0,0.04)",
                  position:        "relative",
                  transition:      "border-color 0.15s, box-shadow 0.15s",
                  outline:         "none",
                }}
              >
                {(plan.recommended || plan.badge) && (
                  <span style={{
                    position: "absolute", top: "-11px", left: "22px",
                    backgroundColor: plan.recommended ? "#111827" : "#f59e0b",
                    color: "#fff", fontSize: "11px", fontWeight: "700",
                    padding: "3px 10px", borderRadius: "999px", letterSpacing: "0.3px",
                  }}>
                    {plan.recommended ? "Recommended" : plan.badge}
                  </span>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                  <h2 style={{ fontSize: "19px", fontWeight: "800", color: "#111827", margin: "6px 0 0" }}>{plan.name}</h2>
                  {isSelected && (
                    <span aria-hidden="true" style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0, marginTop: "6px" }}>
                      ✓
                    </span>
                  )}
                </div>

                <div style={{ margin: "6px 0 18px" }}>
                  <span style={{ fontSize: "28px", fontWeight: "800", color: "#111827" }}>{plan.price}</span>
                  <span style={{ fontSize: "14px", color: "#6b7280" }}>{plan.cadence}</span>
                </div>

                <ul style={{ listStyle: "none", margin: "0 0 22px", padding: 0, flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13.5px", color: "#374151", marginBottom: "10px", lineHeight: "1.4" }}>
                      <span aria-hidden="true" style={{ color: "#16a34a", flexShrink: 0 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelected(plan.id); }}
                  tabIndex={-1}
                  aria-hidden="true"
                  style={{
                    width: "100%", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "700",
                    border: isSelected ? "none" : "1.5px solid #d1d5db",
                    backgroundColor: isSelected ? "#2563eb" : "#fff",
                    color: isSelected ? "#fff" : "#374151",
                    cursor: "pointer",
                  }}
                >
                  {isSelected ? "Selected" : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p role="alert" style={{ color: "#dc2626", fontSize: "13px", textAlign: "center", marginTop: "20px" }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "center", marginTop: "32px" }}>
          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            style={{
              padding: "14px 40px", backgroundColor: "#111827", color: "#fff", border: "none",
              borderRadius: "10px", fontSize: "15px", fontWeight: "700",
              cursor: !selected || saving ? "not-allowed" : "pointer",
              opacity: !selected || saving ? 0.5 : 1, minHeight: "48px",
            }}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

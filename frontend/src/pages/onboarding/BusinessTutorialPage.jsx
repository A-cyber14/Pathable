import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardBusiness, updateDashboardBusiness, updateProfile } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import TutorialOverlay from "../../components/TutorialOverlay";

// ---------------------------------------------------------------------------
// BusinessTutorialPage
// Route: /business-setup/tutorial
// Final step of business onboarding. Skippable; reopenable later from the
// dashboard's "Help" link. Analytics is flagged as an upgrade for Freemium —
// no other dashboard feature is plan-gated yet since payment isn't real
// (see backend/services/billing.py).
// ---------------------------------------------------------------------------

export default function BusinessTutorialPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState("freemium");

  useEffect(() => {
    getDashboardBusiness().then((biz) => setPlan(biz.selectedPlan || "freemium")).catch(() => {});
  }, []);

  const steps = [
    { icon: "🏢", title: "Manage your business information", description: "Update your name, address, category, phone, and hours anytime from your dashboard." },
    { icon: "♿", title: "Update accessibility details",       description: "Keep your accessibility info current — visitors rely on it to plan their visit." },
    { icon: "📷", title: "Upload photos",                       description: "Add more photos whenever you like, up to your plan's limit." },
    { icon: "💬", title: "Respond to reviews",                  description: "Reply directly to reviews left by visitors." },
    {
      icon: "📊", title: "View analytics and manage your plan",
      description: "See which accessibility features visitors care about most, and change your plan anytime.",
      badge: plan === "freemium" ? "Upgrade for more" : undefined,
    },
  ];

  const handleFinish = async () => {
    try {
      await updateDashboardBusiness({ businessTutorialCompleted: true });
      await updateProfile({ onboardingStep: "complete" });
      await refreshProfile();
    } catch {
      // Non-blocking — still send the owner to their dashboard.
    }
    navigate("/business-profile");
  };

  return <TutorialOverlay steps={steps} onFinish={handleFinish} heading="Getting started" />;
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardBusiness, updateDashboardBusiness, updateProfile } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import TutorialOverlay from "../../components/TutorialOverlay";
import DashboardPreview      from "../../components/tutorial-previews/DashboardPreview";
import AccessibilityPreview  from "../../components/tutorial-previews/AccessibilityPreview";
import PhotosPreview         from "../../components/tutorial-previews/PhotosPreview";
import ReviewsPreview        from "../../components/tutorial-previews/ReviewsPreview";
import AnalyticsPreview      from "../../components/tutorial-previews/AnalyticsPreview";
import BillingPreview        from "../../components/tutorial-previews/BillingPreview";

// ---------------------------------------------------------------------------
// BusinessTutorialPage
// Route: /business-setup/tutorial
// Final step of business onboarding (after payment/Freemium activation).
// Skippable; reopenable later from the dashboard's "Help" link. Copy adapts
// for Freemium on the Analytics/Billing steps — no feature is hidden, since
// nothing is fake-gated behind a payment that hasn't happened.
// ---------------------------------------------------------------------------

export default function BusinessTutorialPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState("freemium");

  useEffect(() => {
    getDashboardBusiness().then((biz) => setPlan(biz.selectedPlan || "freemium")).catch(() => {});
  }, []);

  const isFreemium = plan === "freemium";

  const steps = [
    { preview: <DashboardPreview />,     title: "Your dashboard",              description: "Track profile completion and manage everything about your listing from one place." },
    { preview: <AccessibilityPreview />, title: "Accessibility management",    description: "Keep your accessibility info current — visitors rely on it to plan their visit." },
    { preview: <PhotosPreview />,        title: "Photo management",            description: isFreemium ? "Upload up to 3 photos on Freemium. Upgrade anytime for unlimited uploads." : "Upload as many photos as you like." },
    { preview: <ReviewsPreview />,       title: "Review responses",            description: "Reply directly to reviews left by visitors." },
    { preview: <AnalyticsPreview />,     title: "Analytics",                   description: isFreemium ? "See which accessibility features visitors care about most — included on Beta and Premium." : "See which accessibility features visitors care about most." , badge: isFreemium ? "Upgrade for more" : undefined },
    { preview: <BillingPreview />,       title: "Billing",                     description: isFreemium ? "You're on the free plan — upgrade anytime from your dashboard." : "Manage your subscription, update your card, or view invoices anytime." },
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

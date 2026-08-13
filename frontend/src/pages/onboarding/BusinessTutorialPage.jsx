import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTour, BUSINESS_TOUR_STEPS } from "../../context/TourContext";
import { updateDashboardBusiness, updateProfile } from "../../services/api";

// ---------------------------------------------------------------------------
// BusinessTutorialPage
// Route: /business-setup/tutorial
// Final step of business onboarding, and the target of the dashboard's
// "Help" link (its replay entry point). Same real guided-tour engine as the
// personal tutorial — no separate framework — walking owners through their
// actual dashboard instead of illustrated mockups.
// ---------------------------------------------------------------------------

export default function BusinessTutorialPage() {
  const { refreshProfile } = useAuth();
  const { start } = useTour();
  const navigate = useNavigate();
  const launched = useRef(false);

  useEffect(() => {
    if (launched.current) return;
    launched.current = true;

    (async () => {
      try {
        await updateProfile({ onboardingStep: "complete" });
        await refreshProfile();
      } catch {
        // Non-blocking — still start the tour even if this save failed.
      }
      start(BUSINESS_TOUR_STEPS, async () => {
        try {
          await updateDashboardBusiness({ businessTutorialCompleted: true });
        } catch {
          // Non-blocking.
        }
      });
      navigate("/business-profile", { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

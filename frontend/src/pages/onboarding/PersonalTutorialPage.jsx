import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTour, PERSONAL_TOUR_STEPS } from "../../context/TourContext";
import { updateProfile } from "../../services/api";

// ---------------------------------------------------------------------------
// PersonalTutorialPage
// Route: /onboarding/tutorial
// Final step of personal onboarding, and the target of "Replay tutorial" in
// Settings. Doesn't render a UI of its own — it marks onboarding complete
// (so ProfileGate stops redirecting here), launches the real guided tour
// over the actual app, and sends the user to the map where the tour begins.
// ---------------------------------------------------------------------------

export default function PersonalTutorialPage() {
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
      start(PERSONAL_TOUR_STEPS, async () => {
        try {
          await updateProfile({ userTutorialCompleted: true });
          await refreshProfile();
        } catch {
          // Non-blocking.
        }
      });
      navigate("/", { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

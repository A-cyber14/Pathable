import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "../../services/api";
import TutorialOverlay from "../../components/TutorialOverlay";
import SearchPreview       from "../../components/tutorial-previews/SearchPreview";
import AccessibilityPreview from "../../components/tutorial-previews/AccessibilityPreview";
import BookmarkPreview      from "../../components/tutorial-previews/BookmarkPreview";
import ReviewsPreview       from "../../components/tutorial-previews/ReviewsPreview";

// ---------------------------------------------------------------------------
// PersonalTutorialPage
// Route: /onboarding/tutorial
// Final step of personal onboarding. Skippable; only shown automatically
// once — can be reopened later from Profile > "Replay tutorial".
// ---------------------------------------------------------------------------

const STEPS = [
  { preview: <SearchPreview />,       title: "Search for places",                     description: "Find accessible locations near you on the map or by name." },
  { preview: <AccessibilityPreview />, title: "Filter by accessibility features",       description: "Narrow results down to exactly the features you need — parking, entrances, restrooms, and more." },
  { preview: <BookmarkPreview />,      title: "Save favorite locations",                description: "Bookmark places to quickly find them again later." },
  { preview: <ReviewsPreview />,       title: "Add reviews, photos, and contributions", description: "Help others by sharing what you find — reviews, photos, and accessibility details all count." },
];

export default function PersonalTutorialPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [finishing, setFinishing] = useState(false);

  const handleFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await updateProfile({ userTutorialCompleted: true, onboardingStep: "complete" });
      await refreshProfile();
    } catch {
      // Non-blocking — still send the user home even if the save failed.
    }
    navigate("/");
  };

  return <TutorialOverlay steps={STEPS} onFinish={handleFinish} heading="Getting started" />;
}

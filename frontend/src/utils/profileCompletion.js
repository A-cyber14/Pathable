import { BUSINESS_ACCESSIBILITY_FEATURES } from "../constants/accessibility";

// ---------------------------------------------------------------------------
// Shared profile-completion checklist — same 4 sections/weights as the
// backend's _compute_profile_completion (backend/routers/dashboard.py).
// Used by both BusinessProfilePage (dashboard) and BusinessReviewPage
// (onboarding) so the two never drift out of sync.
// ---------------------------------------------------------------------------

export function getCompletionChecklist(business, photosCount) {
  return [
    {
      label: "Business information",
      done: !!(business.name && business.address && business.category && business.phone),
      to: "/business-setup/information",
    },
    {
      label: "Operating hours",
      done: !!(business.hours && Object.keys(business.hours).length > 0),
      to: "/business-setup/hours",
    },
    {
      label: "Accessibility information",
      done: BUSINESS_ACCESSIBILITY_FEATURES.some((f) => business[f.key] != null),
      to: "/business-setup/accessibility",
    },
    {
      label: "Photos",
      done: photosCount > 0,
      to: "/business-setup/photos",
    },
  ];
}

// ---------------------------------------------------------------------------
// Shared plan data — single source of truth for PlanSelectionPage's cards,
// BusinessReviewPage's price summary, and BusinessProfilePage's plan label.
// ---------------------------------------------------------------------------

export const PLANS = [
  {
    id: "freemium",
    name: "Freemium",
    price: "Free",
    priceValue: 0,
    cadence: "",
    cta: "Continue for Free",
    features: [
      "Basic accessibility profile",
      "Appear in search results",
      "Update business information",
      "Up to 3 photos",
    ],
  },
  {
    id: "beta",
    name: "Beta",
    price: "$4.99",
    priceValue: 4.99,
    cadence: "/month",
    badge: "Limited Availability",
    cta: "Join Beta",
    features: [
      "Everything in Premium",
      "Unlimited media uploads",
      "Accessibility analytics",
      "Respond to reviews",
      "Early access to new features",
      "Priority onboarding support",
      "Opportunity to provide feedback",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$14.99",
    priceValue: 14.99,
    cadence: "/month",
    recommended: true,
    cta: "Choose Premium",
    features: [
      "Accessibility analytics",
      "Respond to reviews",
      "Unlimited media uploads",
      "Premium business management tools",
      "Additional business insights",
    ],
  },
];

export const PLAN_LABELS = Object.fromEntries(PLANS.map((p) => [p.id, p.name]));
export const PLAN_BY_ID  = Object.fromEntries(PLANS.map((p) => [p.id, p]));

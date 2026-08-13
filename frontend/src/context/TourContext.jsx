import { createContext, useCallback, useContext, useRef, useState } from "react";
import { getTopRated } from "../services/api";

// ---------------------------------------------------------------------------
// TourContext — drives the real in-app guided tour. Steps target actual DOM
// elements (via [data-tour="..."] attributes on the real app screens) rather
// than illustrated mockups. TourOverlay (rendered once at the app root)
// reads this state, navigates routes as needed, and draws the spotlight +
// tooltip. One engine, two step sets — personal and business reuse it
// instead of each having their own tutorial framework.
// ---------------------------------------------------------------------------

export const PERSONAL_TOUR_STEPS = [
  { target: '[data-tour="search"]',    route: "/", title: "Search",        body: "Find a business or place." },
  { target: '[data-tour="filters"]',   route: "/", title: "Filters",       body: "Choose the accessibility features you need." },
  { target: '[data-tour="near-you"]',  route: "/", title: "Nearby places", body: "See accessible locations closest to you." },
  { target: '[data-tour="nav-profile"]',   route: "/", title: "Profile",      body: "Manage your preferences and settings." },
  { target: '[data-tour="nav-bookmarks"]', route: "/", title: "Saved places", body: "Keep places you want to visit later." },
  { target: '[data-tour="accessibility-details"]', route: "business", title: "Accessibility details", body: "See entrances, parking, restrooms, photos, and more." },
  { target: '[data-tour="contribute"]',            route: "business", title: "Contribute",             body: "Add reviews, photos, or accessibility information." },
];

// All on one screen (the business dashboard) — no dynamic business id needed.
export const BUSINESS_TOUR_STEPS = [
  { target: '[data-tour="biz-dashboard"]',     route: "/business-profile", title: "Your dashboard",        body: "Track profile completion and manage your listing here." },
  { target: '[data-tour="biz-overview"]',      route: "/business-profile", title: "Business info",         body: "Keep your name, address, and description up to date." },
  { target: '[data-tour="biz-accessibility"]', route: "/business-profile", title: "Accessibility details", body: "Confirm the features visitors rely on." },
  { target: '[data-tour="biz-photos"]',        route: "/business-profile", title: "Photos & videos",       body: "Upload media so visitors know what to expect." },
  { target: '[data-tour="biz-reviews"]',       route: "/business-profile", title: "Reviews",               body: "Reply directly to reviews from visitors." },
  { target: '[data-tour="biz-analytics"]',     route: "/business-profile", title: "Insights",              body: "See which accessibility features visitors care about most." },
  { target: '[data-tour="biz-plan"]',          route: "/business-profile", title: "Plan & billing",        body: "Manage your plan or billing anytime." },
];

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const [active,     setActive]     = useState(false);
  const [steps,      setSteps]      = useState(PERSONAL_TOUR_STEPS);
  const [stepIndex,  setStepIndex]  = useState(0);
  const [businessId, setBusinessId] = useState(null);
  const onFinishRef = useRef(null);

  const finish = useCallback(() => {
    setActive(false);
    onFinishRef.current?.();
    onFinishRef.current = null;
  }, []);

  // start(steps, onFinish) — steps is one of the exported step-set constants
  // above (or a custom array, e.g. filtered to only the sections a
  // business's plan actually gives it).
  const start = useCallback((tourSteps, onFinish) => {
    onFinishRef.current = onFinish;
    setSteps(tourSteps);
    setBusinessId(null);
    if (tourSteps.some((s) => s.route === "business")) {
      getTopRated()
        .then((list) => setBusinessId(list?.[0]?.id ?? null))
        .catch(() => setBusinessId(null));
    }
    setStepIndex(0);
    setActive(true);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      const n = i + 1;
      if (n >= steps.length) { finish(); return i; }
      if (steps[n].route === "business" && !businessId) { finish(); return i; }
      return n;
    });
  }, [steps, businessId, finish]);

  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  return (
    <TourContext.Provider value={{ active, stepIndex, steps, businessId, start, next, back, skip: finish }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used inside a <TourProvider>");
  return ctx;
}

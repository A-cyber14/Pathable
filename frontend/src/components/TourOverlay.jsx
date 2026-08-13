import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTour } from "../context/TourContext";

function resolvePath(step, businessId) {
  return step.route === "business" ? `/business/${businessId}` : step.route;
}

// ---------------------------------------------------------------------------
// TourOverlay — rendered once at the app root (inside the router). Invisible
// unless a tour is active. Navigates to each step's real route, finds and
// measures the real target element, and draws a spotlight + tooltip over it
// — no illustrated mockups, the actual interface is what's highlighted.
// ---------------------------------------------------------------------------
export default function TourOverlay() {
  const { active, stepIndex, steps, businessId, next, back, skip } = useTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [rect, setRect] = useState(null);
  const navigatingRef = useRef(false);
  const tooltipRef = useRef(null);

  const step = active ? steps[stepIndex] : null;
  const targetPath = step ? resolvePath(step, businessId) : null;

  // Navigate to this step's route if we're not already there.
  useEffect(() => {
    if (!active || !targetPath) return;
    if (location.pathname !== targetPath) {
      navigatingRef.current = true;
      navigate(targetPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, targetPath]);

  // If the route changes to something the tour itself didn't cause (the user
  // navigated away manually), end the tour instead of fighting them.
  useEffect(() => {
    if (!active) return;
    if (navigatingRef.current) { navigatingRef.current = false; return; }
    if (targetPath && location.pathname !== targetPath) skip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Find + measure the target, retrying briefly while the page/data settles.
  // Scroll is instant (not smooth) so the rect we measure right after is
  // never stale mid-animation — a smooth scroll left the very first
  // measurement pointing at the pre-scroll position.
  useEffect(() => {
    setRect(null);
    if (!active || !step || location.pathname !== targetPath) return;
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "auto" });
        setRect(el.getBoundingClientRect());
      } else if (attempts < 40) {
        attempts += 1;
        setTimeout(tick, 100);
      }
    };
    tick();
    return () => { cancelled = true; };
  }, [active, step, location.pathname, targetPath]);

  // Re-measure on resize/scroll while a step is showing.
  useEffect(() => {
    if (!active || !rect || !step) return;
    const remeasure = () => {
      const el = document.querySelector(step.target);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);
    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [active, rect, step]);

  // Move focus to the tooltip on each step change — keyboard users always
  // land somewhere sensible, and it doubles as the aria-live announcement.
  useEffect(() => {
    if (active && rect) tooltipRef.current?.focus();
  }, [stepIndex, rect, active]);

  // Keyboard: arrows navigate, Escape skips.
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, next, back, skip]);

  if (!active || !step || !rect) return null;

  const isLast = stepIndex === steps.length - 1;
  const TOOLTIP_W = 300;
  // The tooltip's real height varies a little with content, but never by much
  // (title + one line of body + a button row) — a fixed estimate is enough
  // to clamp it safely inside the viewport without measuring a second pass.
  const TOOLTIP_H_ESTIMATE = 170;
  const GAP = 12;
  const PAD = 16;

  // Prefer placing the tooltip below the target; flip above it only when
  // there's clearly more room there. Elements that are themselves nearly as
  // tall as the viewport (e.g. a full-height side panel) can leave neither
  // side with a full GAP+TOOLTIP_H_ESTIMATE of room — the clamp below is
  // what actually guarantees visibility in that case, not this choice.
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= TOOLTIP_H_ESTIMATE + GAP || spaceBelow >= spaceAbove;

  let top = placeBelow ? rect.bottom + GAP : rect.top - GAP - TOOLTIP_H_ESTIMATE;
  // Full clamp: no matter how large or edge-positioned the target is, the
  // tooltip's top/left always lands fully inside the viewport.
  top = Math.min(Math.max(top, PAD), window.innerHeight - TOOLTIP_H_ESTIMATE - PAD);
  const left = Math.min(Math.max(rect.left, PAD), Math.max(PAD, window.innerWidth - TOOLTIP_W - PAD));

  return (
    <>
      {/* Spotlight — dark everywhere except a rounded window over the target */}
      <div
        aria-hidden="true"
        style={{
          position:     "fixed",
          top:          `${rect.top - 6}px`,
          left:         `${rect.left - 6}px`,
          width:        `${rect.width + 12}px`,
          height:       `${rect.height + 12}px`,
          borderRadius: "10px",
          boxShadow:    "0 0 0 9999px rgba(17,24,39,0.6)",
          zIndex:       9990,
          pointerEvents: "none",
        }}
      />

      {/* Tooltip — positioned + fully clamped inside the viewport above */}
      <div
        ref={tooltipRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${step.title}, step ${stepIndex + 1} of ${steps.length}`}
        style={{
          position:        "fixed",
          top:             `${top}px`,
          left:            `${left}px`,
          width:           `${TOOLTIP_W}px`,
          maxWidth:        "calc(100vw - 32px)",
          maxHeight:       `calc(100vh - ${PAD * 2}px)`,
          overflowY:       "auto",
          backgroundColor: "#fff",
          borderRadius:    "12px",
          boxShadow:       "0 12px 32px rgba(0,0,0,0.28)",
          padding:         "16px 18px",
          zIndex:          9991,
          outline:         "none",
        }}
      >
        <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: "700", color: "#9ca3af" }}>
          {stepIndex + 1} of {steps.length}
        </p>
        <h2 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "800", color: "#111827" }}>{step.title}</h2>
        <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6b7280", lineHeight: "1.5" }}>{step.body}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={skip}
            style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "13px", fontWeight: "600", cursor: "pointer", padding: "6px 4px" }}
          >
            Skip
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            {stepIndex > 0 && (
              <button
                onClick={back}
                style={{ padding: "8px 14px", backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer", color: "#374151" }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              style={{ padding: "8px 16px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

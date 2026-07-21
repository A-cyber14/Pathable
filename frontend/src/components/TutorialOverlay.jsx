import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// TutorialOverlay
// Reusable short/skippable *visual* tutorial used by both the personal and
// business onboarding flows (and re-openable later from Profile/Dashboard
// "Help"). Each step shows a small built UI-preview mockup (from
// components/tutorial-previews/) instead of a single big emoji — no
// screenshots, so nothing here goes stale as the real UI evolves.
//
// Props:
//   steps      — [{ preview, title, description, badge? }] — `preview` is a
//                small presentational React element (see tutorial-previews/)
//   onFinish() — called after the last step's Next, or Skip, at any point
//   heading    — optional page heading shown above the card
// ---------------------------------------------------------------------------
export default function TutorialOverlay({ steps, onFinish, heading = "Quick tour" }) {
  const [index, setIndex] = useState(0);
  const isLast = index === steps.length - 1;
  const step = steps[index];

  const next = useCallback(() => {
    if (isLast) onFinish();
    else setIndex((i) => i + 1);
  }, [isLast, onFinish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keyboard navigation — arrow keys move between steps, Escape skips.
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
      else if (e.key === "Escape") onFinish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, back, onFinish]);

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "sans-serif", padding: "32px 24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src="/logo.png" alt="" aria-hidden="true" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "5px" }} />
            <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#6b7280", margin: 0 }}>{heading}</h1>
          </div>
          <button
            onClick={onFinish}
            aria-label="Skip tutorial"
            style={{ background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", padding: "6px 4px" }}
          >
            Skip
          </button>
        </div>

        {/* Progress dots — role="progressbar" for screen readers */}
        <div
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-label={`Step ${index + 1} of ${steps.length}`}
          style={{ display: "flex", gap: "6px", marginBottom: "20px" }}
        >
          {steps.map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                flex: 1, height: "4px", borderRadius: "2px",
                backgroundColor: i <= index ? "#2563eb" : "#e5e7eb",
                transition: "background-color 0.2s",
              }}
            />
          ))}
        </div>

        {/* Live region announces step changes to screen readers */}
        <div
          aria-live="polite"
          style={{
            backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "16px",
            padding: "36px 28px", textAlign: "center", minHeight: "260px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}
        >
          {step.preview && <div style={{ marginBottom: "18px" }}>{step.preview}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#111827", margin: 0 }}>{step.title}</h2>
            {step.badge && (
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#7c3aed", backgroundColor: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: "999px", padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {step.badge}
              </span>
            )}
          </div>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: "1.6" }}>{step.description}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
          <button
            onClick={back}
            disabled={index === 0}
            style={{
              padding: "10px 18px", backgroundColor: "#fff", color: "#374151",
              border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600",
              cursor: index === 0 ? "not-allowed" : "pointer", opacity: index === 0 ? 0.4 : 1,
              minHeight: "44px", minWidth: "44px",
            }}
          >
            ← Back
          </button>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>{index + 1} / {steps.length}</span>
          <button
            onClick={next}
            style={{
              padding: "10px 22px", backgroundColor: "#111827", color: "#fff",
              border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: "700",
              cursor: "pointer", minHeight: "44px",
            }}
          >
            {isLast ? "Done" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

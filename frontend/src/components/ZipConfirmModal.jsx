import { useEffect } from "react";

// ---------------------------------------------------------------------------
// ZipConfirmModal
// Confirms the city/state a ZIP code resolved to before LocationPicker saves
// it, so a mistyped ZIP doesn't silently set the wrong location.
//
// Props:
//   zip      — the ZIP code entered
//   city     — resolved city (may be null)
//   state    — resolved state abbreviation (may be null)
//   onConfirm()
//   onCancel()
// ---------------------------------------------------------------------------
export default function ZipConfirmModal({ zip, city, state, onConfirm, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  const place = [city, state].filter(Boolean).join(", ") || "an unknown location";

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 400,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff", borderRadius: "16px", padding: "32px 28px",
          maxWidth: "360px", width: "100%", textAlign: "center",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#eff6ff",
          border: "1.5px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px", fontSize: "20px",
        }}>
          📍
        </div>

        <h2 style={{ margin: "0 0 8px", fontSize: "17px", fontWeight: "700", color: "#111827" }}>
          Is this the right location?
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
          ZIP code <strong style={{ color: "#374151" }}>{zip}</strong> is associated with:
          <br />
          <span style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>{place}</span>
        </p>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "12px", backgroundColor: "#fff", color: "#374151",
              border: "1.5px solid #d1d5db", borderRadius: "10px", fontSize: "14px",
              fontWeight: "600", cursor: "pointer", minHeight: "44px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "12px", backgroundColor: "#111827", color: "#fff",
              border: "none", borderRadius: "10px", fontSize: "14px",
              fontWeight: "600", cursor: "pointer", minHeight: "44px",
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

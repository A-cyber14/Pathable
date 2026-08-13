const TYPE_STYLES = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" },
  error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
};

function ToastChip({ toast, onDismiss, style }) {
  const s = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onClick={() => onDismiss(toast.id)}
      style={{
        pointerEvents:    "auto",
        cursor:           "pointer",
        boxSizing:        "border-box",
        backgroundColor:  s.bg,
        border:           `1px solid ${s.border}`,
        color:            s.text,
        borderRadius:     "8px",
        padding:          "7px 12px",
        fontSize:         "13px",
        fontWeight:       600,
        boxShadow:        "0 2px 10px rgba(0,0,0,0.1)",
        whiteSpace:       "nowrap",
        ...style,
      }}
    >
      {toast.message}
    </div>
  );
}

// Toasts with an `anchor` (a viewport {top,left} point captured from the
// triggering control) render as a standalone chip just above that point.
// Toasts with no anchor stack in one top-center column instead — never
// bottom-left, never chasing the pointer.
export default function ToastStack({ toasts, onDismiss }) {
  const anchored   = toasts.filter((t) => t.anchor);
  const unanchored = toasts.filter((t) => !t.anchor);

  return (
    <>
      <div
        style={{
          position:       "fixed",
          top:            "16px",
          left:           "50%",
          transform:      "translateX(-50%)",
          zIndex:         9999,
          display:        "flex",
          flexDirection:  "column",
          gap:            "8px",
          alignItems:     "center",
          pointerEvents:  "none",
        }}
        aria-live="polite"
        aria-atomic="false"
      >
        {unanchored.map((t) => (
          <ToastChip key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>

      {anchored.map((t) => {
        const left = Math.min(Math.max(t.anchor.left, 60), window.innerWidth - 60);
        const top  = Math.max(t.anchor.top - 10, 8);
        return (
          <div
            key={t.id}
            aria-live="polite"
            style={{
              position:      "fixed",
              top:           `${top}px`,
              left:          `${left}px`,
              transform:     "translate(-50%, -100%)",
              zIndex:        9999,
              pointerEvents: "none",
            }}
          >
            <ToastChip toast={t} onDismiss={onDismiss} style={{ pointerEvents: "auto" }} />
          </div>
        );
      })}
    </>
  );
}

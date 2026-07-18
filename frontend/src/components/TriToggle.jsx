// ---------------------------------------------------------------------------
// TriToggle
// Yes / No / Unsure / N/A toggle for accessibility fields. Same True/False/
// null convention used across the Business model (null = "Unsure"). "Not
// applicable" is tracked separately by the caller (it isn't a valid value of
// the underlying boolean field) via notApplicable/onNotApplicableChange.
//
// Accessible: each option is a real <button> with aria-pressed, so state is
// never conveyed by color alone and the control is fully keyboard-operable.
// ---------------------------------------------------------------------------
export default function TriToggle({ label, value, onChange, notApplicable = false, onNotApplicableChange, description }) {
  const options = [
    { v: true,  label: "Yes" },
    { v: false, label: "No" },
    { v: null,  label: "Unsure" },
  ];

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "2px" }}>{label}</div>
      {description && (
        <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>{description}</div>
      )}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }} role="group" aria-label={label}>
        {options.map(({ v, label: l }) => {
          const selected = !notApplicable && value === v;
          return (
            <button
              key={l}
              type="button"
              aria-pressed={selected}
              disabled={notApplicable}
              onClick={() => onChange(v)}
              style={{
                padding:         "6px 14px",
                borderRadius:    "6px",
                border:          `1.5px solid ${selected ? "#2563eb" : "#e5e7eb"}`,
                backgroundColor: selected ? "#eff6ff" : "#fff",
                color:           selected ? "#2563eb" : "#6b7280",
                fontSize:        "13px",
                fontWeight:      selected ? "700" : "500",
                cursor:          notApplicable ? "not-allowed" : "pointer",
                opacity:         notApplicable ? 0.5 : 1,
              }}
            >
              {selected ? "✓ " : ""}{l}
            </button>
          );
        })}
        {onNotApplicableChange && (
          <button
            type="button"
            aria-pressed={notApplicable}
            onClick={() => onNotApplicableChange(!notApplicable)}
            style={{
              padding:         "6px 14px",
              borderRadius:    "6px",
              border:          `1.5px solid ${notApplicable ? "#2563eb" : "#e5e7eb"}`,
              backgroundColor: notApplicable ? "#eff6ff" : "#fff",
              color:           notApplicable ? "#2563eb" : "#6b7280",
              fontSize:        "13px",
              fontWeight:      notApplicable ? "700" : "500",
              cursor:          "pointer",
            }}
          >
            {notApplicable ? "✓ " : ""}N/A
          </button>
        )}
      </div>
    </div>
  );
}

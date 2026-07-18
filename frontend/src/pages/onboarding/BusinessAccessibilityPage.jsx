import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardBusiness, updateDashboardBusiness, updateProfile } from "../../services/api";
import { BUSINESS_ACCESSIBILITY_FEATURES, ENTRANCE_WIDTH_OPTIONS } from "../../constants/accessibility";
import TriToggle from "../../components/TriToggle";

// ---------------------------------------------------------------------------
// BusinessAccessibilityPage
// Route: /business-setup/accessibility
// Reuses the same tri-state Business accessibility fields as the rest of
// Pathable (see constants/accessibility.js) — Yes/No/Unsure/N/A plus an
// optional short note per feature.
// ---------------------------------------------------------------------------

const inputStyle = {
  width: "100%", padding: "9px 11px", fontSize: "13px",
  border: "1.5px solid #d1d5db", borderRadius: "8px", outline: "none",
  backgroundColor: "#fff", color: "#111827", boxSizing: "border-box", fontFamily: "sans-serif",
};

export default function BusinessAccessibilityPage() {
  const navigate = useNavigate();

  const [values,   setValues]   = useState({});
  const [notApplicable, setNotApplicable] = useState({});
  const [notes,    setNotes]    = useState({});
  const [noteOpen, setNoteOpen] = useState({});
  const [entranceWidth, setEntranceWidth] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    getDashboardBusiness()
      .then((biz) => {
        const v = {};
        BUSINESS_ACCESSIBILITY_FEATURES.forEach(({ key }) => { v[key] = biz[key] ?? null; });
        setValues(v);
        setNotApplicable(
          Object.fromEntries((biz.accessibilityNotApplicable || []).map((k) => [k, true]))
        );
        setNotes(biz.accessibilityNotes || {});
        setEntranceWidth(biz.entrance_width_rating || "");
      })
      .catch(() => setError("Failed to load your business's accessibility details."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    const naList = Object.keys(notApplicable).filter((k) => notApplicable[k]);
    const cleanNotes = Object.fromEntries(Object.entries(notes).filter(([, v]) => v && v.trim()));

    const payload = {
      ...values,
      entrance_width_rating: entranceWidth || null,
      accessibilityNotApplicable: naList,
      accessibilityNotes: cleanNotes,
    };

    try {
      await updateDashboardBusiness(payload);
      try { await updateProfile({ onboardingStep: "business-photos" }); } catch { /* non-blocking */ }
      navigate("/business-setup/photos");
    } catch (err) {
      setError(err.message || "Failed to save accessibility details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px 60px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>Accessibility information</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.5" }}>
          Let visitors know what to expect. Choose "Unsure" if you're not certain, or "N/A" if a feature doesn't apply to your location.
        </p>

        <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "22px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {BUSINESS_ACCESSIBILITY_FEATURES.map(({ key, label, icon }) => (
            <div key={key} style={{ paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #f3f4f6" }}>
              <TriToggle
                label={`${icon} ${label}`}
                value={values[key] ?? null}
                onChange={(v) => setValues((s) => ({ ...s, [key]: v }))}
                notApplicable={!!notApplicable[key]}
                onNotApplicableChange={(na) => setNotApplicable((s) => ({ ...s, [key]: na }))}
              />
              {!noteOpen[key] ? (
                <button
                  type="button"
                  onClick={() => setNoteOpen((s) => ({ ...s, [key]: true }))}
                  style={{ background: "none", border: "none", color: "#2563eb", fontSize: "12px", fontWeight: "600", cursor: "pointer", padding: 0 }}
                >
                  + Add a note
                </button>
              ) : (
                <textarea
                  value={notes[key] || ""}
                  onChange={(e) => setNotes((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder="e.g. Accessible entrance is located on the east side."
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical", marginTop: "4px" }}
                />
              )}
            </div>
          ))}

          <div>
            <label htmlFor="entrance-width" style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px", display: "block" }}>
              🚪 Entrance Width
            </label>
            <select id="entrance-width" value={entranceWidth} onChange={(e) => setEntranceWidth(e.target.value)} style={{ ...inputStyle, cursor: "pointer", maxWidth: "260px" }}>
              {ENTRANCE_WIDTH_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        {error && <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 14px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "14px 18px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            ← Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              flex: 1, padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none",
              borderRadius: "10px", fontSize: "15px", fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, minHeight: "48px",
            }}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

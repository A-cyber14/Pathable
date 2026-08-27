import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBusinesses, submitFeatures } from "../services/api";
import { useToast } from "../context/ToastContext";
import TriToggle from "../components/TriToggle";

// ---------------------------------------------------------------------------
// ContributeFeaturesPage
// Route: /contribute/features (protected)
// ---------------------------------------------------------------------------

// Tri-state (true/false/null = Yes/No/Unsure) — a field left at null is
// never sent as a report, so it can't be mistaken for a confirmed "No" on
// the business record. See services/accessibility.py on the backend.
const INITIAL_FORM = {
  wheelchairAccessible:       null,
  accessibleParking:          null,
  doorWidth:                  "",
  accessibleRestroom:         null,
  wheelchairAccessibleTables: null,
  handrailsAvailable:         null,
  notes:                      "",
};

export default function ContributeFeaturesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [businesses,  setBusinesses]  = useState([]);
  const [businessId,  setBusinessId]  = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState(null);
  const [loadError,  setLoadError]  = useState(null);

  useEffect(() => {
    getBusinesses()
      .then(setBusinesses)
      .catch(() => setLoadError("Couldn't load the business list. Please refresh and try again."));
  }, []);

  const hasAnswer = Object.entries(form).some(([key, v]) => {
    if (key === "notes") return v.trim().length > 0;
    if (key === "doorWidth") return v !== "";
    return v !== null;
  });
  const valid = !!businessId && hasAnswer;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    if (submitting) return;
    if (!businessId) { setError("Please select a business."); return; }
    if (!hasAnswer)   { setError("Please answer at least one field before submitting."); return; }
    const anchor = e.currentTarget;
    setError(null);
    setSubmitting(true);
    try {
      await submitFeatures(businessId, {
        ...form,
        doorWidth: form.doorWidth ? parseInt(form.doorWidth, 10) : null,
      });
      setSuccess(true);
      setForm(INITIAL_FORM);
      setBusinessId("");
      showToast("Accessibility info added", "success", anchor);
    } catch (err) {
      setError(err.message || "Submission failed. Your answers were kept — please try again.");
      showToast("Couldn't save changes", "error", anchor);
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle  = { fontSize: "13px", fontWeight: "600", color: "#374151" };
  const inputStyle  = {
    width: "100%", padding: "10px 12px", fontSize: "14px",
    border: "1.5px solid #d1d5db", borderRadius: "8px",
    outline: "none", boxSizing: "border-box", color: "#111827",
  };

  const submitHint = !businessId
    ? "Select a business to submit."
    : !hasAnswer
      ? "Answer at least one field to submit."
      : undefined;

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        {/* Back button */}
        <button
          onClick={() => navigate("/contribute")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "14px", padding: "0", marginBottom: "20px" }}
        >
          ← Back to Contribute
        </button>

        <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
          Add Accessibility Features
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>
          Share what accessibility features this location has. This is community-submitted
          info — it appears on the business page right away, alongside how many contributors
          have confirmed each detail.
        </p>
        <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 28px" }}>
          Choose "Unsure" for anything you don't know — that keeps it from being recorded as "No".
        </p>

        {/* Success message */}
        {success && (
          <div role="status" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#15803d" }}>
            ✓ Accessibility info added. Thank you for contributing!
          </div>
        )}

        {loadError && (
          <div role="alert" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#dc2626" }}>
            {loadError}
          </div>
        )}

        {/* Form */}
        <div style={{ backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "4px" }}>

          {/* Business selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
            <label htmlFor="features-business" style={labelStyle}>Business <span style={{ color: "#dc2626" }}>*</span></label>
            <select
              id="features-business"
              value={businessId}
              onChange={(e) => { setBusinessId(e.target.value); setSuccess(false); setError(null); }}
              style={{ ...inputStyle, backgroundColor: "#f9fafb", cursor: "pointer" }}
            >
              <option value="">Select a business...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <TriToggle label="♿ Wheelchair Accessible" description="Ramps or step-free access" value={form.wheelchairAccessible} onChange={(v) => setField("wheelchairAccessible", v)} />
          <TriToggle label="🚗 Accessible Parking" description="Designated spaces near entrance" value={form.accessibleParking} onChange={(v) => setField("accessibleParking", v)} />
          <TriToggle label="🚻 Accessible Restroom" description="Wheelchair-accessible restroom" value={form.accessibleRestroom} onChange={(v) => setField("accessibleRestroom", v)} />
          <TriToggle label="🪑 Wheelchair-accessible tables" description="Tables with adequate clearance for wheelchairs" value={form.wheelchairAccessibleTables} onChange={(v) => setField("wheelchairAccessibleTables", v)} />
          <TriToggle label="🪜 Handrails available" description="Handrails on stairs, ramps, or walkways" value={form.handrailsAvailable} onChange={(v) => setField("handrailsAvailable", v)} />

          {/* Door width */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
            <label htmlFor="features-door-width" style={labelStyle}>Door Width (inches) <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <input id="features-door-width" type="number" name="doorWidth" placeholder="e.g. 36"
              value={form.doorWidth} onChange={(e) => setField("doorWidth", e.target.value)} min="0" style={inputStyle} />
          </div>

          {/* Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
            <label htmlFor="features-notes" style={labelStyle}>Additional Notes <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <textarea id="features-notes" name="notes" placeholder="Any other accessibility details worth mentioning..."
              value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {error && <p role="alert" style={{ margin: "8px 0 0", fontSize: "13px", color: "#dc2626" }}>{error}</p>}

          <button
            onClick={handleSubmit}
            aria-disabled={!valid || submitting}
            title={submitHint}
            onKeyDown={(e) => { if ((!valid || submitting) && (e.key === "Enter" || e.key === " ")) e.preventDefault(); }}
            style={{
              padding: "12px", backgroundColor: !valid || submitting ? "#d1d5db" : "#111827",
              color: !valid || submitting ? "#9ca3af" : "#fff",
              border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600",
              cursor: submitting ? "not-allowed" : !valid ? "not-allowed" : "pointer",
              marginTop: "12px",
            }}
          >
            {submitting ? "Submitting..." : "Submit Features"}
          </button>
          {submitHint && !submitting && (
            <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#9ca3af" }}>{submitHint}</p>
          )}
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { setupBusiness, updateProfile } from "../../services/api";
import { BUSINESS_CATEGORIES } from "../../constants/accessibility";

// ---------------------------------------------------------------------------
// NewBusinessInfoPage
// Route: /business-setup/new
//
// The very first business-onboarding step for a business that isn't on
// Pathable yet (reached from BusinessSetupPage's "Add a new business" /
// "I can't find my business"). Intentionally minimal — only what's needed
// to create the listing and move on to plan selection. Phone, business
// email, website, description, hours, etc. are collected afterward in
// BusinessInformationPage / BusinessHoursPage once the business exists.
//
// In-progress typing is saved to localStorage so a refresh doesn't lose it
// — the business itself isn't created until Continue is pressed.
// ---------------------------------------------------------------------------

const inputStyle = {
  width: "100%", padding: "10px 12px", fontSize: "14px",
  border: "1.5px solid #d1d5db", borderRadius: "8px", outline: "none",
  backgroundColor: "#f9fafb", color: "#111827", boxSizing: "border-box", fontFamily: "sans-serif",
};

const labelStyle = { display: "block", fontSize: "12px", fontWeight: "600", color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" };

const cardStyle = {
  backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px",
  padding: "22px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const EMPTY_FORM = { name: "", address: "", category: "" };

function draftKey(uid) { return `pathable-business-draft-${uid}`; }

export default function NewBusinessInfoPage() {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [form,        setForm]        = useState(EMPTY_FORM);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error,       setError]       = useState(null);

  useEffect(() => {
    if (currentUser) {
      const raw = localStorage.getItem(draftKey(currentUser.uid));
      if (raw) {
        try { setForm({ ...EMPTY_FORM, ...JSON.parse(raw) }); } catch { /* ignore corrupt draft */ }
      }
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || loading) return;
    localStorage.setItem(draftKey(currentUser.uid), JSON.stringify(form));
  }, [form, currentUser, loading]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())    errs.name = "Business name is required.";
    if (!form.address.trim()) errs.address = "Street address is required.";
    if (!form.category)       errs.category = "Please select a category.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    try {
      await setupBusiness({ name: form.name.trim(), address: form.address.trim(), category: form.category });
      if (currentUser) localStorage.removeItem(draftKey(currentUser.uid));
      await refreshProfile();
      try { await updateProfile({ onboardingStep: "business-plan" }); } catch { /* non-blocking */ }
      navigate("/business-setup/plan");
    } catch (err) {
      setError(err.message || "Failed to add your business. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px 60px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>
          Add your business
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.5" }}>
          Just the basics for now — you'll fill in the rest (phone, hours, accessibility, photos) in the next few steps.
        </p>

        <div style={cardStyle}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="biz-name" style={labelStyle}>Business Name</label>
            <input id="biz-name" value={form.name} onChange={(e) => setField("name", e.target.value)} style={inputStyle} autoFocus />
            {fieldErrors.name && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.name}</p>}
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="biz-address" style={labelStyle}>Street Address</label>
            <input id="biz-address" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Street, city, state, ZIP" style={inputStyle} />
            {fieldErrors.address && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.address}</p>}
          </div>

          <div style={{ marginBottom: "0" }}>
            <label htmlFor="biz-category" style={labelStyle}>Business Category</label>
            <select id="biz-category" value={form.category} onChange={(e) => setField("category", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">Select a category…</option>
              {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {fieldErrors.category && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.category}</p>}
          </div>
        </div>

        {error && <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 14px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate("/business-setup")}
            style={{ padding: "14px 18px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            ← Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1, padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none",
              borderRadius: "10px", fontSize: "15px", fontWeight: "600",
              cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, minHeight: "48px",
            }}
          >
            {submitting ? "Saving…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}

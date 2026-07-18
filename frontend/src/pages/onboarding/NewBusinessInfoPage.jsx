import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { setupBusiness, updateDashboardBusiness, getDashboardBusiness, updateProfile } from "../../services/api";
import { BUSINESS_CATEGORIES, WEEKDAYS } from "../../constants/accessibility";

// ---------------------------------------------------------------------------
// NewBusinessInfoPage
// Route: /business-setup/information
//
// Two modes, distinguished by whether we arrived with a businessId (claimed
// an existing listing on BusinessSetupPage) or not (adding a brand new one):
//   - New business  → POST /me/setup-business (creates + claims in one call)
//   - Claimed business → PUT /dashboard/my-business (fills in the gaps)
//
// In-progress typing for a brand-new business is saved to localStorage so a
// refresh doesn't lose it — the business itself isn't created until Continue
// is pressed. Claimed businesses don't need this since the record already
// exists in Firestore.
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const URL_RE   = /^https?:\/\/[^\s]+\.[^\s]+$/i;

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

const EMPTY_FORM = {
  name: "", address: "", category: "", phone: "", businessEmail: "",
  website: "", description: "", hours: {},
};

function draftKey(uid) { return `pathable-business-draft-${uid}`; }

export default function NewBusinessInfoPage() {
  const { currentUser, refreshProfile } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const claimedBusinessId = state?.businessId || null;

  const [form,        setForm]        = useState(EMPTY_FORM);
  const [closedDays,  setClosedDays]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error,       setError]       = useState(null);
  const loadedFromDraft = useRef(false);

  // Load either the claimed business's current data, or a saved draft.
  useEffect(() => {
    (async () => {
      if (claimedBusinessId) {
        try {
          const biz = await getDashboardBusiness();
          setForm({
            name: biz.name || "", address: biz.address || "", category: biz.category || "",
            phone: biz.phone || "", businessEmail: biz.businessEmail || "", website: biz.website || "",
            description: biz.description || "", hours: biz.hours || {},
          });
          const closed = {};
          Object.entries(biz.hours || {}).forEach(([k, v]) => { if (v === "Closed") closed[k] = true; });
          setClosedDays(closed);
        } catch {
          setError("Failed to load your business details.");
        }
      } else if (currentUser) {
        const raw = localStorage.getItem(draftKey(currentUser.uid));
        if (raw) {
          try {
            const draft = JSON.parse(raw);
            setForm({ ...EMPTY_FORM, ...draft });
            loadedFromDraft.current = true;
          } catch { /* ignore corrupt draft */ }
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimedBusinessId]);

  // Save draft as the owner types (new-business mode only).
  useEffect(() => {
    if (claimedBusinessId || !currentUser || loading) return;
    localStorage.setItem(draftKey(currentUser.uid), JSON.stringify(form));
  }, [form, claimedBusinessId, currentUser, loading]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: null }));
  };

  const setHour = (dayKey, value) => setForm((f) => ({ ...f, hours: { ...f.hours, [dayKey]: value } }));
  const toggleClosed = (dayKey) => {
    const nowClosed = !closedDays[dayKey];
    setClosedDays((c) => ({ ...c, [dayKey]: nowClosed }));
    setHour(dayKey, nowClosed ? "Closed" : "");
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim())    errs.name = "Business name is required.";
    if (!form.address.trim()) errs.address = "Street address is required.";
    if (!form.category)       errs.category = "Please select a category.";
    if (!form.phone.trim())   errs.phone = "Phone number is required.";
    else if (form.phone.replace(/\D/g, "").length < 7) errs.phone = "Enter a valid phone number.";
    if (!form.businessEmail.trim()) errs.businessEmail = "Business email is required.";
    else if (!EMAIL_RE.test(form.businessEmail.trim())) errs.businessEmail = "Enter a valid email address.";
    if (form.website.trim() && !URL_RE.test(form.website.trim())) errs.website = "Enter a full URL, e.g. https://example.com";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      name: form.name.trim(), address: form.address.trim(), category: form.category,
      phone: form.phone.trim(), businessEmail: form.businessEmail.trim(),
      website: form.website.trim() || undefined, description: form.description.trim() || undefined,
      hours: Object.keys(form.hours).length ? form.hours : undefined,
    };

    try {
      if (claimedBusinessId) {
        await updateDashboardBusiness(payload);
      } else {
        await setupBusiness(payload);
        if (currentUser) localStorage.removeItem(draftKey(currentUser.uid));
      }
      await refreshProfile();
      try { await updateProfile({ onboardingStep: "business-accessibility" }); } catch { /* non-blocking */ }
      navigate("/business-setup/accessibility");
    } catch (err) {
      setError(err.message || "Failed to save your business information. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px 60px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>
          {claimedBusinessId ? "Complete your business information" : "Tell us about your business"}
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.5" }}>
          This appears on your public Pathable listing. You can update it anytime from your dashboard.
        </p>

        <div style={cardStyle}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="biz-name" style={labelStyle}>Business Name</label>
            <input id="biz-name" value={form.name} onChange={(e) => setField("name", e.target.value)} style={inputStyle} />
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

        <div style={cardStyle}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="biz-phone" style={labelStyle}>Business Phone</label>
            <input id="biz-phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="(555) 123-4567" style={inputStyle} />
            {fieldErrors.phone && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.phone}</p>}
          </div>

          <div style={{ marginBottom: "0" }}>
            <label htmlFor="biz-email" style={labelStyle}>Business Email</label>
            <input id="biz-email" type="email" value={form.businessEmail} onChange={(e) => setField("businessEmail", e.target.value)} style={inputStyle} />
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "5px 0 0", lineHeight: "1.5" }}>
              Separate from your login email ({currentUser?.email}) and never shown publicly unless you choose to display it later.
            </p>
            {fieldErrors.businessEmail && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.businessEmail}</p>}
          </div>
        </div>

        <div style={cardStyle}>
          <p style={{ ...labelStyle, marginBottom: "12px" }}>Operating Hours <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></p>
          {WEEKDAYS.map(({ key, label }) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
              <span style={{ fontSize: "13px", color: "#374151", width: "84px", flexShrink: 0 }}>{label}</span>
              <input
                value={closedDays[key] ? "" : (form.hours[key] || "")}
                onChange={(e) => setHour(key, e.target.value)}
                disabled={!!closedDays[key]}
                placeholder={closedDays[key] ? "Closed" : "9:00 AM – 5:00 PM"}
                style={{ ...inputStyle, padding: "7px 10px", opacity: closedDays[key] ? 0.5 : 1 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#6b7280", flexShrink: 0, cursor: "pointer" }}>
                <input type="checkbox" checked={!!closedDays[key]} onChange={() => toggleClosed(key)} style={{ cursor: "pointer" }} />
                Closed
              </label>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="biz-website" style={labelStyle}>Website <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <input id="biz-website" value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://example.com" style={inputStyle} />
            {fieldErrors.website && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.website}</p>}
          </div>
          <div>
            <label htmlFor="biz-desc" style={labelStyle}>Short Description <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <textarea id="biz-desc" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>

        {error && <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "0 0 14px" }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%", padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none",
            borderRadius: "10px", fontSize: "15px", fontWeight: "600",
            cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, minHeight: "48px",
          }}
        >
          {submitting ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

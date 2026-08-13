import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getDashboardBusiness, updateDashboardBusiness, updateProfile } from "../../services/api";

// ---------------------------------------------------------------------------
// BusinessInformationPage
// Route: /business-setup/information
// Runs after a business exists (claimed or just created) and a plan is
// selected. Collects phone + business email (required) and website /
// description / social links (optional, skippable).
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

const SOCIAL_FIELDS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/yourbusiness" },
  { key: "x",         label: "X / Twitter", placeholder: "https://x.com/yourbusiness" },
];

export default function BusinessInformationPage() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [phone,       setPhone]       = useState("");
  const [email,       setEmail]       = useState("");
  const [website,     setWebsite]     = useState("");
  const [description, setDescription] = useState("");
  const [social,      setSocial]      = useState({});
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error,       setError]       = useState(null);

  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke firing this
    // fetch twice and a stale response overwriting anything the user has
    // already started typing.
    let ignore = false;
    getDashboardBusiness()
      .then((biz) => {
        if (ignore) return;
        setPhone(biz.phone || "");
        setEmail(biz.businessEmail || "");
        setWebsite(biz.website || "");
        setDescription(biz.description || "");
        setSocial(biz.socialLinks || {});
      })
      .catch(() => { if (!ignore) setError("Failed to load your business."); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const validate = () => {
    const errs = {};
    if (!phone.trim()) errs.phone = "Phone number is required.";
    else if (phone.replace(/\D/g, "").length < 7) errs.phone = "Enter a valid phone number.";
    if (!email.trim()) errs.email = "Business email is required.";
    else if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email address.";
    if (website.trim() && !URL_RE.test(website.trim())) errs.website = "Enter a full URL, e.g. https://example.com";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (submitting) return;
    if (!validate()) return;
    const anchor = e.currentTarget;
    setSubmitting(true);
    setError(null);

    const cleanSocial = Object.fromEntries(Object.entries(social).filter(([, v]) => v && v.trim()));

    try {
      await updateDashboardBusiness({
        phone: phone.trim(),
        businessEmail: email.trim(),
        website: website.trim() || undefined,
        description: description.trim() || undefined,
        socialLinks: cleanSocial,
      });
      try { await updateProfile({ onboardingStep: "business-hours" }); } catch { /* non-blocking */ }
      showToast("Changes saved", "success", anchor);
      navigate("/business-setup/hours");
    } catch (err) {
      setError(err.message || "Failed to save your business information. Please try again.");
      showToast("Couldn't save changes", "error", anchor);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px 60px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>
          Business information
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.5" }}>
          This appears on your public Pathable listing. You can update it anytime from your dashboard.
        </p>

        <div style={cardStyle}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="biz-phone" style={labelStyle}>Business Phone</label>
            <input id="biz-phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setFieldErrors((f) => ({ ...f, phone: null })); }} placeholder="(555) 123-4567" style={inputStyle} autoFocus />
            {fieldErrors.phone && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.phone}</p>}
          </div>

          <div>
            <label htmlFor="biz-email" style={labelStyle}>Business Email</label>
            <input id="biz-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((f) => ({ ...f, email: null })); }} style={inputStyle} />
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: "5px 0 0", lineHeight: "1.5" }}>
              Separate from your login email ({currentUser?.email}) and never shown publicly unless you choose to display it later.
            </p>
            {fieldErrors.email && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.email}</p>}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ marginBottom: "14px" }}>
            <label htmlFor="biz-website" style={labelStyle}>Website <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <input id="biz-website" value={website} onChange={(e) => { setWebsite(e.target.value); setFieldErrors((f) => ({ ...f, website: null })); }} placeholder="https://example.com" style={inputStyle} />
            {fieldErrors.website && <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 0" }}>{fieldErrors.website}</p>}
          </div>
          <div>
            <label htmlFor="biz-desc" style={labelStyle}>Short Description <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
            <textarea id="biz-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>

        <div style={cardStyle}>
          <p style={{ ...labelStyle, marginBottom: "12px" }}>Social Media <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></p>
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: "12px" }}>
              <label htmlFor={`social-${key}`} style={{ fontSize: "13px", color: "#374151", marginBottom: "5px", display: "block" }}>{label}</label>
              <input
                id={`social-${key}`}
                value={social[key] || ""}
                onChange={(e) => setSocial((s) => ({ ...s, [key]: e.target.value }))}
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
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

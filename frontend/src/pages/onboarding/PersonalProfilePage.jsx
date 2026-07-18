import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProfile, updateProfile } from "../../services/api";
import { DISABILITY_OPTIONS, FEATURE_OPTIONS } from "../../constants/accessibility";

// ---------------------------------------------------------------------------
// PersonalProfilePage
// Route: /onboarding/profile
// Second step of personal onboarding — reuses the exact same accessibility
// need / feature preference fields as the Settings page (ProfilePage), plus
// the privacy/identity preference. Larger text & high contrast intentionally
// stay out of onboarding — those remain in Settings only.
// ---------------------------------------------------------------------------

const selectStyle = {
  width: "100%", padding: "10px 12px", fontSize: "14px",
  border: "1.5px solid #d1d5db", borderRadius: "8px", outline: "none",
  backgroundColor: "#f9fafb", color: "#111827", cursor: "pointer", boxSizing: "border-box",
};

export default function PersonalProfilePage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [disabilityType,     setDisabilityType]     = useState("");
  const [featurePreferences, setFeaturePreferences] = useState([]);
  const [hideIdentity,       setHideIdentity]       = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setDisabilityType(data.disabilityType || "");
        setFeaturePreferences(data.featurePreferences || []);
        setHideIdentity(data.hideIdentity ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const togglePreference = (value) => {
    setFeaturePreferences((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
  };

  const handleContinue = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ disabilityType, featurePreferences, hideIdentity, onboardingStep: "tutorial" });
      await refreshProfile();
      navigate("/onboarding/tutorial");
    } catch (err) {
      setError(err.message || "Failed to save your profile. Please try again.");
      setSaving(false);
    }
  };

  const cardStyle = {
    backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px",
    padding: "20px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;
  }

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>Set up your profile</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.5" }}>
          This helps Pathable surface the places and features that matter most to you. Everything here is optional and can be changed later in Settings.
        </p>

        <div style={cardStyle}>
          <label htmlFor="disability-type" style={{ display: "block", fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "10px" }}>
            Primary accessibility need
          </label>
          <select
            id="disability-type"
            value={disabilityType}
            onChange={(e) => setDisabilityType(e.target.value)}
            style={selectStyle}
          >
            {DISABILITY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: "0 0 12px" }}>
            Feature preferences
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {FEATURE_OPTIONS.map(({ value, label, desc }) => (
              <label
                key={value}
                htmlFor={`onb-pref-${value}`}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 8px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  id={`onb-pref-${value}`}
                  checked={featurePreferences.includes(value)}
                  onChange={() => togglePreference(value)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{label}</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "1px" }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <label htmlFor="onb-hide-identity" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Show my identity on reviews and contributions</div>
              <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px", lineHeight: "1.5" }}>
                When enabled, your name may appear on reviews, photos, and accessibility contributions. You can change this at any time in Settings.
              </div>
            </div>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <input
                type="checkbox"
                id="onb-hide-identity"
                checked={!hideIdentity}
                onChange={(e) => setHideIdentity(!e.target.checked)}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0, zIndex: 1 }}
              />
              <div aria-hidden="true" style={{ width: "44px", height: "24px", borderRadius: "12px", backgroundColor: !hideIdentity ? "#2563eb" : "#d1d5db", transition: "background-color 0.2s", display: "flex", alignItems: "center", padding: "2px" }}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#ffffff", transform: !hideIdentity ? "translateX(20px)" : "translateX(0)", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
              </div>
            </div>
          </label>
        </div>

        {error && (
          <p role="alert" style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={saving}
          style={{
            width: "100%", padding: "14px", backgroundColor: "#111827", color: "#fff",
            border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, minHeight: "48px",
          }}
        >
          {saving ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

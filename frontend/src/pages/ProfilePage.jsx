import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile } from "../services/api";
import { useDisplaySettings } from "../context/DisplaySettingsContext";

const DISABILITY_OPTIONS = [
  { value: "",               label: "Select disability type..." },
  { value: "Mobility",       label: "Mobility"       },
  { value: "Vision",         label: "Vision"         },
  { value: "Hearing",        label: "Hearing"        },
  { value: "Neurodivergent", label: "Neurodivergent" },
  { value: "Other",          label: "Other"          },
];

const FEATURE_OPTIONS = [
  { value: "wheelchair_accessible",        label: "Wheelchair Accessible",        desc: "Ramps or step-free access throughout" },
  { value: "accessible_parking",           label: "Accessible Parking",           desc: "Designated parking spaces close to entrance" },
  { value: "wide_entrances",               label: "Wide Entrances",               desc: "Doors wide enough for wheelchair access" },
  { value: "accessible_restrooms",         label: "Accessible Restrooms",         desc: "Wheelchair-accessible restroom facilities" },
  { value: "elevators",                    label: "Elevators",                    desc: "Accessible elevators for multi-floor buildings" },
  { value: "automatic_doors",              label: "Automatic Doors",              desc: "Hands-free entry and exit" },
  { value: "wheelchair_accessible_tables", label: "Wheelchair-Accessible Tables", desc: "Tables with adequate clearance for wheelchairs" },
  { value: "handrails_available",          label: "Handrails",                    desc: "Handrails on stairs, ramps, or walkways" },
];

function ToggleRow({ id, label, description, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f3f4f6", cursor: "pointer", gap: "16px" }}
    >
      <div>
        <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{label}</div>
        {description && (
          <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{description}</div>
        )}
      </div>
      {/* Toggle switch — native checkbox drives state; visual track is decorative */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", margin: 0, zIndex: 1 }}
        />
        <div
          aria-hidden="true"
          style={{
            width: "44px", height: "24px", borderRadius: "12px",
            backgroundColor: checked ? "#2563eb" : "#d1d5db",
            transition: "background-color 0.2s",
            display: "flex", alignItems: "center", padding: "2px",
          }}
        >
          <div style={{
            width: "20px", height: "20px", borderRadius: "50%",
            backgroundColor: "#ffffff",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          }} />
        </div>
      </div>
    </label>
  );
}

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { largerText, highContrast, toggleLargerText, toggleHighContrast } = useDisplaySettings();
  const [disabilityType,     setDisabilityType]     = useState("");
  const [featurePreferences, setFeaturePreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setDisabilityType(data.disabilityType || "");
        setFeaturePreferences(data.featurePreferences || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const togglePreference = (value) => {
    setFeaturePreferences((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateProfile({ disabilityType, featurePreferences });
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    backgroundColor: "#fff",
    border:          "1px solid #e5e7eb",
    borderRadius:    "12px",
    padding:         "20px",
    marginBottom:    "16px",
    boxShadow:       "0 1px 3px rgba(0,0,0,0.04)",
  };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: 0 }}>
            Profile
          </h1>
          {currentUser && (
            <button
              onClick={async () => { await logout(); navigate("/"); }}
              style={{ padding: "7px 14px", backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }}
            >
              Sign out
            </button>
          )}
        </div>

        {/* Section 1 — Account Info */}
        <div style={{ ...cardStyle, borderColor: "#e5e7eb" }}>
          <p style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Account</p>
          <p style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: "600", color: "#111827" }}>
            {currentUser?.displayName || currentUser?.email || "Contributor"}
          </p>
          {/* Section 3 — Contribution Stats */}
          <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Contributions</p>
          <div style={{ display: "flex", gap: "20px" }}>
            {[
              { icon: "📷", count: 0, label: "Photos"   },
              { icon: "📍", count: 0, label: "Features" },
              { icon: "💬", count: 0, label: "Reviews"  },
            ].map(({ icon, count, label }) => (
              <div key={label}>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>{icon} {count}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "1px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Display Settings — local-only, no save needed */}
        <div style={cardStyle}>
          <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Display Settings</p>
          <ToggleRow
            id="toggle-larger-text"
            label="Larger text"
            description="Increases font sizes across the app for easier reading"
            checked={largerText}
            onChange={toggleLargerText}
          />
          <ToggleRow
            id="toggle-high-contrast"
            label="High contrast"
            description="Boosts text and background contrast for better visibility"
            checked={highContrast}
            onChange={toggleHighContrast}
          />
        </div>

        {loading && <p style={{ color: "#6b7280" }}>Loading profile...</p>}

        {!loading && (
          <>
            {/* Section 2 — Accessibility Preferences */}
            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>Accessibility Needs</p>
              <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: "0 0 10px" }}>
                Primary accessibility need
              </h2>
              <select
                value={disabilityType}
                onChange={(e) => { setDisabilityType(e.target.value); setSaved(false); }}
                style={{
                  width:           "100%",
                  padding:         "10px 12px",
                  fontSize:        "14px",
                  border:          "1.5px solid #d1d5db",
                  borderRadius:    "8px",
                  outline:         "none",
                  color:           disabilityType ? "#111827" : "#9ca3af",
                  backgroundColor: "#f9fafb",
                  cursor:          "pointer",
                }}
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
                    htmlFor={`pref-${value}`}
                    style={{
                      display:      "flex",
                      alignItems:   "center",
                      gap:          "14px",
                      padding:      "12px 8px",
                      borderBottom: "1px solid #f3f4f6",
                      cursor:       "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`pref-${value}`}
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

            {error && (
              <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width:           "100%",
                padding:         "14px",
                backgroundColor: saved ? "#16a34a" : "#111827",
                color:           "#fff",
                border:          "none",
                borderRadius:    "10px",
                fontSize:        "15px",
                fontWeight:      "600",
                cursor:          saving ? "not-allowed" : "pointer",
                opacity:         saving ? 0.7 : 1,
                transition:      "background-color 0.2s",
              }}
            >
              {saved ? "✓ Profile saved" : saving ? "Saving..." : "Save Profile"}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
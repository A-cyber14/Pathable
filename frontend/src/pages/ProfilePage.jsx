import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getProfile, updateProfile } from "../services/api";

const DISABILITY_OPTIONS = [
  { value: "",               label: "Select disability type..." },
  { value: "Mobility",       label: "Mobility"       },
  { value: "Vision",         label: "Vision"         },
  { value: "Hearing",        label: "Hearing"        },
  { value: "Neurodivergent", label: "Neurodivergent" },
  { value: "Other",          label: "Other"          },
];

const FEATURE_OPTIONS = [
  { value: "accessible_parking",   label: "Accessible Parking",   desc: "Designated parking spaces close to entrance" },
  { value: "wide_entrances",       label: "Wide Entrances",       desc: "Doors wide enough for wheelchair access" },
  { value: "elevators",            label: "Elevators",            desc: "Accessible elevators for multi-floor buildings" },
  { value: "accessible_restrooms", label: "Accessible Restrooms", desc: "Wheelchair-accessible restroom facilities" },
  { value: "automatic_doors",      label: "Automatic Doors",      desc: "Hands-free entry and exit" },
];

export default function ProfilePage() {
  const { currentUser } = useAuth();
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
    border:          "1.5px solid #e5e7eb",
    borderRadius:    "14px",
    padding:         "24px",
    marginBottom:    "20px",
  };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ fontSize: "22px" }}>👤</span>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#111827", margin: 0 }}>
            Profile Settings
          </h1>
        </div>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
          Customize your experience based on your accessibility needs
        </p>

        <div style={{ ...cardStyle, backgroundColor: "#f8faff", borderColor: "#c7d7f8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "18px" }}>🧭</span>
                <span style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>Local Guide</span>
              </div>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#6b7280" }}>
                {currentUser?.displayName || currentUser?.email || "Contributor"}
              </p>
            </div>
            <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", fontWeight: "600", color: "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🏅</span> Level 1
            </div>
          </div>
          <div style={{ display: "flex", gap: "24px" }}>
            {[
              { icon: "📷", count: 0, label: "Photos Uploaded"    },
              { icon: "📍", count: 0, label: "Features Added"     },
              { icon: "💬", count: 0, label: "Locations Reviewed" },
            ].map(({ icon, count, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb" }}>{icon} {count}</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {loading && <p style={{ color: "#6b7280" }}>Loading profile...</p>}

        {!loading && (
          <>
            <div style={cardStyle}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px" }}>
                Physical Disability Type
              </h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 14px" }}>
                Select your primary mobility consideration
              </p>
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
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#111827", margin: "0 0 4px" }}>
                Feature Preferences
              </h2>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 16px" }}>
                Select features that are most important to you. These will be highlighted when searching for locations.
              </p>

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
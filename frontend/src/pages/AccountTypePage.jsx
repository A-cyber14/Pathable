import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/api";

// ---------------------------------------------------------------------------
// AccountTypePage
// Route: /account-type
// Shown once to new users immediately after their first sign-in.
// They pick Regular User or Business Account; we persist accountType and
// redirect them to the right place.
// ---------------------------------------------------------------------------

function PersonIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 22V12h6v10" />
      <path d="M3 9h18" />
    </svg>
  );
}

const OPTIONS = [
  {
    type:        "user",
    icon:        <PersonIcon />,
    title:       "Regular User",
    description: "Search places, bookmark locations, and contribute accessibility info",
    accent:      "#2563eb",
    accentBg:    "#eff6ff",
  },
  {
    type:        "business",
    icon:        <BuildingIcon />,
    title:       "Business Account",
    description: "Manage your business profile, respond to reviews, and view accessibility insights",
    accent:      "#7c3aed",
    accentBg:    "#f5f3ff",
  },
];

export default function AccountTypePage() {
  const { currentUser, refreshProfile } = useAuth();
  const navigate  = useNavigate();
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [hovered,  setHovered]  = useState(null);

  const handleSelect = async (type) => {
    if (saving) return;
    setSelected(type);
    setSaving(true);
    setError(null);

    try {
      await updateProfile({ accountType: type });
      await refreshProfile();

      if (type === "business") {
        navigate("/business-setup");
      } else {
        navigate("/");
      }
      // business-setup will navigate to /business-profile after linking
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setSelected(null);
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        minHeight:      "100vh",
        backgroundColor: "#f9fafb",
        fontFamily:     "sans-serif",
        padding:        "32px 24px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>♿</div>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
          How will you use Pathable?
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0, lineHeight: "1.5" }}>
          Tell us how you'll use the app so we can set up your experience.
        </p>
        {currentUser?.displayName && (
          <p style={{ fontSize: "13px", color: "#9ca3af", margin: "8px 0 0" }}>
            Signed in as {currentUser.displayName}
          </p>
        )}
      </div>

      {/* Option cards */}
      <div
        style={{
          display:   "flex",
          gap:       "16px",
          width:     "100%",
          maxWidth:  "640px",
          flexWrap:  "wrap",
          justifyContent: "center",
        }}
      >
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.type;
          const isHovered  = hovered  === opt.type && !saving;

          return (
            <button
              key={opt.type}
              onClick={() => handleSelect(opt.type)}
              onMouseEnter={() => setHovered(opt.type)}
              onMouseLeave={() => setHovered(null)}
              disabled={saving}
              style={{
                flex:            "1 1 240px",
                maxWidth:        "280px",
                display:         "flex",
                flexDirection:   "column",
                alignItems:      "center",
                textAlign:       "center",
                padding:         "32px 24px",
                backgroundColor: isSelected ? opt.accentBg : isHovered ? "#fafafa" : "#fff",
                border:          `2px solid ${isSelected || isHovered ? opt.accent : "#e5e7eb"}`,
                borderRadius:    "16px",
                boxShadow:       isSelected || isHovered
                  ? `0 4px 20px rgba(0,0,0,0.1)`
                  : "0 1px 4px rgba(0,0,0,0.05)",
                cursor:          saving ? "not-allowed" : "pointer",
                transition:      "border-color 0.15s, box-shadow 0.15s, background-color 0.15s",
                outline:         "none",
                opacity:         saving && selected !== opt.type ? 0.5 : 1,
              }}
            >
              {/* Icon circle */}
              <div
                style={{
                  width:           "56px",
                  height:          "56px",
                  borderRadius:    "50%",
                  backgroundColor: isSelected || isHovered ? opt.accentBg : "#f3f4f6",
                  border:          `1.5px solid ${isSelected || isHovered ? opt.accent : "#e5e7eb"}`,
                  display:         "flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  color:           isSelected || isHovered ? opt.accent : "#6b7280",
                  marginBottom:    "16px",
                  transition:      "all 0.15s",
                }}
              >
                {opt.icon}
              </div>

              <div
                style={{
                  fontSize:   "16px",
                  fontWeight: "700",
                  color:      isSelected || isHovered ? opt.accent : "#111827",
                  marginBottom: "8px",
                  transition: "color 0.15s",
                }}
              >
                {opt.title}
              </div>

              <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.5" }}>
                {opt.description}
              </div>

              {isSelected && saving && (
                <div style={{ marginTop: "14px", fontSize: "12px", color: opt.accent, fontWeight: "600" }}>
                  Setting up…
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p style={{ marginTop: "20px", fontSize: "13px", color: "#dc2626", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}

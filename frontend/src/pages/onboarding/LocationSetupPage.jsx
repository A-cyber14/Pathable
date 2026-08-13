import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { updateProfile } from "../../services/api";
import LocationPicker from "../../components/LocationPicker";

// ---------------------------------------------------------------------------
// LocationSetupPage
// Route: /onboarding/location
// Third step of personal onboarding — after accessibility preferences,
// before the guided tutorial. Never triggers the browser permission prompt
// automatically; only "Use my location" does.
// ---------------------------------------------------------------------------

export default function LocationSetupPage() {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const advance = async (extra) => {
    setSaving(true);
    try {
      await updateProfile({ ...extra, onboardingStep: "tutorial" });
      await refreshProfile();
      navigate("/onboarding/tutorial");
    } catch {
      showToast("Couldn't save changes", "error");
      setSaving(false);
    }
  };

  const handleSave = ({ lat, lng, zip, source, anchorEl }) => {
    showToast("Location saved", "success", anchorEl);
    advance({ locationLat: lat, locationLng: lng, locationZip: zip, locationSource: source });
  };

  const handleSkip = () => advance({});

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "440px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>
          Where should we look for places near you?
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px" }}>
          You can change this anytime in Settings.
        </p>

        <div style={{
          backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px",
          padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <LocationPicker onSave={handleSave} onSkip={handleSkip} saving={saving} />
        </div>
      </div>
    </div>
  );
}

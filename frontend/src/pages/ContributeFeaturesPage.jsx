import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBusinesses, submitFeatures } from "../services/api";

// ---------------------------------------------------------------------------
// ContributeFeaturesPage
// Route: /contribute/features (protected)
// ---------------------------------------------------------------------------

export default function ContributeFeaturesPage() {
  const navigate = useNavigate();
  const [businesses,  setBusinesses]  = useState([]);
  const [businessId,  setBusinessId]  = useState("");
  const [form, setForm] = useState({
    wheelchairAccessible:       false,
    accessibleParking:          false,
    doorWidth:                  "",
    accessibleRestroom:         false,
    wheelchairAccessibleTables: false,
    handrailsAvailable:         false,
    notes:                      "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    getBusinesses().then(setBusinesses).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setSuccess(false);
  };

  const handleSubmit = async () => {
    if (!businessId) return setError("Please select a business.");
    setError(null);
    setSubmitting(true);
    try {
      await submitFeatures(businessId, {
        ...form,
        doorWidth: form.doorWidth ? parseInt(form.doorWidth, 10) : null,
      });
      setSuccess(true);
      setForm({ wheelchairAccessible: false, accessibleParking: false, doorWidth: "", accessibleRestroom: false, wheelchairAccessibleTables: false, handrailsAvailable: false, notes: "" });
      setBusinessId("");
    } catch (err) {
      setError(err.message || "Submission failed.");
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
  const checkRowStyle = {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 0", borderBottom: "1px solid #f3f4f6",
  };

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
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
          Share what accessibility features this location has.
        </p>

        {/* Success message */}
        {success && (
          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#15803d" }}>
            ✓ Features submitted for review. Thank you for contributing!
          </div>
        )}

        {/* Form */}
        <div style={{ backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "4px" }}>

          {/* Business selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
            <label style={labelStyle}>Business</label>
            <select
              value={businessId}
              onChange={(e) => { setBusinessId(e.target.value); setSuccess(false); }}
              style={{ ...inputStyle, backgroundColor: "#f9fafb", cursor: "pointer" }}
            >
              <option value="">Select a business...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Wheelchair accessible */}
          <div style={checkRowStyle}>
            <input type="checkbox" id="wheelchairAccessible" name="wheelchairAccessible"
              checked={form.wheelchairAccessible} onChange={handleChange}
              style={{ width: "16px", height: "16px", cursor: "pointer" }} />
            <div>
              <label htmlFor="wheelchairAccessible" style={{ ...labelStyle, cursor: "pointer" }}>Wheelchair Accessible</label>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Ramps or step-free access throughout</p>
            </div>
          </div>

          {/* Accessible parking */}
          <div style={checkRowStyle}>
            <input type="checkbox" id="accessibleParking" name="accessibleParking"
              checked={form.accessibleParking} onChange={handleChange}
              style={{ width: "16px", height: "16px", cursor: "pointer" }} />
            <div>
              <label htmlFor="accessibleParking" style={{ ...labelStyle, cursor: "pointer" }}>Accessible Parking</label>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Designated spaces close to entrance</p>
            </div>
          </div>

          {/* Accessible restroom */}
          <div style={checkRowStyle}>
            <input type="checkbox" id="accessibleRestroom" name="accessibleRestroom"
              checked={form.accessibleRestroom} onChange={handleChange}
              style={{ width: "16px", height: "16px", cursor: "pointer" }} />
            <div>
              <label htmlFor="accessibleRestroom" style={{ ...labelStyle, cursor: "pointer" }}>Accessible Restroom</label>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Wheelchair-accessible restroom available</p>
            </div>
          </div>

          {/* Wheelchair-accessible tables */}
          <div style={checkRowStyle}>
            <input type="checkbox" id="wheelchairAccessibleTables" name="wheelchairAccessibleTables"
              checked={form.wheelchairAccessibleTables} onChange={handleChange}
              style={{ width: "16px", height: "16px", cursor: "pointer" }} />
            <div>
              <label htmlFor="wheelchairAccessibleTables" style={{ ...labelStyle, cursor: "pointer" }}>Wheelchair-accessible tables</label>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Tables with adequate clearance for wheelchairs</p>
            </div>
          </div>

          {/* Handrails available */}
          <div style={{ ...checkRowStyle, borderBottom: "none" }}>
            <input type="checkbox" id="handrailsAvailable" name="handrailsAvailable"
              checked={form.handrailsAvailable} onChange={handleChange}
              style={{ width: "16px", height: "16px", cursor: "pointer" }} />
            <div>
              <label htmlFor="handrailsAvailable" style={{ ...labelStyle, cursor: "pointer" }}>Handrails available</label>
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Handrails on stairs, ramps, or walkways</p>
            </div>
          </div>

          {/* Door width */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "12px" }}>
            <label style={labelStyle}>Door Width (inches)</label>
            <input type="number" name="doorWidth" placeholder="e.g. 36"
              value={form.doorWidth} onChange={handleChange} min="0" style={inputStyle} />
          </div>

          {/* Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
            <label style={labelStyle}>Additional Notes</label>
            <textarea name="notes" placeholder="Any other accessibility details worth mentioning..."
              value={form.notes} onChange={handleChange} rows={4}
              style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {error && <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#dc2626" }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "12px", backgroundColor: "#111827", color: "#fff",
              border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1, marginTop: "12px",
            }}
          >
            {submitting ? "Submitting..." : "Submit Features"}
          </button>
        </div>

      </div>
    </div>
  );
}

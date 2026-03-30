import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getBusinesses, submitPhoto } from "../services/api";

// ---------------------------------------------------------------------------
// ContributePhotosPage
// Route: /contribute/photos (protected)
// ---------------------------------------------------------------------------

export default function ContributePhotosPage() {
  const navigate = useNavigate();
  const [businesses,   setBusinesses]   = useState([]);
  const [businessId,   setBusinessId]   = useState("");
  const [photoUrl,     setPhotoUrl]     = useState("");
  const [caption,      setCaption]      = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    getBusinesses().then(setBusinesses).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!businessId) return setError("Please select a business.");
    if (!photoUrl)   return setError("Please enter a photo URL.");
    setError(null);
    setSubmitting(true);
    try {
      await submitPhoto(businessId, { photoUrl, caption });
      setSuccess(true);
      setPhotoUrl("");
      setCaption("");
      setBusinessId("");
    } catch (err) {
      setError(err.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width:        "100%",
    padding:      "10px 12px",
    fontSize:     "14px",
    border:       "1.5px solid #d1d5db",
    borderRadius: "8px",
    outline:      "none",
    boxSizing:    "border-box",
    color:        "#111827",
  };

  const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#374151" };

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
          Add Photos
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
          Upload photos to help others understand accessibility conditions.
        </p>

        {/* Success message */}
        {success && (
          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#15803d" }}>
            ✓ Photo submitted for review. Thank you for contributing!
          </div>
        )}

        {/* Form */}
        <div style={{ backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Business selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Photo URL</label>
            <input
              type="text"
              placeholder="https://example.com/photo.jpg"
              value={photoUrl}
              onChange={(e) => { setPhotoUrl(e.target.value); setSuccess(false); }}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Caption</label>
            <input
              type="text"
              placeholder="e.g. Accessible entrance on north side"
              value={caption}
              onChange={(e) => { setCaption(e.target.value); setSuccess(false); }}
              style={inputStyle}
            />
          </div>

          {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding:         "12px",
              backgroundColor: "#111827",
              color:           "#fff",
              border:          "none",
              borderRadius:    "8px",
              fontSize:        "14px",
              fontWeight:      "600",
              cursor:          submitting ? "not-allowed" : "pointer",
              opacity:         submitting ? 0.7 : 1,
              marginTop:       "4px",
            }}
          >
            {submitting ? "Submitting..." : "Submit Photo"}
          </button>
        </div>

      </div>
    </div>
  );
}

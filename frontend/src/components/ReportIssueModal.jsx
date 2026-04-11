import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { submitIssueReport } from "../services/api";

const FEATURES = [
  { value: "accessible_parking",          label: "♿ Accessible parking" },
  { value: "entrance",                    label: "🚪 Entrance" },
  { value: "ramp",                        label: "🛤 Ramp" },
  { value: "accessible_restrooms",        label: "🚻 Bathroom / restroom" },
  { value: "seating",                     label: "🪑 Seating" },
  { value: "handrails",                   label: "🪜 Handrails" },
  { value: "wheelchair_accessible_tables",label: "🍽 Wheelchair-accessible tables" },
  { value: "elevator",                    label: "🛗 Elevator" },
  { value: "pathway",                     label: "🚶 Pathway / walkway" },
  { value: "other",                       label: "📍 Other" },
];

const ISSUE_TYPES = [
  { value: "inaccessible",     label: "Inaccessible" },
  { value: "missing",          label: "Missing / does not exist" },
  { value: "blocked",          label: "Blocked / obstructed" },
  { value: "incorrect_info",   label: "Incorrect information" },
  { value: "outdated_info",    label: "Outdated information" },
  { value: "safety_concern",   label: "Safety concern" },
];

const ADDITIONAL_TAGS = [
  { value: "temporary",        label: "Temporary issue" },
  { value: "permanent",        label: "Permanent issue" },
  { value: "staff_unhelpful",  label: "Staff unaware / unhelpful" },
  { value: "photo_mismatch",   label: "Photo does not match reality" },
];

const MAX_PHOTOS = 3;

// ---------------------------------------------------------------------------
// ReportIssueModal
// Props:
//   businessId     — string, required
//   initialFeature — optional feature key to pre-select
//   onClose        — callback to dismiss modal
//   onSuccess      — optional callback after successful submit
// ---------------------------------------------------------------------------
export default function ReportIssueModal({ businessId, initialFeature, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const navigate        = useNavigate();

  const [feature,         setFeature]         = useState(initialFeature || "");
  const [issueType,       setIssueType]       = useState("");
  const [tags,            setTags]            = useState([]);
  const [description,     setDescription]     = useState("");
  const [photoFiles,      setPhotoFiles]      = useState([]); // [{ id, file, preview }]
  const [uploading,       setUploading]       = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState([]); // per-photo 0–100
  const [error,           setError]           = useState(null);
  const [submitted,       setSubmitted]       = useState(false);

  const fileInputRef = useRef(null);

  const descTrimmed = description.trim();
  const valid = feature && issueType && descTrimmed.length >= 10 && photoFiles.length >= 1;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleTag = (val) =>
    setTags((prev) => prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const toAdd = files.slice(0, MAX_PHOTOS - photoFiles.length);
    setPhotoFiles((prev) => [
      ...prev,
      ...toAdd.map((file) => ({
        id:      Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);
    e.target.value = "";
  };

  const removePhoto = (id) => {
    setPhotoFiles((prev) => {
      const entry = prev.find((p) => p.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((p) => p.id !== id);
    });
  };

  const uploadPhoto = (entry, index) =>
    new Promise((resolve, reject) => {
      const ext      = entry.file.name.split(".").pop() || "jpg";
      const path     = `issue-reports/${businessId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storeRef = ref(storage, path);
      const task     = uploadBytesResumable(storeRef, entry.file);

      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress((prev) => {
            const next = [...prev];
            next[index] = pct;
            return next;
          });
        },
        reject,
        () => getDownloadURL(task.snapshot.ref).then(resolve).catch(reject),
      );
    });

  const handleSubmit = async () => {
    if (!valid || uploading) return;
    setUploading(true);
    setError(null);
    setUploadProgress(photoFiles.map(() => 0));

    try {
      const photoUrls = await Promise.all(photoFiles.map(uploadPhoto));
      await submitIssueReport(businessId, {
        feature,
        issue_type:  issueType,
        tags,
        description: descTrimmed,
        photo_urls:  photoUrls,
      });
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Auth gate
  // ---------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "36px 32px", maxWidth: "360px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        >
          <p style={{ margin: "0 0 6px", fontSize: "28px" }}>⚠️</p>
          <h2 style={{ margin: "0 0 10px", fontSize: "17px", fontWeight: "700", color: "#111827" }}>Sign in required</h2>
          <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
            You need to be signed in to report an issue.
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{ width: "100%", padding: "12px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Success state
  // ---------------------------------------------------------------------------
  if (submitted) {
    return (
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "44px 32px", maxWidth: "360px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        >
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", fontSize: "24px" }}>✓</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: "700", color: "#111827" }}>Report submitted</h2>
          <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280", lineHeight: "1.6" }}>
            Thanks. Your report has been submitted for review.
          </p>
          <button
            onClick={onClose}
            style={{ width: "100%", padding: "12px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer" }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Shared input style
  // ---------------------------------------------------------------------------
  const inp = {
    padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px",
    fontSize: "14px", color: "#111827", backgroundColor: "#fff",
    width: "100%", boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600",
    color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px",
  };

  // ---------------------------------------------------------------------------
  // Main form
  // ---------------------------------------------------------------------------
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "480px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}
      >

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>Report an Issue</h2>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#9ca3af" }}>Help keep accessibility info accurate</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "2px", marginTop: "2px" }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "22px" }}>

          {/* Feature selector */}
          <div>
            <label style={labelStyle}>
              Accessibility Feature <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              style={{ ...inp, cursor: "pointer" }}
            >
              <option value="">Select a feature…</option>
              {FEATURES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Primary issue type */}
          <div>
            <label style={labelStyle}>
              Issue Type <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {ISSUE_TYPES.map((it) => {
                const selected = issueType === it.value;
                return (
                  <label
                    key={it.value}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px", cursor: "pointer",
                      padding: "9px 12px", borderRadius: "8px",
                      border: `1px solid ${selected ? "#bfdbfe" : "#e5e7eb"}`,
                      backgroundColor: selected ? "#eff6ff" : "#fff",
                      transition: "all 0.1s",
                    }}
                  >
                    <input
                      type="radio"
                      name="issueType"
                      value={it.value}
                      checked={selected}
                      onChange={() => setIssueType(it.value)}
                      style={{ width: "15px", height: "15px", cursor: "pointer", accentColor: "#2563eb" }}
                    />
                    <span style={{ fontSize: "14px", color: "#374151", fontWeight: selected ? "600" : "400" }}>
                      {it.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Additional tags */}
          <div>
            <label style={labelStyle}>
              Additional Tags{" "}
              <span style={{ fontSize: "11px", fontWeight: "400", color: "#9ca3af", textTransform: "none" }}>
                (optional)
              </span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {ADDITIONAL_TAGS.map((t) => {
                const selected = tags.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTag(t.value)}
                    style={{
                      padding: "6px 12px", borderRadius: "999px", fontSize: "13px", fontWeight: "500",
                      border: `1px solid ${selected ? "#bfdbfe" : "#e5e7eb"}`,
                      backgroundColor: selected ? "#eff6ff" : "#fff",
                      color: selected ? "#2563eb" : "#6b7280",
                      cursor: "pointer", transition: "all 0.1s",
                    }}
                  >
                    {selected && <span style={{ marginRight: "4px" }}>✓</span>}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>
              Describe what is wrong <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly explain what is wrong and how it affects accessibility."
              rows={4}
              style={{
                ...inp,
                border: `1px solid ${descTrimmed.length > 0 && descTrimmed.length < 10 ? "#fca5a5" : "#d1d5db"}`,
                resize: "vertical",
                fontFamily: "sans-serif",
              }}
            />
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: descTrimmed.length < 10 ? "#9ca3af" : "#16a34a" }}>
              {descTrimmed.length} / 10 minimum characters
            </p>
          </div>

          {/* Photo upload */}
          <div>
            <label style={labelStyle}>
              Evidence Photos{" "}
              <span style={{ color: "#dc2626" }}>*</span>
              <span style={{ fontSize: "11px", fontWeight: "400", color: "#9ca3af", textTransform: "none", marginLeft: "6px" }}>
                1–3 images required
              </span>
            </label>

            {photoFiles.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                {photoFiles.map((entry, idx) => (
                  <div key={entry.id} style={{ position: "relative", width: "86px", height: "86px" }}>
                    <img
                      src={entry.preview}
                      alt={`Photo ${idx + 1}`}
                      style={{ width: "86px", height: "86px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e5e7eb", display: "block" }}
                    />
                    {uploading && uploadProgress[idx] !== undefined && (
                      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#fff", fontSize: "12px", fontWeight: "700" }}>
                          {uploadProgress[idx]}%
                        </span>
                      </div>
                    )}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removePhoto(entry.id)}
                        style={{
                          position: "absolute", top: "3px", right: "3px",
                          width: "20px", height: "20px", borderRadius: "50%",
                          backgroundColor: "rgba(0,0,0,0.6)", border: "none",
                          color: "#fff", fontSize: "11px", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {photoFiles.length < MAX_PHOTOS && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.backgroundColor = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.backgroundColor = "#f9fafb"; e.currentTarget.style.color = "#6b7280"; }}
                  style={{
                    width: "100%", padding: "12px",
                    border: "1.5px dashed #d1d5db", borderRadius: "8px",
                    backgroundColor: "#f9fafb", color: "#6b7280",
                    fontSize: "14px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    transition: "border-color 0.15s, background-color 0.15s, color 0.15s",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📷</span>
                  {photoFiles.length === 0 ? "Add a photo" : "Add another photo"}
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    ({MAX_PHOTOS - photoFiles.length} remaining)
                  </span>
                </button>
              </>
            )}

            {photoFiles.length === 0 && (
              <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                At least 1 photo is required as evidence.
              </p>
            )}
          </div>

          {error && (
            <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            disabled={!valid || uploading}
            style={{
              width: "100%", padding: "13px",
              backgroundColor: !valid || uploading ? "#d1d5db" : "#111827",
              color: !valid || uploading ? "#9ca3af" : "#fff",
              border: "none", borderRadius: "10px",
              fontSize: "15px", fontWeight: "600",
              cursor: !valid || uploading ? "default" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            {uploading ? "Uploading & Submitting…" : "Submit Report"}
          </button>
        </div>

      </div>
    </div>
  );
}

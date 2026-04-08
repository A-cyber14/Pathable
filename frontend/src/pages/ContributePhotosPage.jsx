import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getBusinesses, submitPhoto } from "../services/api";
import { PHOTO_CATEGORIES } from "../components/PhotoGallery";
import { storage } from "../firebase";

// Maps display category to the folder slug used in Firebase Storage paths
const CATEGORY_SLUG = {
  "Entrance":          "entrance",
  "Bathroom":          "bathroom",
  "Parking Lot":       "parking",
  "Interior":          "interior",
  "Seating / Service": "seating",
  "Other":             "other",
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ACCEPTED_TYPES       = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// ContributePhotosPage
// Route: /contribute/photos (protected)
//
// Upload flow:
//   1. User picks file via drag-drop or file picker
//   2. Preview shown locally (no upload yet)
//   3. On submit → upload to Firebase Storage under category subfolder
//   4. Get download URL → send to FastAPI backend
//   5. Backend writes to contributions (moderation) + photos subcollection (display)
// ---------------------------------------------------------------------------

export default function ContributePhotosPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [businesses,   setBusinesses]   = useState([]);
  const [businessId,   setBusinessId]   = useState("");
  const [category,     setCategory]     = useState("entrance");
  const [caption,      setCaption]      = useState("");
  const [file,         setFile]         = useState(null);
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadPct,    setUploadPct]    = useState(0);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    getBusinesses().then(setBusinesses).catch(() => {});
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Only JPG, PNG, WebP images or MP4, WebM, MOV videos are accepted.");
      return;
    }

    const isVideo  = ACCEPTED_VIDEO_TYPES.includes(f.type);
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const maxLabel = isVideo ? "100MB" : "10MB";

    if (f.size > maxBytes) {
      setError(`File is too large. Maximum size is ${maxLabel}.`);
      return;
    }

    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setSuccess(false);
    setError(null);
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setCaption("");
    setBusinessId("");
    setCategory("entrance");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!businessId) return setError("Please select a business.");
    if (!file)       return setError("Please choose a photo or video to upload.");
    setError(null);
    setUploading(true);
    setUploadPct(0);

    try {
      const isVideo      = ACCEPTED_VIDEO_TYPES.includes(file.type);
      const mediaType    = isVideo ? "video" : "image";
      const ext          = file.name.split(".").pop();
      const categorySlug = CATEGORY_SLUG[category] || category || "other";
      const storagePath  = `business-photos/${businessId}/${categorySlug}/${generateId()}.${ext}`;
      const storageRef   = ref(storage, storagePath);

      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on(
          "state_changed",
          (snap) => setUploadPct(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });

      const downloadUrl = await getDownloadURL(storageRef);

      await submitPhoto(businessId, { photoUrl: downloadUrl, caption, category, mediaType });

      setSuccess(true);
      reset();
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const isVideo = file && ACCEPTED_VIDEO_TYPES.includes(file.type);

  // ── styles ──────────────────────────────────────────────────────────────

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

        {/* Back */}
        <button
          onClick={() => navigate("/contribute")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "14px", padding: "0", marginBottom: "20px" }}
        >
          ← Back to Contribute
        </button>

        <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
          Add Photos & Videos
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
          Upload photos or videos to help others understand accessibility conditions.
        </p>

        {success && (
          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#15803d" }}>
            ✓ Media uploaded and is now visible on the business page.
          </div>
        )}

        <div style={{ backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Business */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Business</label>
            <select
              value={businessId}
              onChange={(e) => { setBusinessId(e.target.value); setSuccess(false); }}
              style={{ ...inputStyle, backgroundColor: "#f9fafb", cursor: "pointer" }}
            >
              <option value="">Select a business…</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PHOTO_CATEGORIES.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    gap:             "6px",
                    padding:         "7px 14px",
                    border:          `1.5px solid ${category === key ? "#2563eb" : "#d1d5db"}`,
                    borderRadius:    "8px",
                    backgroundColor: category === key ? "#eff6ff" : "#fff",
                    color:           category === key ? "#1d4ed8" : "#374151",
                    fontSize:        "13px",
                    fontWeight:      category === key ? "600" : "500",
                    cursor:          "pointer",
                    transition:      "all 0.12s",
                  }}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* File picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Photo or Video</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border:          "2px dashed #d1d5db",
                borderRadius:    "10px",
                padding:         "20px",
                textAlign:       "center",
                cursor:          "pointer",
                backgroundColor: "#f9fafb",
                transition:      "border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563eb"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; }}
            >
              {previewUrl ? (
                isVideo ? (
                  <video
                    src={previewUrl}
                    controls
                    style={{ maxHeight: "140px", maxWidth: "100%", borderRadius: "8px" }}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ maxHeight: "140px", maxWidth: "100%", borderRadius: "8px", objectFit: "cover" }}
                  />
                )
              ) : (
                <>
                  <div style={{ fontSize: "28px", marginBottom: "6px" }}>📁</div>
                  <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                    Click to choose a photo or video
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                    Images: JPG, PNG, WebP (max 10MB) · Videos: MP4, WebM, MOV (max 100MB)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>
            {file && (
              <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
                {isVideo ? "🎬 " : "🖼 "}{file.name} ({(file.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {/* Caption */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Caption <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Accessible entrance on north side"
              value={caption}
              onChange={(e) => { setCaption(e.target.value); setSuccess(false); }}
              style={inputStyle}
            />
          </div>

          {/* Upload progress */}
          {uploading && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                <span>Uploading…</span>
                <span>{uploadPct}%</span>
              </div>
              <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px" }}>
                <div
                  style={{
                    width:           `${uploadPct}%`,
                    backgroundColor: "#2563eb",
                    height:          "100%",
                    borderRadius:    "4px",
                    transition:      "width 0.2s",
                  }}
                />
              </div>
            </div>
          )}

          {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={uploading}
            style={{
              padding:         "12px",
              backgroundColor: "#111827",
              color:           "#fff",
              border:          "none",
              borderRadius:    "8px",
              fontSize:        "14px",
              fontWeight:      "600",
              cursor:          uploading ? "not-allowed" : "pointer",
              opacity:         uploading ? 0.7 : 1,
              marginTop:       "4px",
            }}
          >
            {uploading ? `Uploading… ${uploadPct}%` : "Submit"}
          </button>
        </div>

      </div>
    </div>
  );
}

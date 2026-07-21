import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase";
import { getDashboardBusiness, submitPhoto, updateProfile } from "../../services/api";
import { PHOTO_CATEGORIES } from "../../components/PhotoGallery";
import DragDropZone from "../../components/DragDropZone";

// ---------------------------------------------------------------------------
// BusinessPhotosPage
// Route: /business-setup/photos
// Optional — always skippable. Reuses the same Firebase Storage upload +
// submitPhoto pattern as ContributePhotosPage. The backend enforces the
// plan's photo cap for the owner's own uploads (see routers/businesses.py).
// ---------------------------------------------------------------------------

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function BusinessPhotosPage() {
  const navigate = useNavigate();

  const [businessId, setBusinessId] = useState(null);
  const [category,   setCategory]   = useState("entrance");
  const [file,        setFile]        = useState(null);
  const [previewUrl,  setPreviewUrl]  = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    getDashboardBusiness()
      .then((biz) => setBusinessId(biz.id))
      .catch(() => setError("Failed to load your business."))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async () => {
    if (!file || !businessId || uploading) return;
    setUploading(true);
    setError(null);
    setUploadPct(0);
    try {
      const isVideo   = file.type.startsWith("video/");
      const mediaType = isVideo ? "video" : "image";
      const ext       = file.name.split(".").pop();
      const storagePath = `business-photos/${businessId}/${category}/${generateId()}.${ext}`;
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
      await submitPhoto(businessId, { photoUrl: downloadUrl, category, mediaType });

      setUploadedCount((n) => n + 1);
      setFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const finish = async () => {
    try { await updateProfile({ onboardingStep: "business-review" }); } catch { /* non-blocking */ }
    navigate("/business-setup/review");
  };

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }} />;

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 20px 60px" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>Add photos</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.5" }}>
          Photos help visitors understand what to expect before they arrive. This step is optional — you can always add more later from your dashboard.
        </p>

        <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "22px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Category</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PHOTO_CATEGORIES.map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={category === key}
                  onClick={() => setCategory(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px",
                    border: `1.5px solid ${category === key ? "#2563eb" : "#d1d5db"}`, borderRadius: "8px",
                    backgroundColor: category === key ? "#eff6ff" : "#fff",
                    color: category === key ? "#1d4ed8" : "#374151",
                    fontSize: "13px", fontWeight: category === key ? "600" : "500", cursor: "pointer",
                  }}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {previewUrl ? (
            <div style={{ textAlign: "center" }}>
              {file?.type.startsWith("video/") ? (
                <video src={previewUrl} controls style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "10px" }} />
              ) : (
                <img src={previewUrl} alt="Selected preview" style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "10px", objectFit: "cover" }} />
              )}
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>{file.name}</p>
            </div>
          ) : (
            <DragDropZone
              onFileSelected={(f) => { setFile(f); setPreviewUrl(URL.createObjectURL(f)); setError(null); }}
              disabled={uploading}
            />
          )}

          {uploading && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                <span>Uploading…</span><span>{uploadPct}%</span>
              </div>
              <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px" }}>
                <div style={{ width: `${uploadPct}%`, backgroundColor: "#2563eb", height: "100%", borderRadius: "4px", transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          {error && <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "10px 0 0" }}>{error}</p>}

          {file && !uploading && (
            <button
              onClick={handleUpload}
              style={{ width: "100%", marginTop: "14px", padding: "12px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
            >
              Upload photo
            </button>
          )}

          {uploadedCount > 0 && (
            <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#16a34a", fontWeight: "600" }}>
              ✓ {uploadedCount} photo{uploadedCount !== 1 ? "s" : ""} uploaded
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "14px 18px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            ← Back
          </button>
          <button
            onClick={finish}
            style={{ flex: 1, padding: "14px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #e5e7eb", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer", minHeight: "48px" }}
          >
            Skip for now
          </button>
          {uploadedCount > 0 && (
            <button
              onClick={finish}
              style={{ flex: 1, padding: "14px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer", minHeight: "48px" }}
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

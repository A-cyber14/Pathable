import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, auth }       from "../firebase";
import { getBusinesses, submitPhoto } from "../services/api";
import DragDropZone            from "../components/DragDropZone";
import ImagePreview            from "../components/ImagePreview";

// Random ID so filenames never collide in Storage
function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const CATEGORIES = [
  "Entrance",
  "Bathroom",
  "Parking Lot",
  "Interior",
  "Seating / Service",
  "Other",
];

// ---------------------------------------------------------------------------
// ContributePhotosPage
// Route: /contribute/photos (protected)
//
// Upload flow:
//   1. User picks file via drag-drop or file picker
//   2. Preview shown locally (no upload yet)
//   3. On submit → upload to Firebase Storage
//   4. Get download URL → send to FastAPI backend
//   5. Backend stores metadata in Firestore
// ---------------------------------------------------------------------------
export default function ContributePhotosPage() {
  const navigate = useNavigate();

  // Form fields
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState("");
  const [category,   setCategory]   = useState("");
  const [caption,    setCaption]    = useState("");
  const [file,       setFile]       = useState(null);  // File object

  // UI state
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);     // 0–100
  const [success,    setSuccess]    = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    getBusinesses().then(setBusinesses).catch(() => {});
  }, []);

  function resetForm() {
    setFile(null);
    setCaption("");
    setCategory("");
    setBusinessId("");
    setProgress(0);
    setError(null);
  }

  const handleSubmit = async () => {
    if (!businessId) return setError("Please select a business.");
    if (!category)   return setError("Please select a photo category.");
    if (!file)       return setError("Please select an image to upload.");

    setError(null);
    setUploading(true);
    setSuccess(false);

    try {
      // Step 1 — Upload file to Firebase Storage
      const ext         = file.name.split(".").pop();
      const storagePath = `business-photos/${businessId}/${generateId()}.${ext}`;
      const storageRef  = ref(storage, storagePath);
      const uploadTask  = uploadBytesResumable(storageRef, file);

      // Wait for upload, track progress
      const downloadUrl = await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setProgress(pct);
          },
          (err) => reject(new Error("Upload failed: " + err.message)),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // Step 2 — Send URL + metadata to FastAPI
      await submitPhoto(businessId, {
        photoUrl:   downloadUrl,
        category,
        caption,
        uploadedBy: auth.currentUser?.uid || "anonymous",
      });

      setSuccess(true);
      resetForm();

    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const inputStyle = {
    width:           "100%",
    padding:         "10px 12px",
    fontSize:        "14px",
    border:          "1.5px solid #d1d5db",
    borderRadius:    "8px",
    outline:         "none",
    boxSizing:       "border-box",
    color:           "#111827",
    backgroundColor: "#f9fafb",
  };
  const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#374151" };

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        <button
          onClick={() => navigate("/contribute")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563eb", fontSize: "14px", padding: 0, marginBottom: "20px" }}
        >
          ← Back to Contribute
        </button>

        <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>
          Add Photos
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
          Upload photos to help others understand accessibility conditions.
        </p>

        {/* Success */}
        {success && (
          <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#15803d" }}>
            ✓ Photo uploaded and submitted for review. Thank you for contributing!
          </div>
        )}

        <div style={{ backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Business */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Business</label>
            <select
              value={businessId}
              onChange={(e) => { setBusinessId(e.target.value); setSuccess(false); }}
              style={{ ...inputStyle, cursor: "pointer" }}
              disabled={uploading}
            >
              <option value="">Select a business...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Photo Category</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSuccess(false); }}
              style={{ ...inputStyle, cursor: "pointer" }}
              disabled={uploading}
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Drag & drop / preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Photo</label>
            {!file ? (
              <DragDropZone
                onFileSelected={(f) => { setFile(f); setSuccess(false); setError(null); }}
                disabled={uploading}
              />
            ) : (
              <ImagePreview file={file} onRemove={() => { setFile(null); setProgress(0); }} />
            )}
          </div>

          {/* Caption */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>
              Caption <span style={{ fontWeight: "400", color: "#9ca3af" }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Accessible entrance on north side"
              value={caption}
              onChange={(e) => { setCaption(e.target.value); setSuccess(false); }}
              style={inputStyle}
              disabled={uploading}
            />
          </div>

          {/* Progress bar */}
          {uploading && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "#374151" }}>Uploading to Firebase...</span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#2563eb" }}>{progress}%</span>
              </div>
              <div style={{ height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#2563eb", borderRadius: "999px", transition: "width 0.2s ease" }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading || !file}
            style={{
              padding:         "12px",
              backgroundColor: uploading ? "#6b7280" : "#111827",
              color:           "#fff",
              border:          "none",
              borderRadius:    "8px",
              fontSize:        "14px",
              fontWeight:      "600",
              cursor:          uploading || !file ? "not-allowed" : "pointer",
              opacity:         !file && !uploading ? 0.6 : 1,
              marginTop:       "4px",
            }}
          >
            {uploading ? `Uploading... ${progress}%` : "Upload Photo"}
          </button>

        </div>
      </div>
    </div>
  );
}

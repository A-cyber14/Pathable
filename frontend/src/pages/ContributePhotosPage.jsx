import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { getBusinesses, submitPhoto } from "../services/api";
import { PHOTO_CATEGORIES } from "../components/PhotoGallery";
import { storage } from "../firebase";
import { useToast } from "../context/ToastContext";

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
const MAX_FILES        = 10;

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------------------------------------------------------------------------
// ContributePhotosPage
// Route: /contribute/photos (protected)
//
// Upload flow (per file):
//   1. User picks one or more files via drag-drop or file picker
//   2. Previews shown locally, each removable before submit
//   3. On submit → each file uploads to Firebase Storage under the chosen
//      category subfolder, one at a time (bounded, attributable failures)
//   4. Each upload's download URL is sent to FastAPI, which writes to
//      contributions (moderation) + photos subcollection (display)
//   5. A file whose backend write fails has its just-uploaded Storage
//      object deleted (best-effort) so it doesn't become an orphan, and
//      stays in the list with an error + Retry — success/failure is
//      per-file, so one bad file never discards the others.
// ---------------------------------------------------------------------------

export default function ContributePhotosPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const [businesses,   setBusinesses]   = useState([]);
  const [businessId,   setBusinessId]   = useState("");
  const [category,     setCategory]     = useState("entrance");
  const [caption,      setCaption]      = useState("");
  // Each entry: { id, file, previewUrl, status: 'pending'|'uploading'|'done'|'error', progress, error }
  const [items,        setItems]        = useState([]);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState(null);
  const [loadError,    setLoadError]    = useState(null);
  const [doneCount,    setDoneCount]    = useState(0);

  useEffect(() => {
    getBusinesses()
      .then(setBusinesses)
      .catch(() => setLoadError("Couldn't load the business list. Please refresh and try again."));
  }, []);

  useEffect(() => () => {
    // Revoke object URLs on unmount to avoid leaking memory.
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateFile = (f) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return "Only JPG, PNG, WebP images or MP4, WebM, MOV videos are accepted.";
    }
    const isVideo  = ACCEPTED_VIDEO_TYPES.includes(f.type);
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const maxLabel = isVideo ? "100MB" : "10MB";
    if (f.size > maxBytes) return `File is too large. Maximum size is ${maxLabel}.`;
    return null;
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const room = MAX_FILES - items.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_FILES} files at a time.`);
      e.target.value = "";
      return;
    }

    const toAdd = files.slice(0, room);
    const rejected = [];
    const accepted = [];
    toAdd.forEach((f) => {
      const err = validateFile(f);
      if (err) rejected.push(`${f.name}: ${err}`);
      else accepted.push({
        id: generateId(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        status: "pending",
        progress: 0,
        error: null,
      });
    });

    if (accepted.length) setItems((prev) => [...prev, ...accepted]);
    setError(rejected.length ? rejected.join(" ") : null);
    e.target.value = "";
  };

  const removeItem = (id) => {
    setItems((prev) => {
      const found = prev.find((it) => it.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((it) => it.id !== id);
    });
  };

  const resetAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setCaption("");
    setBusinessId("");
    setCategory("entrance");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Uploads one item to Storage, then registers it via the API. On backend
  // failure, best-effort deletes the Storage object so it doesn't orphan.
  const uploadOne = async (item) => {
    const isVideo      = ACCEPTED_VIDEO_TYPES.includes(item.file.type);
    const mediaType    = isVideo ? "video" : "image";
    const ext          = item.file.name.split(".").pop();
    const categorySlug = CATEGORY_SLUG[category] || category || "other";
    const storagePath  = `business-photos/${businessId}/${categorySlug}/${item.id}.${ext}`;
    const storageRef   = ref(storage, storagePath);

    let uploadedToStorage = false;
    try {
      await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, item.file);
        task.on(
          "state_changed",
          (snap) => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", progress: pct } : it)));
          },
          reject,
          resolve
        );
      });
      uploadedToStorage = true;

      const downloadUrl = await getDownloadURL(storageRef);
      await submitPhoto(businessId, { photoUrl: downloadUrl, caption, category, mediaType });

      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: "done", progress: 100 } : it)));
      return true;
    } catch (err) {
      if (uploadedToStorage) {
        // The file made it to Storage but the business record failed —
        // clean up so it doesn't sit around unreferenced.
        deleteObject(storageRef).catch(() => {});
      }
      setItems((prev) => prev.map((it) => (
        it.id === item.id ? { ...it, status: "error", error: err.message || "Upload failed.", progress: 0 } : it
      )));
      return false;
    }
  };

  const handleSubmit = async (e) => {
    if (submitting) return; // guards against double-click / double-submit
    if (!businessId) { setError("Please select a business."); return; }
    const pending = items.filter((it) => it.status === "pending" || it.status === "error");
    if (pending.length === 0) {
      setError(items.length === 0 ? "Please choose at least one photo or video to upload." : "All files already uploaded.");
      return;
    }

    const anchor = e.currentTarget;
    setError(null);
    setSubmitting(true);
    setDoneCount(0);

    let successCount = 0;
    let failCount = 0;
    // Sequential uploads: keeps progress/failures attributable to a single
    // file and avoids hammering Storage + the API with a burst of parallel
    // writes for what's usually a handful of photos from one contributor.
    for (const item of pending) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await uploadOne(item);
      if (ok) { successCount++; setDoneCount((c) => c + 1); }
      else failCount++;
    }

    setSubmitting(false);

    if (successCount > 0 && failCount === 0) {
      showToast(`${successCount} ${successCount === 1 ? "file" : "files"} uploaded`, "success", anchor);
      resetAll();
    } else if (successCount > 0 && failCount > 0) {
      showToast(`${successCount} uploaded, ${failCount} failed — you can retry the failed ones below`, "error", anchor);
      // Keep only the failed items so the user can retry just those.
      setItems((prev) => prev.filter((it) => it.status === "error"));
    } else {
      showToast("Upload failed", "error", anchor);
    }
  };

  const uploadableCount = items.filter((it) => it.status === "pending" || it.status === "error").length;
  const submitHint = !businessId
    ? "Select a business to submit."
    : uploadableCount === 0
      ? "Choose at least one photo or video to submit."
      : undefined;
  const canSubmit = !!businessId && uploadableCount > 0 && !submitting;

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
          Upload one or more photos or videos to help others understand accessibility conditions.
        </p>

        {loadError && (
          <div role="alert" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#dc2626" }}>
            {loadError}
          </div>
        )}

        <div style={{ backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: "14px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Business */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="photos-business" style={labelStyle}>Business <span style={{ color: "#dc2626" }}>*</span></label>
            <select
              id="photos-business"
              value={businessId}
              onChange={(e) => { setBusinessId(e.target.value); setError(null); }}
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
            <span style={labelStyle}>Category</span>
            <div role="group" aria-label="Photo category" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {PHOTO_CATEGORIES.map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={category === key}
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
                  <span aria-hidden="true">{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          {/* File picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Photos or Videos</label>
            <div
              onClick={() => uploadableCount < MAX_FILES && fileInputRef.current?.click()}
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "6px" }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                Click to choose photos or videos — you can select more than one
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                Images: JPG, PNG, WebP (max 10MB) · Videos: MP4, WebM, MOV (max 100MB) · up to {MAX_FILES} files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </div>

            {/* Selected file previews */}
            {items.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "4px" }}>
                {items.map((it) => {
                  const isVideo = ACCEPTED_VIDEO_TYPES.includes(it.file.type);
                  return (
                    <div key={it.id} style={{ position: "relative", width: "84px" }}>
                      <div style={{ width: "84px", height: "84px", borderRadius: "8px", overflow: "hidden", border: `1.5px solid ${it.status === "error" ? "#fca5a5" : "#e5e7eb"}`, backgroundColor: "#000" }}>
                        {isVideo ? (
                          <video src={it.previewUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <img src={it.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        )}
                        {(it.status === "uploading") && (
                          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: "12px", fontWeight: "700" }}>{it.progress}%</span>
                          </div>
                        )}
                        {it.status === "done" && (
                          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(22,163,74,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: "18px" }}>✓</span>
                          </div>
                        )}
                      </div>
                      {it.status !== "uploading" && it.status !== "done" && (
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          aria-label={`Remove ${it.file.name}`}
                          style={{ position: "absolute", top: "-6px", right: "-6px", width: "20px", height: "20px", borderRadius: "50%", backgroundColor: "#111827", border: "2px solid #fff", color: "#fff", fontSize: "11px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                        >
                          ✕
                        </button>
                      )}
                      {it.status === "error" && (
                        <p role="alert" style={{ margin: "3px 0 0", fontSize: "10px", color: "#dc2626", lineHeight: 1.3 }}>{it.error}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Caption — applies to this batch */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label htmlFor="photos-caption" style={labelStyle}>Caption <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional, applies to all selected files)</span></label>
            <input
              id="photos-caption"
              type="text"
              placeholder="e.g. Accessible entrance on north side"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Upload progress summary */}
          {submitting && (
            <div role="status">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                <span>Uploading…</span>
                <span>{doneCount} / {uploadableCount}</span>
              </div>
              <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px" }}>
                <div
                  style={{
                    width:           `${uploadableCount ? Math.round((doneCount / uploadableCount) * 100) : 0}%`,
                    backgroundColor: "#2563eb",
                    height:          "100%",
                    borderRadius:    "4px",
                    transition:      "width 0.2s",
                  }}
                />
              </div>
            </div>
          )}

          {error && <p role="alert" style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}

          <button
            onClick={handleSubmit}
            aria-disabled={!canSubmit}
            title={submitHint}
            onKeyDown={(e) => { if (!canSubmit && (e.key === "Enter" || e.key === " ")) e.preventDefault(); }}
            style={{
              padding:         "12px",
              backgroundColor: !canSubmit ? "#d1d5db" : "#111827",
              color:           !canSubmit ? "#9ca3af" : "#fff",
              border:          "none",
              borderRadius:    "8px",
              fontSize:        "14px",
              fontWeight:      "600",
              cursor:          submitting ? "not-allowed" : !canSubmit ? "not-allowed" : "pointer",
              marginTop:       "4px",
            }}
          >
            {submitting
              ? `Uploading… ${doneCount}/${uploadableCount}`
              : uploadableCount > 1 ? `Upload ${uploadableCount} Files` : "Submit"}
          </button>
          {submitHint && !submitting && (
            <p style={{ margin: "-8px 0 0", fontSize: "12px", color: "#9ca3af" }}>{submitHint}</p>
          )}
        </div>

      </div>
    </div>
  );
}

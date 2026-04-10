import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { submitReview } from "../services/api";
import StarRating from "./StarRating";

const INITIAL_FORM = {
  rating:                       0,
  comment:                      "",
  wheelchair_accessible:        false,
  accessible_parking:           false,
  accessible_restrooms:         false,
  elevator:                     false,
  auto_doors:                   false,
  entrance_width_rating:        "standard",
  wheelchair_accessible_tables: false,
  handrails_available:          false,
};

export default function ReviewFormModal({ businessId, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const navigate        = useNavigate();

  const [form,        setForm]        = useState(INITIAL_FORM);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  const commentTrimmed = form.comment.trim();
  const valid = form.rating >= 1 && commentTrimmed.length >= 10;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!currentUser) {
    return (
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundColor: "#fff", borderRadius: "16px", padding: "32px", maxWidth: "380px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
        >
          <p style={{ margin: "0 0 20px", fontSize: "15px", color: "#374151" }}>
            Sign in to leave a review.
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReview({
        business_id:                  businessId,
        rating:                       form.rating,
        comment:                      commentTrimmed,
        wheelchair_accessible:        form.wheelchair_accessible,
        accessible_parking:           form.accessible_parking,
        accessible_restrooms:         form.accessible_restrooms,
        elevator:                     form.elevator,
        auto_doors:                   form.auto_doors,
        entrance_width_rating:        form.entrance_width_rating,
        wheelchair_accessible_tables: form.wheelchair_accessible_tables,
        handrails_available:          form.handrails_available,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>Leave a Review</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "2px" }}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Star selector */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Your Rating <span style={{ color: "#dc2626" }}>*</span>
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <StarRating
                value={form.rating}
                size={32}
                interactive
                hoverValue={hoverRating || undefined}
                onChange={(v) => setForm((f) => ({ ...f, rating: v }))}
                onHover={setHoverRating}
                onLeave={() => setHoverRating(0)}
              />
              {form.rating > 0 && (
                <span style={{ fontSize: "13px", color: "#6b7280" }}>
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][form.rating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Your Experience <span style={{ color: "#dc2626" }}>*</span>
              <span style={{ fontWeight: "400", color: "#9ca3af", textTransform: "none", marginLeft: "6px" }}>(min. 10 characters)</span>
            </label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Describe the accessibility at this location…"
              rows={4}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${form.comment.trim().length > 0 && form.comment.trim().length < 10 ? "#fca5a5" : "#d1d5db"}`, borderRadius: "8px", fontSize: "14px", color: "#111827", resize: "vertical", fontFamily: "sans-serif", boxSizing: "border-box" }}
            />
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: commentTrimmed.length < 10 ? "#9ca3af" : "#16a34a" }}>
              {commentTrimmed.length} / 10 minimum characters
            </p>
          </div>

          {/* Accessibility features */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Accessibility Notes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                <input type="checkbox" checked={form.wheelchair_accessible} onChange={(e) => setForm((f) => ({ ...f, wheelchair_accessible: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                ♿ Ramps / wheelchair accessible
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                <input type="checkbox" checked={form.accessible_parking} onChange={(e) => setForm((f) => ({ ...f, accessible_parking: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                🚗 Accessible parking available
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                <input type="checkbox" checked={form.accessible_restrooms} onChange={(e) => setForm((f) => ({ ...f, accessible_restrooms: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                🚻 Accessible restrooms
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                <input type="checkbox" checked={form.elevator} onChange={(e) => setForm((f) => ({ ...f, elevator: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                🛗 Elevator available
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                <input type="checkbox" checked={form.auto_doors} onChange={(e) => setForm((f) => ({ ...f, auto_doors: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                🚪 Automatic doors
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                <input type="checkbox" checked={form.wheelchair_accessible_tables} onChange={(e) => setForm((f) => ({ ...f, wheelchair_accessible_tables: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                🪑 Wheelchair-accessible tables
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontSize: "14px", color: "#374151" }}>
                <input type="checkbox" checked={form.handrails_available} onChange={(e) => setForm((f) => ({ ...f, handrails_available: e.target.checked }))} style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                🪜 Handrails available
              </label>
            </div>
            <div style={{ marginTop: "12px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#374151" }}>Entrance width</label>
              <select
                value={form.entrance_width_rating}
                onChange={(e) => setForm((f) => ({ ...f, entrance_width_rating: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", color: "#111827", backgroundColor: "#fff", cursor: "pointer" }}
              >
                <option value="wide">Wide — fully accessible</option>
                <option value="standard">Standard — 36" minimum</option>
                <option value="narrow">Narrow — may be difficult</option>
              </select>
            </div>
          </div>

          {error && <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}
        </form>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            style={{
              width:           "100%",
              padding:         "12px",
              backgroundColor: !valid || submitting ? "#d1d5db" : "#111827",
              color:           !valid || submitting ? "#9ca3af" : "#fff",
              border:          "none",
              borderRadius:    "10px",
              fontSize:        "15px",
              fontWeight:      "600",
              cursor:          !valid || submitting ? "default" : "pointer",
              transition:      "background-color 0.2s",
            }}
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

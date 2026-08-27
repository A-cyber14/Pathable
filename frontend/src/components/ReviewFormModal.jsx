import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { submitReview } from "../services/api";
import StarRating from "./StarRating";
import TriToggle from "./TriToggle";

// Accessibility fields default to null ("Unsure"), never false — a reviewer
// who didn't check something must never have that read as a confirmed "No".
// See services/accessibility.py on the backend for why this distinction
// matters: it's what keeps one review from silently overwriting real data.
const INITIAL_FORM = {
  rating:                       0,
  comment:                      "",
  wheelchair_accessible:        null,
  accessible_parking:           null,
  accessible_restrooms:         null,
  elevator:                     null,
  auto_doors:                   null,
  entrance_width_rating:        null,
  wheelchair_accessible_tables: null,
  handrails_available:          null,
};

const MIN_COMMENT_LENGTH = 10;
const COMMENT_HINT_ID = "review-comment-hint";

export default function ReviewFormModal({ businessId, onClose, onSuccess }) {
  const { currentUser } = useAuth();
  const { showToast }   = useToast();
  const navigate        = useNavigate();

  const [form,        setForm]        = useState(INITIAL_FORM);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  const commentTrimmed = form.comment.trim();
  const valid = form.rating >= 1 && commentTrimmed.length >= MIN_COMMENT_LENGTH;

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
    if (!valid || submitting) return;
    const anchor = e.currentTarget;
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
      showToast("Review submitted", "success", anchor);
    } catch (err) {
      setError(err.message || "Failed to submit review.");
      showToast("Couldn't submit review", "error", anchor);
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
            <label htmlFor="review-comment" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Your Experience <span style={{ color: "#dc2626" }}>*</span>
              <span style={{ fontWeight: "400", color: "#9ca3af", textTransform: "none", marginLeft: "6px" }}>(min. {MIN_COMMENT_LENGTH} characters)</span>
            </label>
            <textarea
              id="review-comment"
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="Describe the accessibility at this location…"
              rows={4}
              aria-describedby={COMMENT_HINT_ID}
              aria-invalid={form.comment.trim().length > 0 && form.comment.trim().length < MIN_COMMENT_LENGTH}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${form.comment.trim().length > 0 && form.comment.trim().length < MIN_COMMENT_LENGTH ? "#fca5a5" : "#d1d5db"}`, borderRadius: "8px", fontSize: "14px", color: "#111827", resize: "vertical", fontFamily: "sans-serif", boxSizing: "border-box" }}
            />
            <p id={COMMENT_HINT_ID} style={{ margin: "4px 0 0", fontSize: "12px", color: commentTrimmed.length < MIN_COMMENT_LENGTH ? "#9ca3af" : "#16a34a" }}>
              {commentTrimmed.length} / {MIN_COMMENT_LENGTH} minimum characters
            </p>
          </div>

          {/* Accessibility features */}
          <div>
            <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Accessibility Notes
            </p>
            <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#9ca3af" }}>
              Choose "Unsure" for anything you didn't check — that keeps it from being recorded as "No".
            </p>
            <TriToggle label="♿ Ramps / wheelchair accessible" value={form.wheelchair_accessible} onChange={(v) => setForm((f) => ({ ...f, wheelchair_accessible: v }))} />
            <TriToggle label="🚗 Accessible parking available" value={form.accessible_parking} onChange={(v) => setForm((f) => ({ ...f, accessible_parking: v }))} />
            <TriToggle label="🚻 Accessible restrooms" value={form.accessible_restrooms} onChange={(v) => setForm((f) => ({ ...f, accessible_restrooms: v }))} />
            <TriToggle label="🛗 Elevator available" value={form.elevator} onChange={(v) => setForm((f) => ({ ...f, elevator: v }))} />
            <TriToggle label="🚪 Automatic doors" value={form.auto_doors} onChange={(v) => setForm((f) => ({ ...f, auto_doors: v }))} />
            <TriToggle label="🪑 Wheelchair-accessible tables" value={form.wheelchair_accessible_tables} onChange={(v) => setForm((f) => ({ ...f, wheelchair_accessible_tables: v }))} />
            <TriToggle label="🪜 Handrails available" value={form.handrails_available} onChange={(v) => setForm((f) => ({ ...f, handrails_available: v }))} />
            <div style={{ marginTop: "4px" }}>
              <label htmlFor="review-entrance-width" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#374151" }}>Entrance width</label>
              <select
                id="review-entrance-width"
                value={form.entrance_width_rating ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, entrance_width_rating: e.target.value || null }))}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", color: "#111827", backgroundColor: "#fff", cursor: "pointer" }}
              >
                <option value="">Unsure</option>
                <option value="wide">Wide — fully accessible</option>
                <option value="standard">Standard — 36" minimum</option>
                <option value="narrow">Narrow — may be difficult</option>
              </select>
            </div>
          </div>

          {error && <p role="alert" style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>}
        </form>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            aria-disabled={!valid || submitting}
            aria-describedby={COMMENT_HINT_ID}
            title={!valid && !submitting ? `Enter at least ${MIN_COMMENT_LENGTH} characters and a star rating to submit.` : undefined}
            onKeyDown={(e) => { if ((!valid || submitting) && (e.key === "Enter" || e.key === " ")) e.preventDefault(); }}
            style={{
              width:           "100%",
              padding:         "12px",
              backgroundColor: !valid || submitting ? "#d1d5db" : "#111827",
              color:           !valid || submitting ? "#9ca3af" : "#fff",
              border:          "none",
              borderRadius:    "10px",
              fontSize:        "15px",
              fontWeight:      "600",
              cursor:          !valid || submitting ? "not-allowed" : "pointer",
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

import { useEffect, useRef } from "react";
import StarRating from "./StarRating";

// ---------------------------------------------------------------------------
// ReviewModal — the one, single reviews experience: rating breakdown at the
// top, individual reviews directly below, Leave a Review at the bottom.
// No separate breakdown popup, no nested modal.
// ---------------------------------------------------------------------------
export default function ReviewModal({ summary, reviews, loading, onClose, onWriteReview }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    panelRef.current?.focus();
    return () => { previouslyFocused.current?.focus?.(); };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const avg      = summary?.average_rating ?? 0;
  const count    = summary?.review_count   ?? 0;
  const breakdown = summary?.breakdown ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const maxBar    = Math.max(...Object.values(breakdown), 1);

  return (
    <div
      onClick={onClose}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: "rgba(0,0,0,0.5)",
        zIndex:          200,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "24px 16px",
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="All reviews"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius:    "16px",
          width:           "100%",
          maxWidth:        "560px",
          maxHeight:       "85vh",
          display:         "flex",
          flexDirection:   "column",
          boxShadow:       "0 20px 60px rgba(0,0,0,0.2)",
          overflow:        "hidden",
          outline:         "none",
        }}
      >
        {/* Header */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "20px 24px",
          borderBottom:   "1px solid #f3f4f6",
          flexShrink:     0,
        }}>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>
            All Reviews
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "2px" }}
          >✕</button>
        </div>

        {/* Scrollable body: rating breakdown, then reviews */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>

          {/* Rating breakdown */}
          <div style={{ display: "flex", gap: "20px", marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: "80px" }}>
              <span style={{ fontSize: "38px", fontWeight: "800", color: "#111827", lineHeight: 1 }}>
                {count > 0 ? avg.toFixed(1) : "—"}
              </span>
              <span style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Out of 5</span>
              <div style={{ marginTop: "6px" }}>
                <StarRating value={avg} size={13} />
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px", justifyContent: "center" }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const n   = breakdown[star] ?? 0;
                const pct = Math.round((n / maxBar) * 100);
                return (
                  <div key={star} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#374151", width: "38px", whiteSpace: "nowrap" }}>
                      {star} Star
                    </span>
                    <div style={{ flex: 1, height: "8px", backgroundColor: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#22c55e", borderRadius: "999px", transition: "width 0.3s" }} />
                    </div>
                    <span style={{ fontSize: "12px", color: "#6b7280", width: "24px", textAlign: "right" }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reviews */}
          {loading ? (
            <p style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center", padding: "24px 0" }}>Loading reviews…</p>
          ) : reviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ margin: "0 0 4px", fontWeight: "600", fontSize: "15px", color: "#374151" }}>
                No reviews yet
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>
                Be the first to share your experience.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {reviews.map((review) => {
                const dateLabel = review.submitted_at
                  ? new Date(review.submitted_at).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })
                  : null;

                return (
                  <div
                    key={review.id}
                    style={{
                      border:       "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding:      "16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <StarRating value={review.rating || 0} size={15} />
                        <p style={{ margin: "4px 0 0", fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                          {review.reviewerName || "Contributor"}
                        </p>
                      </div>
                      {dateLabel && (
                        <span style={{ fontSize: "12px", color: "#9ca3af", whiteSpace: "nowrap" }}>{dateLabel}</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: "1.55" }}>
                      "{review.comment}"
                    </p>

                    {/* Business response */}
                    {review.response && (
                      <div style={{ marginTop: "10px", backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: "8px", padding: "10px 12px" }}>
                        <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
                          Business Response
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: "1.5" }}>
                          {review.response.message}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f3f4f6", flexShrink: 0 }}>
          <button
            onClick={onWriteReview}
            style={{
              width:           "100%",
              padding:         "12px",
              backgroundColor: "#111827",
              color:           "#fff",
              border:          "none",
              borderRadius:    "10px",
              fontSize:        "15px",
              fontWeight:      "600",
              cursor:          "pointer",
            }}
          >
            Leave a Review
          </button>
        </div>
      </div>
    </div>
  );
}

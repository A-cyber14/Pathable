import { useEffect } from "react";
import StarRating from "./StarRating";

export default function ReviewModal({ reviews, onClose, onWriteReview }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          borderRadius:    "16px",
          width:           "100%",
          maxWidth:        "560px",
          maxHeight:       "80vh",
          display:         "flex",
          flexDirection:   "column",
          boxShadow:       "0 20px 60px rgba(0,0,0,0.2)",
          overflow:        "hidden",
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
            style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#6b7280", lineHeight: 1, padding: "2px" }}
          >✕</button>
        </div>

        {/* Review list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 24px" }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🗒️</div>
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

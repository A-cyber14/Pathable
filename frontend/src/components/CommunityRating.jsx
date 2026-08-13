import { useState, useEffect } from "react";
import { getReviewSummary, getBusinessReviews } from "../services/api";
import StarRating from "./StarRating";
import ReviewModal from "./ReviewModal";
import ReviewFormModal from "./ReviewFormModal";

// ---------------------------------------------------------------------------
// CommunityRating
// Clicking the rating opens ONE reviews modal (breakdown + list together) —
// no intermediate dropdown, no nested modals.
// ---------------------------------------------------------------------------
export default function CommunityRating({ businessId, onContribute }) {
  const [summary,        setSummary]        = useState(null);
  const [reviews,        setReviews]        = useState([]);
  const [reviewsOpen,    setReviewsOpen]    = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [formOpen,       setFormOpen]       = useState(false);
  const [hovered,        setHovered]        = useState(false);
  const [contribHovered, setContribHovered] = useState(false);

  const fetchSummary = () =>
    getReviewSummary(businessId)
      .then(setSummary)
      .catch(() => {});

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const openReviews = () => {
    setReviewsOpen(true);
    setReviewsLoading(true);
    getBusinessReviews(businessId)
      .then(setReviews)
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  const handleWriteReview = () => {
    setReviewsOpen(false);
    setFormOpen(true);
  };

  const handleReviewSuccess = () => {
    fetchSummary();
    openReviews();
  };

  const avg   = summary?.average_rating ?? 0;
  const count = summary?.review_count   ?? 0;

  return (
    <>
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Community Rating
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={openReviews}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            aria-label={`View ${count} review${count === 1 ? "" : "s"}. Average rating ${avg.toFixed(1)} out of 5.`}
            style={{
              display:         "flex",
              alignItems:      "center",
              gap:             "8px",
              background:      hovered ? "#f9fafb" : "#fff",
              border:          `1px solid ${hovered ? "#d1d5db" : "#e5e7eb"}`,
              borderRadius:    "10px",
              padding:         "8px 14px",
              cursor:          "pointer",
              boxShadow:       hovered ? "0 2px 6px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.06)",
              transition:      "background-color 0.15s, border-color 0.15s, box-shadow 0.15s",
            }}
          >
            <StarRating value={avg} size={18} />
            <span style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>
              {count > 0 ? avg.toFixed(1) : "—"}
            </span>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              ({count} {count === 1 ? "review" : "reviews"})
            </span>
            <span aria-hidden="true" style={{ fontSize: "14px", color: "#9ca3af" }}>›</span>
          </button>

          {onContribute && (
            <button
              data-tour="contribute"
              onClick={onContribute}
              onMouseEnter={() => setContribHovered(true)}
              onMouseLeave={() => setContribHovered(false)}
              style={{
                display:         "flex",
                alignItems:      "center",
                gap:             "6px",
                background:      contribHovered ? "#dbeafe" : "#eff6ff",
                border:          "1px solid #bfdbfe",
                borderRadius:    "10px",
                padding:         "8px 14px",
                fontSize:        "13px",
                fontWeight:      "600",
                color:           "#2563eb",
                cursor:          "pointer",
                transition:      "background-color 0.15s",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Contribute information
            </button>
          )}
        </div>
      </div>

      {reviewsOpen && (
        <ReviewModal
          summary={summary}
          reviews={reviews}
          loading={reviewsLoading}
          onClose={() => setReviewsOpen(false)}
          onWriteReview={handleWriteReview}
        />
      )}

      {formOpen && (
        <ReviewFormModal
          businessId={businessId}
          onClose={() => setFormOpen(false)}
          onSuccess={handleReviewSuccess}
        />
      )}
    </>
  );
}

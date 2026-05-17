import { useState, useEffect, useRef } from "react";
import { getReviewSummary, getBusinessReviews } from "../services/api";
import StarRating from "./StarRating";
import ReviewModal from "./ReviewModal";
import ReviewFormModal from "./ReviewFormModal";

export default function CommunityRating({ businessId }) {
  const [summary,       setSummary]       = useState(null);
  const [reviews,       setReviews]       = useState([]);
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [reviewsOpen,   setReviewsOpen]   = useState(false);
  const [formOpen,      setFormOpen]      = useState(false);
  const dropdownRef = useRef(null);

  const fetchSummary = () =>
    getReviewSummary(businessId)
      .then(setSummary)
      .catch(() => {});

  const fetchReviews = () =>
    getBusinessReviews(businessId)
      .then(setReviews)
      .catch(() => {});

  useEffect(() => {
    fetchSummary();
  }, [businessId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleReadAllReviews = () => {
    fetchReviews();
    setDropdownOpen(false);
    setReviewsOpen(true);
  };

  const handleWriteReview = () => {
    setReviewsOpen(false);
    setFormOpen(true);
  };

  const handleReviewSuccess = () => {
    fetchSummary();
    fetchReviews();
  };

  const avg   = summary?.average_rating ?? 0;
  const count = summary?.review_count   ?? 0;

  const breakdown = summary?.breakdown ?? { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const maxBar    = Math.max(...Object.values(breakdown), 1);

  return (
    <>
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "16px" }}>⭐</span>
          <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#111827" }}>
            Community Rating
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>

          {/* Trigger: stars + avg + count + chevron */}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                display:         "flex",
                alignItems:      "center",
                gap:             "8px",
                background:      "none",
                border:          "1px solid #e5e7eb",
                borderRadius:    "10px",
                padding:         "8px 14px",
                cursor:          "pointer",
                backgroundColor: "#fff",
                boxShadow:       "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <StarRating value={avg} size={18} />
              <span style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>
                {count > 0 ? avg.toFixed(1) : "—"}
              </span>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>
                ({count} {count === 1 ? "review" : "reviews"})
              </span>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>▾</span>
            </button>

            {/* Dropdown breakdown */}
            {dropdownOpen && (
              <div style={{
                position:        "absolute",
                top:             "calc(100% + 8px)",
                left:            0,
                width:           "320px",
                backgroundColor: "#fff",
                border:          "1px solid #e5e7eb",
                borderRadius:    "14px",
                boxShadow:       "0 8px 32px rgba(0,0,0,0.12)",
                zIndex:          50,
                overflow:        "hidden",
              }}>
                {/* Top: big avg + stars + bar chart */}
                <div style={{ display: "flex", gap: "0", padding: "20px" }}>

                  {/* Left: avg number */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: "90px", paddingRight: "20px", borderRight: "1px solid #f3f4f6" }}>
                    <span style={{ fontSize: "42px", fontWeight: "800", color: "#111827", lineHeight: 1 }}>
                      {count > 0 ? avg.toFixed(1) : "—"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>Out of 5</span>
                    <div style={{ marginTop: "6px" }}>
                      <StarRating value={avg} size={13} />
                    </div>
                  </div>

                  {/* Right: bar chart */}
                  <div style={{ flex: 1, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "5px", justifyContent: "center" }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const n    = breakdown[star] ?? 0;
                      const pct  = Math.round((n / maxBar) * 100);
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

                {/* Bottom: read all reviews */}
                <button
                  onClick={handleReadAllReviews}
                  style={{
                    display:         "block",
                    width:           "100%",
                    padding:         "14px 20px",
                    background:      "none",
                    border:          "none",
                    borderTop:       "1px solid #f3f4f6",
                    cursor:          "pointer",
                    fontSize:        "14px",
                    fontWeight:      "600",
                    color:           "#111827",
                    textAlign:       "center",
                  }}
                >
                  Read all reviews ›
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {reviewsOpen && (
        <ReviewModal
          reviews={reviews}
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

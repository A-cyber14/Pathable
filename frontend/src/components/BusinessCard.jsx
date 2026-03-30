// ---------------------------------------------------------------------------
// BusinessCard
// Matches the location card design from the UI mockups (Image 1, Image 8).
//
// Props:
//   business    — business object from the API
//   isSelected  — bool, renders blue border when true (Image 8)
//   onClick     — callback fired when the card is clicked
// ---------------------------------------------------------------------------

// SVG bookmark icon
function BookmarkIcon({ filled = false, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? "#f59e0b" : "none"}
      stroke={filled ? "#f59e0b" : "#9ca3af"}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Star rating — filled/half/empty SVG stars, score out of 5
function StarRating({ score, max = 5 }) {
  if (score == null) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
      {Array.from({ length: max }, (_, i) => {
        const n       = i + 1;
        const filled  = score >= n;
        const half    = !filled && score >= n - 0.5;
        const gradId  = `hg-${i}`;
        return (
          <svg key={i} width="13" height="13" viewBox="0 0 24 24">
            {half && (
              <defs>
                <linearGradient id={gradId}>
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#e5e7eb" />
                </linearGradient>
              </defs>
            )}
            <polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={filled ? "#f59e0b" : half ? `url(#${gradId})` : "#e5e7eb"}
              stroke={filled || half ? "#f59e0b" : "#d1d5db"}
              strokeWidth="1"
            />
          </svg>
        );
      })}
      <span style={{ fontSize: "11px", fontWeight: "600", color: "#374151", marginLeft: "3px" }}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

export default function BusinessCard({ business, isSelected = false, onClick }) {
  const {
    id,
    name,
    address,
    accessibility_score,
    wheelchair_accessible,
    accessible_parking,
    entrance_width_rating,
  } = business;

  const tags = [
    { label: "Wheelchair", value: wheelchair_accessible },
    { label: "Parking",    value: accessible_parking },
    {
      label: entrance_width_rating
        ? `Entrance: ${entrance_width_rating.charAt(0).toUpperCase() + entrance_width_rating.slice(1)}`
        : "Entrance: N/A",
      value: entrance_width_rating === "wide" || entrance_width_rating === "standard",
    },
  ];

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#fff",
        border:          `1.5px solid ${isSelected ? "#2563eb" : "#e5e7eb"}`,
        borderRadius:    "12px",
        padding:         "16px",
        marginBottom:    "12px",
        cursor:          "pointer",
        boxShadow:       isSelected
          ? "0 0 0 3px rgba(37,99,235,0.15)"
          : "0 1px 3px rgba(0,0,0,0.07)",
        transition:      "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Row 1 — name left, star rating top-right */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827", paddingRight: "8px" }}>
          {name}
        </span>
        <StarRating score={accessibility_score} />
      </div>

      {/* Row 2 — address with SVG pin */}
      <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        {address}
      </p>

      {/* Row 3 — feature tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
        {tags.map(({ label, value }) => (
          <span
            key={label}
            style={{
              fontSize:        "12px",
              fontWeight:      "500",
              padding:         "3px 10px",
              borderRadius:    "999px",
              border:          `1.5px solid ${value ? "#16a34a" : "#d97706"}`,
              color:           value ? "#16a34a" : "#d97706",
              backgroundColor: "#fff",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      {/* Row 4 — view details link */}
      <a
        href={`/business/${id}`}
        onClick={(e) => e.stopPropagation()}
        style={{ fontSize: "13px", color: "#2563eb", textDecoration: "none", fontWeight: "500" }}
      >
        View Full Details →
      </a>
    </div>
  );
}

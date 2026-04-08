import { useState } from "react";

export default function BusinessCard({ business, isSelected = false, onClick, rank }) {
  const [hovered, setHovered] = useState(false);
  const {
    name,
    address,
    accessibility_score,
    wheelchair_accessible,
    accessible_parking,
    entrance_width_rating,
  } = business;

  // Max 2 tags, skip nulls and "N/A" entries
  const tags = [
    wheelchair_accessible != null && { label: "Wheelchair", value: wheelchair_accessible },
    accessible_parking != null    && { label: "Parking",    value: accessible_parking },
    entrance_width_rating         && {
      label: `Entrance: ${entrance_width_rating.charAt(0).toUpperCase() + entrance_width_rating.slice(1)}`,
      value: entrance_width_rating === "wide" || entrance_width_rating === "standard",
    },
  ].filter(Boolean).slice(0, 2);

  // Score color thresholds
  const scoreColor = accessibility_score == null ? "#9ca3af"
    : accessibility_score >= 75 ? "#16a34a"
    : accessibility_score >= 50 ? "#d97706"
    : "#dc2626";

  const scoreBg = accessibility_score == null ? "#f3f4f6"
    : accessibility_score >= 75 ? "#f0fdf4"
    : accessibility_score >= 50 ? "#fffbeb"
    : "#fef2f2";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: isSelected ? "#fff" : hovered ? "#fff" : "#fff",
        border:          `1px solid ${isSelected ? "#2563eb" : hovered ? "#e5e7eb" : "#ebebeb"}`,
        borderRadius:    "14px",
        padding:         "14px 16px",
        marginBottom:    "8px",
        cursor:          "pointer",
        boxShadow:       isSelected
          ? "0 0 0 3px rgba(37,99,235,0.10), 0 2px 8px rgba(0,0,0,0.06)"
          : hovered
          ? "0 2px 12px rgba(0,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transition:      "border-color 0.15s, box-shadow 0.15s, background-color 0.1s",
        position:        "relative",
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>

        {/* Rank badge */}
        {rank != null && (
          <div style={{
            minWidth:        "22px",
            height:          "22px",
            borderRadius:    "50%",
            backgroundColor: "#f3f4f6",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            fontSize:        "11px",
            fontWeight:      "600",
            color:           "#9ca3af",
            flexShrink:      0,
            marginTop:       "1px",
          }}>
            {rank}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Row 1 — name + score badge */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "5px" }}>
            <span style={{ fontWeight: "600", fontSize: "14px", color: "#111827", paddingRight: "8px", lineHeight: "1.35" }}>
              {name}
            </span>
            {accessibility_score != null && (
              <span
                style={{
                  fontSize:        "11px",
                  fontWeight:      "700",
                  color:           scoreColor,
                  backgroundColor: scoreBg,
                  borderRadius:    "6px",
                  padding:         "2px 7px",
                  flexShrink:      0,
                  whiteSpace:      "nowrap",
                }}
              >
                {accessibility_score}/100
              </span>
            )}
          </div>

          {/* Row 2 — address */}
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#9ca3af", display: "flex", alignItems: "center", gap: "3px" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {address}
          </p>

          {/* Row 3 — feature tags */}
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {tags.map(({ label, value }) => (
                <span
                  key={label}
                  style={{
                    fontSize:        "11px",
                    fontWeight:      "500",
                    padding:         "2px 8px",
                    borderRadius:    "999px",
                    backgroundColor: value ? "#f0fdf4" : "#fffbeb",
                    color:           value ? "#16a34a" : "#d97706",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

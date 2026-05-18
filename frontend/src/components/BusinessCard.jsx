import { useState } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategory(name = "") {
  const n = name.toLowerCase();
  if (n.includes("library"))                                             return "Library";
  if (n.includes("medical") || n.includes("hospital"))                  return "Medical Center";
  if (n.includes("hospice"))                                             return "Hospice";
  if (n.includes("disability") || n.includes("achievement center"))     return "Support Center";
  if (n.includes("grill") || n.includes("restaurant") || n.includes("cafe") || n.includes("chipotle") || n.includes("mexican")) return "Restaurant";
  if (n.includes("aquarium") || n.includes("museum"))                   return "Attraction";
  if (n.includes("pier"))                                                return "Public Space";
  if (n.includes("rec") || n.includes("recreation"))                    return "Recreation";
  if (n.includes("community center"))                                    return "Community Center";
  if (n.includes("shuffle") || n.includes("bar") || n.includes("club")) return "Venue";
  return "Business";
}

function daysAgo(isoString) {
  if (!isoString) return null;
  const updated = new Date(isoString);
  const now = new Date();
  const days = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Returns { label, color, bg } for a compact trust pill
function getTrustSignal(business) {
  const { contributors_count, review_count, last_updated, accessibility_score } = business;
  const totalEvidence = (contributors_count || 0) + (review_count || 0);

  if (accessibility_score == null)      return { label: "No data",           color: "#9ca3af", bg: "#f3f4f6" };
  if (totalEvidence === 0)              return { label: "Needs verification", color: "#9ca3af", bg: "#f3f4f6" };
  if (totalEvidence >= 20)             return { label: "Highly verified",    color: "#16a34a", bg: "#f0fdf4" };
  if (totalEvidence >= 8)              return { label: "Community verified", color: "#0369a1", bg: "#f0f9ff" };
  if (totalEvidence >= 3)              return { label: "Some verification",  color: "#d97706", bg: "#fffbeb" };
  return                                      { label: "Limited data",       color: "#9ca3af", bg: "#f3f4f6" };
}

// Returns 2–4 compact evidence strings that explain the score
function getEvidenceItems(business) {
  const {
    wheelchair_accessible,
    accessible_parking,
    entrance_width_rating,
    accessible_restrooms,
    elevator,
    auto_doors,
    contributors_count,
    review_count,
    last_updated,
  } = business;

  const items = [];

  if (wheelchair_accessible === true)  items.push({ text: "Wheelchair accessible",  positive: true });
  if (wheelchair_accessible === false) items.push({ text: "Not wheelchair accessible", positive: false });

  if (accessible_parking === true)     items.push({ text: "Accessible parking",     positive: true });
  if (accessible_parking === false)    items.push({ text: "No accessible parking",  positive: false });

  if (entrance_width_rating === "wide")     items.push({ text: "Wide entrance",     positive: true });
  if (entrance_width_rating === "standard") items.push({ text: "Standard entrance", positive: null });
  if (entrance_width_rating === "narrow")   items.push({ text: "Narrow entrance",   positive: false });

  if (accessible_restrooms === true)   items.push({ text: "Accessible restroom",   positive: true });
  if (accessible_restrooms === false)  items.push({ text: "No accessible restroom",positive: false });

  if (elevator === true)               items.push({ text: "Elevator available",     positive: true });
  if (auto_doors === true)             items.push({ text: "Auto doors",             positive: true });

  const updatedLabel = daysAgo(last_updated);
  if (updatedLabel) items.push({ text: `Updated ${updatedLabel}`, positive: null, meta: true });

  const rc = review_count || 0;
  const cc = contributors_count || 0;
  if (cc > 0)      items.push({ text: `${cc} contributor${cc !== 1 ? "s" : ""}`, positive: null, meta: true });
  if (rc > 0)      items.push({ text: `${rc} review${rc !== 1 ? "s" : ""}`,      positive: null, meta: true });

  // Return: first 2 access features + 1–2 meta items
  const access = items.filter(i => !i.meta).slice(0, 3);
  const meta   = items.filter(i =>  i.meta).slice(0, 2);
  return [...access, ...meta].slice(0, 4);
}

// ---------------------------------------------------------------------------
// BusinessCard
// ---------------------------------------------------------------------------

export default function BusinessCard({ business, isSelected = false, onClick, rank, compact = false }) {
  const [hovered, setHovered] = useState(false);
  const {
    name,
    address,
    accessibility_score,
  } = business;

  const category  = getCategory(name);
  const trust     = getTrustSignal(business);
  const evidence  = getEvidenceItems(business);
  const compactTags = evidence.filter(e => !e.meta).slice(0, 2);

  // Score color/bg
  const scoreColor = accessibility_score == null ? "#9ca3af"
    : accessibility_score >= 75 ? "#16a34a"
    : accessibility_score >= 50 ? "#d97706"
    : "#dc2626";

  const scoreBg = accessibility_score == null ? "#f3f4f6"
    : accessibility_score >= 75 ? "#f0fdf4"
    : accessibility_score >= 50 ? "#fffbeb"
    : "#fef2f2";

  // Rank badge style — #1 gets a highlighted look
  const rankBg    = rank === 1 ? "#111827" : "#f3f4f6";
  const rankColor = rank === 1 ? "#fff"    : "#9ca3af";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: "#fff",
        border:          `1px solid ${isSelected ? "#2563eb" : hovered ? "#d1d5db" : "#ebebeb"}`,
        borderRadius:    compact ? "12px" : "14px",
        padding:         compact ? "10px 12px" : "13px 15px",
        marginBottom:    compact ? "6px" : "8px",
        cursor:          "pointer",
        boxShadow:       isSelected
          ? "0 0 0 3px rgba(37,99,235,0.10), 0 2px 8px rgba(0,0,0,0.07)"
          : hovered
          ? "0 2px 12px rgba(0,0,0,0.08)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        transition:      "border-color 0.15s, box-shadow 0.15s",
        position:        "relative",
      }}
    >
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>

        {/* Rank badge */}
        {rank != null && (
          <div style={{
            minWidth:        "22px",
            height:          "22px",
            borderRadius:    "50%",
            backgroundColor: rankBg,
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            fontSize:        "11px",
            fontWeight:      "700",
            color:           rankColor,
            flexShrink:      0,
            marginTop:       "2px",
          }}>
            {rank}
          </div>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Row 1 — name + score */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
            <span style={{
              fontWeight:  "700",
              fontSize:    "14px",
              color:       "#111827",
              lineHeight:  "1.3",
              paddingRight: "8px",
              flex: 1,
            }}>
              {name}
            </span>

            {/* Score badge */}
            {accessibility_score != null && (
              <div style={{
                display:         "flex",
                flexDirection:   "column",
                alignItems:      "center",
                backgroundColor: scoreBg,
                borderRadius:    "8px",
                padding:         "3px 8px",
                flexShrink:      0,
              }}>
                <span style={{ fontSize: "13px", fontWeight: "800", color: scoreColor, lineHeight: 1 }}>
                  {accessibility_score}
                </span>
                <span style={{ fontSize: "9px", fontWeight: "600", color: scoreColor, opacity: 0.7, lineHeight: 1.2 }}>
                  /100
                </span>
              </div>
            )}
          </div>

          {/* Row 2 — category + address */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontSize:        "10px",
              fontWeight:      "600",
              color:           "#6b7280",
              backgroundColor: "#f3f4f6",
              borderRadius:    "4px",
              padding:         "1px 6px",
              letterSpacing:   "0.2px",
              textTransform:   "uppercase",
            }}>
              {category}
            </span>
            <span style={{ fontSize: "11px", color: "#9ca3af", display: "flex", alignItems: "center", gap: "2px" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              {address}
            </span>
          </div>

          {/* Row 3 — evidence tags (full) or compact access tags */}
          {compact ? (
            compactTags.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {compactTags.map(({ text, positive }) => (
                  <span key={text} style={{
                    fontSize:        "11px",
                    fontWeight:      "500",
                    padding:         "2px 7px",
                    borderRadius:    "999px",
                    backgroundColor: positive === true ? "#f0fdf4" : positive === false ? "#fef2f2" : "#f3f4f6",
                    color:           positive === true ? "#16a34a" : positive === false ? "#dc2626" : "#6b7280",
                    display:         "flex",
                    alignItems:      "center",
                    gap:             "3px",
                  }}>
                    {positive === true  && <span style={{ fontSize: "9px" }}>✓</span>}
                    {positive === false && <span style={{ fontSize: "9px" }}>✗</span>}
                    {text}
                  </span>
                ))}
              </div>
            )
          ) : (
            <>
              {evidence.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                  {evidence.map(({ text, positive, meta }) => {
                    const tagColor = meta
                      ? "#9ca3af"
                      : positive === true  ? "#16a34a"
                      : positive === false ? "#dc2626"
                      : "#6b7280";
                    const tagBg = meta
                      ? "#f9fafb"
                      : positive === true  ? "#f0fdf4"
                      : positive === false ? "#fef2f2"
                      : "#f3f4f6";
                    return (
                      <span key={text} style={{
                        fontSize:        "11px",
                        fontWeight:      meta ? "400" : "500",
                        padding:         "2px 7px",
                        borderRadius:    "999px",
                        backgroundColor: tagBg,
                        color:           tagColor,
                        display:         "flex",
                        alignItems:      "center",
                        gap:             "3px",
                      }}>
                        {!meta && positive === true  && <span style={{ fontSize: "9px" }}>✓</span>}
                        {!meta && positive === false && <span style={{ fontSize: "9px" }}>✗</span>}
                        {text}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Row 4 — trust signal */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{
                  fontSize:        "10px",
                  fontWeight:      "500",
                  color:           trust.color,
                  backgroundColor: trust.bg,
                  borderRadius:    "4px",
                  padding:         "1px 6px",
                }}>
                  {trust.label}
                </span>
                {rank === 1 && (
                  <span style={{
                    fontSize:        "10px",
                    fontWeight:      "600",
                    color:           "#92400e",
                    backgroundColor: "#fef3c7",
                    borderRadius:    "4px",
                    padding:         "1px 6px",
                  }}>
                    Top match
                  </span>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

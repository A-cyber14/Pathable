import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBusiness, addBookmark } from "../services/api";
import PhotoGallery from "../components/PhotoGallery";

// ---------------------------------------------------------------------------
// Feature card
// ---------------------------------------------------------------------------

function FeatureCard({ title, icon, children }) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border:          "1px solid #e5e7eb",
        borderRadius:    "12px",
        padding:         "20px",
        flex:            "1 1 calc(50% - 8px)",
        minWidth:        "240px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <span style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function CheckRow({ label, value, note }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: "14px", color: "#374151" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {note && <span style={{ fontSize: "12px", color: "#6b7280" }}>{note}</span>}
        <span style={{ color: value ? "#16a34a" : "#9ca3af", fontSize: "16px" }}>
          {value ? "✓" : "✗"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BusinessDetailPage
// Route: /business/:id
// ---------------------------------------------------------------------------

export default function BusinessDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const [business, setBusiness]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [bookmarked, setBookmarked]   = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => {
    getBusiness(id)
      .then(setBusiness)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBookmark = async () => {
    if (bookmarked || bookmarking) return;
    setBookmarking(true);
    try {
      await addBookmark(business.id);
      setBookmarked(true);
    } catch (err) {
      alert(err.message || "Failed to bookmark. Are you signed in?");
    } finally {
      setBookmarking(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", fontFamily: "sans-serif" }}>
        Loading…
      </div>
    );
  }

  if (error || !business) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#dc2626", fontFamily: "sans-serif" }}>
        {error || "Business not found."}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 20px" }}>

        {/* Back */}
        <button
          onClick={() => navigate("/")}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#2563eb", fontSize: "14px", padding: "0",
            marginBottom: "20px", display: "flex", alignItems: "center", gap: "4px",
          }}
        >
          ← Back to Map
        </button>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: "800", color: "#111827" }}>
            {business.name}
          </h1>
          {business.community_score != null && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "2px" }}>Pathable Score</div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ color: "#f59e0b", fontSize: "20px" }}>★</span>
                <span style={{ fontSize: "22px", fontWeight: "700", color: "#111827" }}>
                  {business.community_score}
                </span>
                <span style={{ fontSize: "14px", color: "#6b7280" }}>/5</span>
              </div>
            </div>
          )}
        </div>

        <p style={{ margin: "0 0 10px", fontSize: "14px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
          📍 {business.address}
        </p>

        {business.description && (
          <p style={{ margin: "0 0 28px", fontSize: "15px", color: "#374151", lineHeight: "1.6" }}>
            {business.description}
          </p>
        )}

        {/* ── PHOTO GALLERY ──────────────────────────────────────────────────── */}
        {/*
          PhotoGallery fetches from GET /api/businesses/:id/photos,
          groups by category, shows one preview per slot, and opens a
          full modal when clicked. No longer reads business.photos[].
        */}
        <div style={{ marginBottom: "28px" }}>
          <PhotoGallery businessId={business.id} />
        </div>

        {/* ── FEATURE CARDS ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>

          <FeatureCard title="Parking" icon="🚗">
            <CheckRow
              label="Accessible Parking"
              value={business.accessible_parking}
              note={business.accessible_parking ? "Available" : "Not available"}
            />
            {business.space_count != null && (
              <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#6b7280" }}>
                {business.space_count} accessible spaces near entrance
              </p>
            )}
          </FeatureCard>

          <FeatureCard title="Door Width" icon="🚪">
            {business.entrance_width_rating ? (
              <>
                <div style={{ fontSize: "28px", fontWeight: "800", color: "#111827", marginBottom: "4px" }}>
                  {business.entrance_width_rating.charAt(0).toUpperCase() + business.entrance_width_rating.slice(1)}
                </div>
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                  {business.entrance_width_rating === "wide"
                    ? "Fully accessible (wide entry)"
                    : business.entrance_width_rating === "standard"
                    ? "Accessible (standard 36\" minimum)"
                    : "May be difficult for some mobility aids"}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "#9ca3af" }}>Not reported</p>
            )}
          </FeatureCard>

          <FeatureCard title="Restrooms" icon="♿">
            <CheckRow
              label="Accessible Restrooms"
              value={business.accessible_restrooms}
              note={business.accessible_restrooms ? "Accessible" : "Not confirmed"}
            />
          </FeatureCard>

          <FeatureCard title="Building" icon="🏢">
            {business.floors != null && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: "14px", color: "#374151" }}>Floors</span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{business.floors}</span>
              </div>
            )}
            <CheckRow label="Elevator"        value={business.elevator} />
            <CheckRow label="Ramps"           value={business.wheelchair_accessible} />
            <CheckRow label="Automatic Doors" value={business.auto_doors} />
          </FeatureCard>

        </div>

        {/* ── ACTION BAR ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            onClick={handleBookmark}
            disabled={bookmarked || bookmarking}
            style={{
              flex:            1,
              padding:         "14px",
              backgroundColor: bookmarked ? "#16a34a" : "#111827",
              color:           "#fff",
              border:          "none",
              borderRadius:    "10px",
              fontSize:        "15px",
              fontWeight:      "600",
              cursor:          bookmarked || bookmarking ? "default" : "pointer",
              opacity:         bookmarking ? 0.7 : 1,
              transition:      "background-color 0.2s",
            }}
          >
            {bookmarked ? "✓ Bookmarked" : bookmarking ? "Saving…" : "Add to Bookmarks"}
          </button>
          <button
            onClick={() => navigate(`/contribute/photos?businessId=${business.id}`)}
            style={{
              padding:         "14px 20px",
              backgroundColor: "#fff",
              color:           "#111827",
              border:          "1px solid #d1d5db",
              borderRadius:    "10px",
              fontSize:        "15px",
              fontWeight:      "500",
              cursor:          "pointer",
              whiteSpace:      "nowrap",
            }}
          >
            📷 Add Photos
          </button>
          <button
            onClick={() => console.log("Report Issue clicked — auth required")}
            style={{
              padding:         "14px 20px",
              backgroundColor: "#fff",
              color:           "#111827",
              border:          "1px solid #d1d5db",
              borderRadius:    "10px",
              fontSize:        "15px",
              fontWeight:      "500",
              cursor:          "pointer",
              whiteSpace:      "nowrap",
            }}
          >
            Report Issue
          </button>
        </div>

      </div>
    </div>
  );
}

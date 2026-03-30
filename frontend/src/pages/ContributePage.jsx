import { useNavigate } from "react-router-dom";

// ---------------------------------------------------------------------------
// ContributePage
// Route: /contribute (protected)
// Matches Image 3 mockup — two action cards + "Why contribute?" section
// ---------------------------------------------------------------------------

export default function ContributePage() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>

        {/* Header — matches Image 3 */}
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#111827", margin: "0 0 6px" }}>
          Contribute Information
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 28px" }}>
          Help others by sharing accessibility information about locations
        </p>

        {/* Two action cards — side by side (Image 3) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "28px" }}>

          {/* Add Photos card */}
          <div
            style={{
              backgroundColor: "#fff",
              border:          "1.5px solid #e5e7eb",
              borderRadius:    "14px",
              padding:         "32px 24px",
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "center",
              textAlign:       "center",
              gap:             "16px",
            }}
          >
            {/* Blue camera icon circle (Image 3) */}
            <div
              style={{
                width:           "72px",
                height:          "72px",
                borderRadius:    "50%",
                backgroundColor: "#dbeafe",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                fontSize:        "30px",
              }}
            >
              📷
            </div>

            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#111827" }}>
              Add Photos
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
              Upload photos of entrances, parking, ramps, and other accessibility features
            </p>
            <button
              onClick={() => navigate("/contribute/photos")}
              style={{
                width:           "100%",
                padding:         "11px",
                backgroundColor: "#fff",
                color:           "#111827",
                border:          "1.5px solid #d1d5db",
                borderRadius:    "8px",
                fontSize:        "14px",
                fontWeight:      "600",
                cursor:          "pointer",
                marginTop:       "4px",
              }}
            >
              Get Started
            </button>
          </div>

          {/* Add Features card */}
          <div
            style={{
              backgroundColor: "#fff",
              border:          "1.5px solid #e5e7eb",
              borderRadius:    "14px",
              padding:         "32px 24px",
              display:         "flex",
              flexDirection:   "column",
              alignItems:      "center",
              textAlign:       "center",
              gap:             "16px",
            }}
          >
            {/* Green pin icon circle (Image 3) */}
            <div
              style={{
                width:           "72px",
                height:          "72px",
                borderRadius:    "50%",
                backgroundColor: "#dcfce7",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                fontSize:        "30px",
              }}
            >
              📍
            </div>

            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#111827" }}>
              Add Features
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
              Share information about parking, door widths, restrooms, and building features
            </p>
            <button
              onClick={() => navigate("/contribute/features")}
              style={{
                width:           "100%",
                padding:         "11px",
                backgroundColor: "#fff",
                color:           "#111827",
                border:          "1.5px solid #d1d5db",
                borderRadius:    "8px",
                fontSize:        "14px",
                fontWeight:      "600",
                cursor:          "pointer",
                marginTop:       "4px",
              }}
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Why contribute? section — light blue box (Image 3) */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border:          "1px solid #bfdbfe",
            borderRadius:    "12px",
            padding:         "20px 24px",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", color: "#1e40af" }}>
            Why contribute?
          </h3>
          <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li style={{ fontSize: "14px", color: "#1e3a8a" }}>
              Help people with disabilities make informed decisions about accessibility.
            </li>
            <li style={{ fontSize: "14px", color: "#1e3a8a" }}>
              All contributions are reviewed before going live.
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}


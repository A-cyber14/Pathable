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

        {/* Header */}
        <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#111827", margin: "0 0 28px" }}>
          Contribute
        </h1>

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
            <div
              style={{
                width:           "72px",
                height:          "72px",
                borderRadius:    "50%",
                backgroundColor: "#dbeafe",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>

            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#111827" }}>
              Add Photos
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
              Help visitors know what to expect.
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
            <div
              style={{
                width:           "72px",
                height:          "72px",
                borderRadius:    "50%",
                backgroundColor: "#dcfce7",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <path d="m9 14 2 2 4-4"/>
              </svg>
            </div>

            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#111827" }}>
              Add Features
            </h2>
            <p style={{ margin: 0, fontSize: "14px", color: "#6b7280", lineHeight: "1.5" }}>
              Share parking, doors, and restroom details.
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

      </div>
    </div>
  );
}


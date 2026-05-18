import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// LoginPage
// Route: /login
// Simple sign in screen — Google OAuth only per task requirements.
// Redirects to / after successful login.
// Style matches the app's clean, accessible aesthetic.
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // If already signed in, redirect to home immediately
  useEffect(() => {
    if (currentUser) navigate("/");
  }, [currentUser, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      console.error("Google sign-in failed:", err.message);
    }
  };

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        height:         "100vh",
        backgroundColor: "#f9fafb",
        fontFamily:     "sans-serif",
        padding:        "24px",
      }}
    >
      {/* Card */}
      <div
        style={{
          backgroundColor: "#fff",
          border:          "1px solid #e5e7eb",
          borderRadius:    "16px",
          padding:         "48px 40px",
          maxWidth:        "400px",
          width:           "100%",
          textAlign:       "center",
          boxShadow:       "0 4px 24px rgba(0,0,0,0.07)",
        }}
      >
        {/* Pathable logo */}
        <img src="/logo.png" alt="Pathable" style={{ width: "72px", height: "72px", objectFit: "contain", marginBottom: "12px" }} />

        {/* Title */}
        <h1
          style={{
            fontSize:     "24px",
            fontWeight:   "800",
            color:        "#111827",
            margin:       "0 0 8px",
          }}
        >
          Sign in to Pathable
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize:     "14px",
            color:        "#6b7280",
            margin:       "0 0 32px",
            lineHeight:   "1.5",
          }}
        >
          Find accessible locations in Pinellas County, FL
        </p>

        {/* Google sign in button */}
        <button
          onClick={handleGoogleSignIn}
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            gap:             "10px",
            width:           "100%",
            padding:         "13px 20px",
            backgroundColor: "#fff",
            border:          "1.5px solid #d1d5db",
            borderRadius:    "10px",
            fontSize:        "15px",
            fontWeight:      "600",
            color:           "#111827",
            cursor:          "pointer",
            transition:      "background-color 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f9fafb";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fff";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Google "G" SVG */}
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>

        {/* Guest note */}
        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "20px" }}>
          You can also{" "}
          <span
            onClick={() => navigate("/")}
            style={{ color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
          >
            browse without signing in
          </span>
        </p>
      </div>
    </div>
  );
}

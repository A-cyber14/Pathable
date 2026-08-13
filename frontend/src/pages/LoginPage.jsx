import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// LoginPage
// Route: /login
// Sign in with Google, or with email/password (same Firebase project — just
// a second enabled auth method, not a separate auth system).
// Redirects to / after successful login; brand-new users get routed onward
// to onboarding by ProfileGate in App.jsx once their profile loads.
// ---------------------------------------------------------------------------

const FRIENDLY_ERRORS = {
  "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
  "auth/invalid-email":        "That doesn't look like a valid email address.",
  "auth/weak-password":        "Password must be at least 6 characters.",
  "auth/wrong-password":       "Incorrect email or password.",
  "auth/user-not-found":       "Incorrect email or password.",
  "auth/invalid-credential":   "Incorrect email or password.",
  "auth/too-many-requests":    "Too many attempts. Please wait a moment and try again.",
};

function friendlyError(err) {
  return FRIENDLY_ERRORS[err?.code] || "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const { currentUser, loginWithGoogle, signUpWithEmail, signInWithEmail } = useAuth();
  const navigate = useNavigate();

  const [mode,      setMode]      = useState("signin"); // "signin" | "signup"
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState(null);
  const [signupMsg, setSignupMsg] = useState(false);

  // If already signed in, redirect to home immediately — but not while the
  // post-signup "check your email" screen is showing (sign-up itself signs
  // the user in, which would otherwise race this redirect and skip it).
  useEffect(() => {
    if (currentUser && !signupMsg) navigate("/");
  }, [currentUser, navigate, signupMsg]);

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      console.error("Google sign-in failed:", err.message);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const signingUp = mode === "signup";
    // Set this *before* awaiting sign-up, not after — createUserWithEmailAndPassword
    // fires Firebase's onAuthStateChanged (which flips currentUser truthy) before our
    // own await resolves, so setting the flag afterward loses the race against the
    // redirect-home effect above and the "check your email" screen never shows.
    if (signingUp) setSignupMsg(true);
    try {
      if (signingUp) {
        await signUpWithEmail(email.trim(), password);
      } else {
        await signInWithEmail(email.trim(), password);
        navigate("/");
      }
    } catch (err) {
      if (signingUp) setSignupMsg(false);
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", fontSize: "14px",
    border: "1.5px solid #d1d5db", borderRadius: "10px", outline: "none",
    boxSizing: "border-box", color: "#111827", fontFamily: "sans-serif",
  };

  // ── Post-signup: check your inbox ───────────────────────────────────────
  if (signupMsg) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: "sans-serif", padding: "24px" }}>
        <div style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "40px", maxWidth: "400px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#eff6ff",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 6-10 7L2 6" />
            </svg>
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#111827", margin: "0 0 8px" }}>Verify your email</h1>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px", lineHeight: "1.6" }}>
            We sent a link to <strong>{email}</strong>. You can continue now — verifying just confirms it's you.
          </p>
          <button
            onClick={() => navigate("/")}
            style={{ width: "100%", padding: "13px", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        minHeight:      "100vh",
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
          {mode === "signup" ? "Create your Pathable account" : "Sign in to Pathable"}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize:     "14px",
            color:        "#6b7280",
            margin:       "0 0 28px",
            lineHeight:   "1.5",
          }}
        >
          Find accessible locations in Pinellas County, FL
        </p>

        {/* Email/password form */}
        <form onSubmit={handleEmailSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", textAlign: "left" }}>
          <label htmlFor="login-email" style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            style={inputStyle}
          />
          <label htmlFor="login-password" style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", marginTop: "4px" }}>Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            style={inputStyle}
          />

          {error && (
            <p role="alert" style={{ color: "#dc2626", fontSize: "13px", margin: "2px 0 0" }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", padding: "13px", marginTop: "6px",
              backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "10px",
              fontSize: "15px", fontWeight: "700", cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(null); }}
          style={{ background: "none", border: "none", color: "#2563eb", fontSize: "13px", fontWeight: "600", cursor: "pointer", padding: "0 0 20px" }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New to Pathable? Create an account"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 20px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }} />
          <span style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px" }}>or</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }} />
        </div>

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

import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ---------------------------------------------------------------------------
// Navbar
// Matches the left sidebar in all mockups (Images 1–6):
// - Narrow vertical bar, fixed left
// - Blue ♿ logo at top navigates to /
// - Icon nav items: Home, Bookmarks, Contribute, Profile
// - Active item gets a blue filled circle
// - Person icon at bottom = profile
// - Login/logout at very bottom
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { path: "/",          icon: "⌂",  label: "Home"       },
  { path: "/bookmarks", icon: "🔖", label: "Bookmarks"  },
  { path: "/contribute",icon: "＋", label: "Contribute" },
];

export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { currentUser, logout } = useAuth();

  // Hide sidebar on login page — matches mockups (no sidebar on login)
  if (location.pathname === "/login") return null;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const iconBtnStyle = (active) => ({
    width:           "44px",
    height:          "44px",
    borderRadius:    "50%",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    fontSize:        "20px",
    cursor:          "pointer",
    border:          "none",
    backgroundColor: active ? "#2563eb" : "transparent",
    color:           active ? "#fff" : "#6b7280",
    transition:      "background-color 0.15s, color 0.15s",
    textDecoration:  "none",
  });

  return (
    <div
      style={{
        position:        "fixed",
        top:             0,
        left:            0,
        width:           "68px",
        height:          "100vh",
        backgroundColor: "#fff",
        borderRight:     "1px solid #e5e7eb",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        paddingTop:      "12px",
        paddingBottom:   "16px",
        zIndex:          100,
        gap:             "4px",
      }}
    >
      {/* Logo — blue ♿ icon, matches mockups top-left */}
      <Link
        to="/"
        style={{
          width:           "44px",
          height:          "44px",
          borderRadius:    "10px",
          backgroundColor: "#2563eb",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          fontSize:        "22px",
          color:           "#fff",
          textDecoration:  "none",
          marginBottom:    "16px",
          flexShrink:      0,
        }}
        title="Pathable"
      >
        ♿
      </Link>

      {/* Main nav items */}
      {NAV_ITEMS.map(({ path, icon, label }) => (
        <Link
          key={path}
          to={path}
          title={label}
          style={iconBtnStyle(isActive(path))}
        >
          {icon}
        </Link>
      ))}

      {/* Spacer — pushes profile + auth to bottom */}
      <div style={{ flex: 1 }} />

      {/* Profile */}
      <Link
        to="/profile"
        title="Profile"
        style={{
          ...iconBtnStyle(isActive("/profile")),
          // Active profile uses filled blue circle (matches Image 4/5)
          backgroundColor: isActive("/profile") ? "#2563eb" : "#f3f4f6",
          color:           isActive("/profile") ? "#fff" : "#6b7280",
        }}
      >
        👤
      </Link>

      {/* Login / Logout */}
      {currentUser ? (
        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            ...iconBtnStyle(false),
            backgroundColor: "transparent",
            fontSize:        "16px",
            marginTop:       "4px",
          }}
        >
          ↩
        </button>
      ) : (
        <Link
          to="/login"
          title="Login"
          style={{
            ...iconBtnStyle(false),
            fontSize:   "14px",
            fontWeight: "700",
            marginTop:  "4px",
          }}
        >
          →
        </Link>
      )}
    </div>
  );
}

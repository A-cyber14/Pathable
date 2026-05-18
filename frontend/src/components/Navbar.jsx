import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

// ---------------------------------------------------------------------------
// SVG icons — all use currentColor so active/hover tinting works automatically
// ---------------------------------------------------------------------------

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function BookmarkSVGIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav item sets
// Regular users:  Profile → Map → Bookmarks
// Business users: Business Profile → Map  (minimal, focused)
// Admin users:    Admin → Map
// ---------------------------------------------------------------------------

const USER_NAV_ITEMS = [
  { path: "/profile",          icon: <PersonIcon />,       label: "Profile",  shortLabel: "Profile"  },
  { path: "/",                 icon: <MapPinIcon />,        label: "Map",      shortLabel: "Home"     },
  { path: "/bookmarks",        icon: <BookmarkSVGIcon />,   label: "Bookmarks",shortLabel: "Saved"    },
];

const BUSINESS_NAV_ITEMS = [
  { path: "/business-profile", icon: <PersonIcon />,        label: "Business Profile", shortLabel: "Profile" },
  { path: "/",                 icon: <MapPinIcon />,         label: "Map",              shortLabel: "Home"    },
];

const ADMIN_NAV_ITEMS = [
  { path: "/admin",            icon: <ShieldIcon />,         label: "Admin",  shortLabel: "Admin" },
  { path: "/",                 icon: <MapPinIcon />,         label: "Map",    shortLabel: "Home"  },
];

// Pages where the sidebar should be hidden (sign-in + onboarding).
const HIDDEN_PATHS = ["/login", "/account-type", "/business-setup"];

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------

export default function Navbar() {
  const location = useLocation();
  const [hovered, setHovered] = useState(null);
  const { userProfile } = useAuth();
  const isMobile = useIsMobile();

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const accountType = userProfile?.accountType;
  const navItems =
    accountType === "admin"    ? ADMIN_NAV_ITEMS    :
    accountType === "business" ? BUSINESS_NAV_ITEMS :
    USER_NAV_ITEMS;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  // --- Mobile: fixed bottom nav bar ---
  if (isMobile) {
    return (
      <nav style={{
        position:        "fixed",
        bottom:          0,
        left:            0,
        right:           0,
        height:          "64px",
        backgroundColor: "#fff",
        borderTop:       "1px solid #f0f0f0",
        boxShadow:       "0 -2px 12px rgba(0,0,0,0.06)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-around",
        paddingBottom:   "env(safe-area-inset-bottom, 0)",
        zIndex:          100,
      }}>
        {navItems.map(({ path, icon, shortLabel, label }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                gap:            "3px",
                color:          active ? "#2563eb" : "#9ca3af",
                textDecoration: "none",
                padding:        "6px 20px",
                minWidth:       "56px",
                transition:     "color 0.15s",
              }}
            >
              {icon}
              <span style={{
                fontSize:    "10px",
                fontWeight:  active ? "600" : "400",
                letterSpacing: "0.1px",
              }}>
                {shortLabel || label}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // --- Desktop: fixed left sidebar ---
  return (
    <div
      style={{
        position:        "fixed",
        top:             0,
        left:            0,
        width:           "68px",
        height:          "100vh",
        backgroundColor: "#fff",
        borderRight:     "1px solid #f3f4f6",
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        paddingTop:      "18px",
        paddingBottom:   "18px",
        zIndex:          100,
      }}
    >
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Pathable"
        title="Pathable"
        style={{
          width:        "46px",
          height:       "46px",
          objectFit:    "contain",
          flexShrink:   0,
          marginBottom: "24px",
          userSelect:   "none",
          borderRadius: "8px",
        }}
      />

      {/* Nav items */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
        {navItems.map(({ path, icon, label }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              title={label}
              onMouseEnter={() => setHovered(path)}
              onMouseLeave={() => setHovered(null)}
              style={{
                width:           "48px",
                height:          "48px",
                borderRadius:    "50%",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                backgroundColor: active ? "#2563eb" : hovered === path ? "#f3f4f6" : "transparent",
                color:           active ? "#fff" : "#6b7280",
                textDecoration:  "none",
                transition:      "background-color 0.15s, color 0.15s",
                cursor:          "pointer",
                flexShrink:      0,
              }}
            >
              {icon}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

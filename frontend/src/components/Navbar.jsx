import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
  { path: "/profile",          icon: <PersonIcon />,       label: "Profile"          },
  { path: "/",                 icon: <MapPinIcon />,        label: "Map"              },
  { path: "/bookmarks",        icon: <BookmarkSVGIcon />,   label: "Bookmarks"        },
];

const BUSINESS_NAV_ITEMS = [
  { path: "/business-profile", icon: <PersonIcon />,        label: "Business Profile" },
  { path: "/",                 icon: <MapPinIcon />,         label: "Map"              },
];

const ADMIN_NAV_ITEMS = [
  { path: "/admin",            icon: <ShieldIcon />,         label: "Admin"            },
  { path: "/",                 icon: <MapPinIcon />,         label: "Map"              },
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

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const accountType = userProfile?.accountType;
  const navItems =
    accountType === "admin"    ? ADMIN_NAV_ITEMS    :
    accountType === "business" ? BUSINESS_NAV_ITEMS :
    USER_NAV_ITEMS;

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

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
      <div
        title="Pathable"
        style={{
          width:           "44px",
          height:          "44px",
          borderRadius:    "50%",
          backgroundColor: "#2563eb",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          fontSize:        "20px",
          color:           "#fff",
          flexShrink:      0,
          marginBottom:    "28px",
          userSelect:      "none",
        }}
      >
        ♿
      </div>

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

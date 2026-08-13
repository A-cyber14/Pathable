import { useCallback, useState } from "react";

// Session-only — never persisted to localStorage or the user's profile.
const STORAGE_KEY = "pathable-user-location";

function readStoredLocation() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// status: "idle" | "loading" | "granted" | "denied" | "unavailable"
export function useGeolocation() {
  const [location, setLocation] = useState(readStoredLocation);
  const [status, setStatus] = useState(() => (readStoredLocation() ? "granted" : "idle"));

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        setStatus("granted");
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(coords));
        } catch { /* storage unavailable */ }
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  return { location, status, requestLocation };
}

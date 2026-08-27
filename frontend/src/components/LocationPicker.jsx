import { useEffect, useRef, useState } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { isValidZip, geocodeZip } from "../utils/zipGeocode";
import ZipConfirmModal from "./ZipConfirmModal";

const primaryBtn = {
  padding: "13px", backgroundColor: "#111827", color: "#fff", border: "none",
  borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer",
  minHeight: "48px",
};
const secondaryBtn = {
  padding: "13px", backgroundColor: "#fff", color: "#374151", border: "1.5px solid #d1d5db",
  borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer", minHeight: "48px",
};
const linkBtn = {
  background: "none", border: "none", color: "#2563eb", fontSize: "14px",
  fontWeight: "600", cursor: "pointer", padding: "8px 4px",
};

// ---------------------------------------------------------------------------
// LocationPicker — the "where should we look for places near you" flow.
// Used both in personal onboarding (LocationSetupPage) and Settings.
// Pure UI + geolocation/geocoding — the caller decides what to do with the
// result (persist to profile, navigate onward, etc).
//
// Props:
//   onSave({ lat, lng, zip, source, anchorEl }) — anchorEl (may be null) is
//     the button that triggered the save, for anchoring the caller's toast.
//   onSkip()   — omit to hide the "Skip for now" action (e.g. in Settings)
//   onCancel() — omit to hide the "Cancel" action (e.g. onboarding, where
//     "Skip for now" already covers backing out)
//   saving     — disables actions while the parent is persisting the result
// ---------------------------------------------------------------------------
export default function LocationPicker({ onSave, onSkip, onCancel, saving = false, autoStart = false }) {
  const { location, status: geoStatus, requestLocation } = useGeolocation();
  const [mode, setMode] = useState("choose"); // "choose" | "zip"
  const [zip, setZip] = useState("");
  const [zipError, setZipError] = useState(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [pendingZip, setPendingZip] = useState(null); // { zip, lat, lng, city, state, anchorEl }

  // useGeolocation() caches its "granted" status (and coordinates) in
  // sessionStorage, so a fresh mount of this component can already report
  // geoStatus === "granted" purely from an earlier grant elsewhere in the
  // session (e.g. onboarding) — not from anything the user just clicked
  // here. Only auto-save when THIS instance actually asked for a fresh fix,
  // otherwise clicking "Change" would silently overwrite a ZIP the user is
  // about to enter with stale cached GPS coordinates the moment it mounts.
  const requestedRef = useRef(false);
  // The button stays mounted through the whole async permission/lookup
  // wait, so it's safe to read this back once geoStatus resolves.
  const anchorRef = useRef(null);

  const useMyLocation = (e) => {
    anchorRef.current = e?.currentTarget ?? null;
    requestedRef.current = true;
    requestLocation();
  };

  useEffect(() => {
    if (requestedRef.current && geoStatus === "granted" && location) {
      requestedRef.current = false;
      onSave({ lat: location.lat, lng: location.lng, zip: null, source: "gps", anchorEl: anchorRef.current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, location]);

  // "Use current location" shortcut — always asks for a fresh fix (never
  // reuses a cached grant), since that's the whole point of this button.
  useEffect(() => {
    if (autoStart) useMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const handleZipSubmit = async (e) => {
    e.preventDefault();
    const anchorEl = e.currentTarget;
    if (!isValidZip(zip)) {
      setZipError("Enter a valid 5-digit ZIP code.");
      return;
    }
    setZipError(null);
    setZipLoading(true);
    try {
      const coords = await geocodeZip(zip);
      setPendingZip({ zip: zip.trim(), lat: coords.lat, lng: coords.lng, city: coords.city, state: coords.state, anchorEl });
    } catch (err) {
      setZipError(err.message || "Couldn't find that ZIP code.");
    } finally {
      setZipLoading(false);
    }
  };

  const confirmZip = () => {
    if (!pendingZip) return;
    const { zip: confirmedZip, lat, lng, anchorEl } = pendingZip;
    setPendingZip(null);
    onSave({ lat, lng, zip: confirmedZip, source: "zip", anchorEl });
  };

  const busy = saving || geoStatus === "loading" || zipLoading;

  if (mode === "zip") {
    return (
      <>
        <form onSubmit={handleZipSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label htmlFor="loc-zip" style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
            ZIP code
          </label>
          <input
            id="loc-zip"
            type="text"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            value={zip}
            onChange={(e) => { setZip(e.target.value.replace(/\D/g, "")); setZipError(null); }}
            placeholder="34685"
            autoFocus
            style={{
              padding: "12px 14px", fontSize: "16px", border: `1.5px solid ${zipError ? "#fca5a5" : "#d1d5db"}`,
              borderRadius: "10px", outline: "none", boxSizing: "border-box", color: "#111827",
            }}
          />
          {zipError && <p role="alert" style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{zipError}</p>}
          <button type="submit" disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>
            {zipLoading ? "Looking up…" : "Save ZIP code"}
          </button>
          <button type="button" onClick={() => setMode("choose")} style={linkBtn}>
            Back
          </button>
        </form>

        {pendingZip && (
          <ZipConfirmModal
            zip={pendingZip.zip}
            city={pendingZip.city}
            state={pendingZip.state}
            onConfirm={confirmZip}
            onCancel={() => setPendingZip(null)}
          />
        )}
      </>
    );
  }

  if (geoStatus === "denied" || geoStatus === "unavailable") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "#374151" }}>
          {geoStatus === "denied" ? "Location access wasn't enabled." : "Location unavailable."}
        </p>
        <button onClick={useMyLocation} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>
          Try again
        </button>
        <button onClick={() => setMode("zip")} disabled={busy} style={secondaryBtn}>
          Enter ZIP code
        </button>
        {onSkip && (
          <button onClick={onSkip} disabled={busy} style={linkBtn}>
            Skip for now
          </button>
        )}
        {onCancel && (
          <button onClick={onCancel} disabled={busy} style={linkBtn}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <button onClick={useMyLocation} disabled={busy} style={{ ...primaryBtn, opacity: busy ? 0.7 : 1 }}>
        {geoStatus === "loading" ? "Locating…" : "Use my location"}
      </button>
      <button onClick={() => setMode("zip")} disabled={busy} style={secondaryBtn}>
        Enter ZIP code
      </button>
      {onSkip && (
        <button onClick={onSkip} disabled={busy} style={linkBtn}>
          Skip for now
        </button>
      )}
      {onCancel && (
        <button onClick={onCancel} disabled={busy} style={linkBtn}>
          Cancel
        </button>
      )}
    </div>
  );
}

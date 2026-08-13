import { waitForGoogle } from "./googleMaps";

export function isValidZip(zip) {
  return /^\d{5}$/.test(zip.trim());
}

// Resolves a 5-digit US ZIP to an approximate center point using the Google
// Maps JS Geocoder — the same script/key already loaded for Places search
// (see index.html), so this adds no new API or cost.
export async function geocodeZip(zip) {
  await waitForGoogle();
  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { componentRestrictions: { country: "US", postalCode: zip.trim() } },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          reject(new Error("Couldn't find that ZIP code"));
        }
      }
    );
  });
}

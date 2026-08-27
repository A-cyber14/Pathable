import { waitForGoogle } from "./googleMaps";

export function isValidZip(zip) {
  return /^\d{5}$/.test(zip.trim());
}

function componentByType(components, type) {
  return components.find((c) => c.types.includes(type)) || null;
}

// Resolves a 5-digit US ZIP to an approximate center point, plus the
// city/state it belongs to (for confirming the ZIP with the user before we
// use it), using the Google Maps JS Geocoder — the same script/key already
// loaded for Places search (see index.html), so this adds no new API or cost.
export async function geocodeZip(zip) {
  await waitForGoogle();
  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode(
      { componentRestrictions: { country: "US", postalCode: zip.trim() } },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          const result = results[0];
          const loc = result.geometry.location;
          const components = result.address_components || [];
          const city =
            componentByType(components, "locality") ||
            componentByType(components, "sublocality") ||
            componentByType(components, "administrative_area_level_3");
          const state = componentByType(components, "administrative_area_level_1");
          resolve({
            lat:   loc.lat(),
            lng:   loc.lng(),
            city:  city?.long_name || null,
            state: state?.short_name || null,
          });
        } else {
          reject(new Error("Couldn't find that ZIP code"));
        }
      }
    );
  });
}

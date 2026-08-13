const EARTH_RADIUS_MI = 3958.8;

// Businesses that have never been geocoded default to 0,0 — treat that as
// "no coordinates" rather than a real point off the coast of Africa.
export function hasCoordinates(lat, lng) {
  return typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);
}

// Great-circle distance in miles between two lat/lng points.
export function haversineDistanceMiles(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MI * c;
}

// "0.4 mi", "1.2 mi", "12 mi" — no false precision.
export function formatDistanceMiles(miles) {
  if (miles == null || Number.isNaN(miles)) return null;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

// Attaches `_distanceMiles` (or null) to each business and returns a new
// array. Businesses without coordinates keep `_distanceMiles: null`.
export function withDistances(businesses, origin) {
  if (!origin) return businesses.map((b) => ({ ...b, _distanceMiles: null }));
  return businesses.map((b) => {
    if (!hasCoordinates(b.latitude, b.longitude)) {
      return { ...b, _distanceMiles: null };
    }
    return {
      ...b,
      _distanceMiles: haversineDistanceMiles(origin.lat, origin.lng, b.latitude, b.longitude),
    };
  });
}

// Sorts nearest-first; businesses with unknown distance sort after all
// businesses with a known distance (stable order preserved among unknowns).
export function sortByDistance(businesses) {
  return [...businesses].sort((a, b) => {
    if (a._distanceMiles == null && b._distanceMiles == null) return 0;
    if (a._distanceMiles == null) return 1;
    if (b._distanceMiles == null) return -1;
    return a._distanceMiles - b._distanceMiles;
  });
}

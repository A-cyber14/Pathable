import { useEffect, useRef } from "react";

// Wait for Google Maps JS API to be ready
function waitForGoogle() {
  return new Promise((resolve) => {
    if (window.google?.maps) return resolve();
    const interval = setInterval(() => {
      if (window.google?.maps) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

const PINELLAS_CENTER = { lat: 27.9072, lng: -82.7169 };
const DEFAULT_ZOOM    = 11;

// Score-based fill color
function scoreColor(score) {
  if (score == null) return "#9ca3af";   // gray — no data
  if (score >= 75)   return "#16a34a";   // green — high confidence
  if (score >= 55)   return "#d97706";   // amber — moderate
  return "#dc2626";                      // red — low / limited
}

// Returns a Google Maps Symbol icon for a given state
function buildIcon(score, isSelected, isTopMatch) {
  const fill   = isSelected ? "#2563eb" : scoreColor(score);
  const stroke = isSelected ? "#1e40af" : "#ffffff";
  const scale  = isTopMatch ? 12 : isSelected ? 11 : 9;

  return {
    path:          window.google.maps.SymbolPath.CIRCLE,
    fillColor:     fill,
    fillOpacity:   1,
    strokeColor:   stroke,
    strokeWeight:  isSelected ? 3 : 2,
    scale,
  };
}

// ---------------------------------------------------------------------------
// MapView
// Props:
//   businesses       — business objects to show as markers
//   selectedBusiness — currently selected business or null
//   onSelectBusiness — called when a marker is clicked
//   mapCenter        — { lat, lng } to pan to (set by location search)
//   externalPlace    — external (non-Pathable) place to drop a temp yellow marker
// ---------------------------------------------------------------------------
export default function MapView({ businesses = [], selectedBusiness, onSelectBusiness, mapCenter, externalPlace }) {
  const mapRef            = useRef(null);
  const mapInstanceRef    = useRef(null);
  const markersRef        = useRef([]);
  const externalMarkerRef = useRef(null);

  // 1. Initialize map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    waitForGoogle().then(() => {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center:            PINELLAS_CENTER,
        zoom:              DEFAULT_ZOOM,
        zoomControl:       true,
        streetViewControl: false,
        mapTypeControl:    false,
        fullscreenControl: false,
      });
    });
  }, []);

  // 2. Pan + zoom when a location search result comes in
  useEffect(() => {
    if (!mapCenter || !mapInstanceRef.current) return;
    mapInstanceRef.current.panTo(mapCenter);
    mapInstanceRef.current.setZoom(13);
  }, [mapCenter]);

  // 3. Redraw markers when businesses list changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    // Clear old markers
    markersRef.current.forEach(({ marker }) => marker.setMap(null));
    markersRef.current = [];

    businesses.forEach((business, index) => {
      const isTopMatch = index === 0;
      const marker = new window.google.maps.Marker({
        position: { lat: business.latitude, lng: business.longitude },
        map:      mapInstanceRef.current,
        title:    business.name,
        icon:     buildIcon(business.accessibility_score, false, isTopMatch),
      });
      marker.addListener("click", () => onSelectBusiness(business));
      markersRef.current.push({ id: business.id, marker, business, isTopMatch });
    });
  }, [businesses]);

  // 4. Update all marker icons when selection changes (score-based color + selected highlight)
  useEffect(() => {
    markersRef.current.forEach(({ id, marker, business, isTopMatch }) => {
      const isSelected = selectedBusiness?.id === id;
      marker.setIcon(buildIcon(business.accessibility_score, isSelected, isTopMatch));
      if (isSelected) mapInstanceRef.current?.panTo(marker.getPosition());
    });
  }, [selectedBusiness]);

  // 5. Drop/clear a temporary yellow marker for external (non-Pathable) places
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear previous temp marker
    if (externalMarkerRef.current) {
      externalMarkerRef.current.setMap(null);
      externalMarkerRef.current = null;
    }

    if (externalPlace?.latitude && externalPlace?.longitude) {
      const pos = { lat: externalPlace.latitude, lng: externalPlace.longitude };
      externalMarkerRef.current = new window.google.maps.Marker({
        position: pos,
        map:      mapInstanceRef.current,
        title:    externalPlace.name,
        icon:     PIN_YELLOW,
      });
      mapInstanceRef.current.panTo(pos);
      mapInstanceRef.current.setZoom(15);
    }
  }, [externalPlace]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}

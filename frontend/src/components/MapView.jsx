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
const PIN_RED         = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
const PIN_BLUE        = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
const PIN_YELLOW      = "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";

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

    businesses.forEach((business) => {
      const marker = new window.google.maps.Marker({
        position: { lat: business.latitude, lng: business.longitude },
        map:      mapInstanceRef.current,
        title:    business.name,
        icon:     PIN_RED,
      });
      marker.addListener("click", () => onSelectBusiness(business));
      markersRef.current.push({ id: business.id, marker });
    });
  }, [businesses]);

  // 4. Highlight selected marker in blue
  useEffect(() => {
    markersRef.current.forEach(({ id, marker }) => {
      const isSelected = selectedBusiness?.id === id;
      marker.setIcon(isSelected ? PIN_BLUE : PIN_RED);
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

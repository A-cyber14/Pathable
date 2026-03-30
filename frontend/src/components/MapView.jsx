import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Polls until window.google.maps is available, then resolves.
// Needed because the Maps script loads async — React mounts before it's ready.
// ---------------------------------------------------------------------------
function waitForGoogle() {
  return new Promise((resolve) => {
    if (window.google?.maps) return resolve();
    const interval = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
}

// ---------------------------------------------------------------------------
// MapView
// Renders a Google Maps embed with one marker per business.
// Red marker  = unselected  (matches Image 1)
// Blue marker = selected    (matches Image 8)
//
// Props:
//   businesses       — array of business objects from the API
//   selectedBusiness — currently selected business object, or null
//   onSelectBusiness — callback(business) fired when a marker is clicked
// ---------------------------------------------------------------------------

const PINELLAS_CENTER = { lat: 27.9072, lng: -82.7169 };
const DEFAULT_ZOOM    = 11;

const PIN_RED  = "http://maps.google.com/mapfiles/ms/icons/red-dot.png";
const PIN_BLUE = "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

export default function MapView({ businesses = [], selectedBusiness, onSelectBusiness }) {
  const mapRef        = useRef(null);   // DOM node
  const mapInstanceRef = useRef(null);  // google.maps.Map instance
  const markersRef    = useRef([]);     // array of { id, marker } objects

  // ------------------------------------------------------------------
  // 1. Initialize the map once window.google is ready and DOM node exists
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return;

    waitForGoogle().then(() => {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center:            PINELLAS_CENTER,
        zoom:              DEFAULT_ZOOM,
        disableDefaultUI:  false,
        zoomControl:       true,
        streetViewControl: false,
        mapTypeControl:    false,
        fullscreenControl: false,
      });
    });
  }, []);

  // ------------------------------------------------------------------
  // 2. Add / remove markers whenever the businesses list changes
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(({ marker }) => marker.setMap(null));
    markersRef.current = [];

    businesses.forEach((business) => {
      const marker = new window.google.maps.Marker({
        position: { lat: business.latitude, lng: business.longitude },
        map:       mapInstanceRef.current,
        title:     business.name,
        icon:      PIN_RED,
      });

      marker.addListener("click", () => {
        onSelectBusiness(business);
      });

      markersRef.current.push({ id: business.id, marker });
    });
  }, [businesses]);

  // ------------------------------------------------------------------
  // 3. Update marker colors when selection changes (Image 1 vs Image 8)
  // ------------------------------------------------------------------
  useEffect(() => {
    markersRef.current.forEach(({ id, marker }) => {
      const isSelected = selectedBusiness?.id === id;
      marker.setIcon(isSelected ? PIN_BLUE : PIN_RED);

      // Pan map to selected marker
      if (isSelected) {
        mapInstanceRef.current?.panTo(marker.getPosition());
      }
    });
  }, [selectedBusiness]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

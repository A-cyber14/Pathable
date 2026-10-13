// Shared wait for the Google Maps JS API (loaded once, globally, in index.html).
export function waitForGoogle() {
  return new Promise((resolve) => {
    // With loading=async the google.maps namespace exists before its classes
    // do — wait for Map itself, or `new google.maps.Map` can throw.
    if (window.google?.maps?.Map) return resolve();
    const interval = setInterval(() => {
      if (window.google?.maps?.Map) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

// Shared wait for the Google Maps JS API (loaded once, globally, in index.html).
export function waitForGoogle() {
  return new Promise((resolve) => {
    if (window.google?.maps) return resolve();
    const interval = setInterval(() => {
      if (window.google?.maps) { clearInterval(interval); resolve(); }
    }, 100);
  });
}

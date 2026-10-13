import { useEffect } from "react";

// Fades .pl-reveal elements in as they scroll into view. Content is never
// hidden from assistive tech (opacity only), reduced-motion users get it
// immediately via CSS, and browsers without IntersectionObserver just show
// everything.
export function useReveal(deps = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".pl-reveal:not(.is-in)"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function usePrefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

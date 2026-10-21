import { useEffect } from "react";

/**
 * Adds `.in-view` to every `[data-mizuki-reveal]` descendant once it enters
 * the viewport, then stops observing it. Pairs with `.mizuki-on-scroll`
 * styles in styles/mizuki-reveal.css. Re-runs when `deps` change so route
 * swaps re-scan fresh content. No-op under prefers-reduced-motion (CSS
 * already renders elements visible in that case).
 */
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        }
      },
      { root: null, rootMargin: "0px 0px -100px 0px", threshold: 0.1 },
    );

    for (const el of document.querySelectorAll("[data-mizuki-reveal]")) {
      if (!el.classList.contains("in-view")) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls re-runs via deps
  }, deps);
}

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Lenis from "lenis";

/**
 * Attaches Lenis smooth scrolling to the active page's `<main>` scroll
 * container and re-initializes on route changes.
 *
 * Each page renders its own `<main className="overflow-y-auto">` as the real
 * scroller (the app shell is `overflow-hidden`), so Lenis is pointed at that
 * element. Lenis animates the element's real `scrollTop` rather than applying
 * a CSS transform, so `content-visibility` and IntersectionObserver-based
 * lazy mounting (DeferRender) keep working.
 */
export function useSmoothScroll() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Respect users who ask for reduced motion — fall back to native scroll.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const main = document.querySelector("main");
    if (!main) return;

    const lenis = new Lenis({
      // `wrapper` is the scroller; its children ARE the content, so let
      // `content` default to the wrapper. Forcing it to the first child
      // makes Lenis measure only that child's height and clamp scrolling
      // short of the real bottom.
      wrapper: main,
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Content height changes as DeferRender lazily mounts charts deeper in
    // the tree. Re-measure on any DOM mutation or size change in the scroller
    // so Lenis's max scroll stays in sync (otherwise the bottom is unreachable
    // until a manual resize).
    //
    // Coalesce resizes to once per frame: chart re-renders and ring/clock
    // updates fire DOM mutations in bursts, and an un-throttled lenis.resize()
    // on each one stutters scrolling on heavy pages like the dashboard.
    let resizeScheduled = 0;
    const resize = () => {
      if (resizeScheduled) return;
      resizeScheduled = requestAnimationFrame(() => {
        resizeScheduled = 0;
        lenis.resize();
      });
    };
    const ro = new ResizeObserver(resize);
    ro.observe(main);
    const mo = new MutationObserver(resize);
    mo.observe(main, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      if (resizeScheduled) cancelAnimationFrame(resizeScheduled);
      ro.disconnect();
      mo.disconnect();
      lenis.destroy();
    };
  }, [pathname]);
}

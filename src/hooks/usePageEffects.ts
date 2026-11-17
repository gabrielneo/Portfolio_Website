import { useEffect, useState } from "react";

/** Which section is currently in view, for highlighting the nav. */
export function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0];
        setActive(best && best[1] > 0 ? best[0] : "");
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

/** Reading progress (0–1) and whether the page has scrolled past the hero. */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return progress;
}

/**
 * Fades [data-reveal] elements in as they scroll into view. Content is visible
 * by default (and in the pre-rendered HTML); the hidden starting state only
 * applies once this has run, never with reduced motion, and never to anything
 * already on screen or above it: a visitor never sees content vanish and fade
 * back in after the page has loaded, wherever they landed (#projects included).
 */
export function useScrollReveal() {
  useEffect(() => {
    // A link to a section (#projects): go there now. The pre-rendered HTML normally lets the browser do it; this covers `npm run dev`.
    const target = window.location.hash.length > 1 ? document.getElementById(decodeURIComponent(window.location.hash.slice(1))) : null;
    if (target && window.scrollY === 0 && target.getBoundingClientRect().top > window.innerHeight / 2) target.scrollIntoView({ block: "start" });
    // From here on, in-page links glide (index.css); the landing jump above and the browser's own are instant.
    const smooth = requestAnimationFrame(() => document.documentElement.classList.add("smooth-scroll"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => cancelAnimationFrame(smooth);
    const root = document.documentElement;
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.setAttribute("data-shown", "");
    });
    root.classList.add("js-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-shown", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll("[data-reveal]:not([data-shown])").forEach((el) => observer.observe(el));
    return () => {
      cancelAnimationFrame(smooth);
      observer.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
}

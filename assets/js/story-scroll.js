/**
 * Full-viewport storytelling (GSAP + ScrollTrigger).
 *
 * Crossfade handoffs: as you scroll, the current scene fades/slides out while the
 * next fades/slides in. This keeps the page continuous, cinematic, and calm.
 *
 * Sets window.__storyScrollProgress and per-scene maps for Three.js ambience.
 * Reduced motion: initStoryScroll is not called (see main.js).
 */
window.initStoryScroll = function initStoryScroll(allowMotion) {
  if (!allowMotion) return;
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  if (document.documentElement.dataset.motion === "off") return;

  gsap.registerPlugin(ScrollTrigger);

  const scenes = gsap.utils
    .toArray("[data-scene]")
    .map((el) => ({
      el,
      id: el.getAttribute("data-scene") || el.dataset.scene || "",
    }))
    .filter((s) => s.el && s.id);

  const sceneProgress = Object.create(null);
  for (const s of scenes) sceneProgress[s.id] = 0;
  window.__storyScene = scenes[0]?.id || "hero";
  window.__storySceneProgress = sceneProgress;

  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      window.__storyScrollProgress = self.progress;
    },
  });

  const midpoint = (st) => (st.start + st.end) / 2;
  let scenePickT = 0;
  const pickActiveScene = () => {
    if (scenePickT) return;
    scenePickT = requestAnimationFrame(() => {
      scenePickT = 0;
      const y = ScrollTrigger.scroll();
      const viewMid = y + window.innerHeight * 0.5;
      let best = { id: window.__storyScene, d: Number.POSITIVE_INFINITY };
      for (const s of scenes) {
        const st = s.__track;
        if (!st) continue;
        const d = Math.abs(midpoint(st) - viewMid);
        if (d < best.d) best = { id: s.id, d };
      }
      window.__storyScene = best.id;
    });
  };

  // Long-range triggers for WebGL scene selection + progress (cheap, no scrub).
  scenes.forEach((s) => {
    s.__track = ScrollTrigger.create({
      trigger: s.el,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        sceneProgress[s.id] = self.progress;
        pickActiveScene();
      },
      onEnter: pickActiveScene,
      onEnterBack: pickActiveScene,
      onRefresh: pickActiveScene,
    });
  });

  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const smoothstep = (t) => t * t * (3 - 2 * t);

  // Crossfade every scene's inner content as it passes through the viewport.
  // This creates the "current fades out while next fades in" feeling naturally
  // because both are animated over overlapping scroll ranges.
  scenes.forEach((s, idx) => {
    const inner = s.el.querySelector("[data-scene-inner]");
    if (!inner) return;

    // Stable stacking: later scenes naturally sit above earlier scenes during overlap.
    gsap.set(s.el, { position: "relative", zIndex: idx + 1 });
    gsap.set(inner, { autoAlpha: 0, y: 26, force3D: true });

    ScrollTrigger.create({
      trigger: s.el,
      // Wide overlap so the handoff reads as cinematic, not abrupt.
      start: "top 85%",
      end: "bottom 15%",
      scrub: true,
      fastScrollEnd: true,
      onUpdate: (self) => {
        const p = self.progress; // 0..1 through the section's influence range

        // Fade in (0..0.32), hold, fade out (0.68..1).
        const inT = clamp01(p / 0.32);
        const outT = clamp01((p - 0.68) / 0.32);
        const fadeIn = smoothstep(inT);
        const fadeOut = smoothstep(outT);
        const alpha = clamp01(fadeIn * (1 - fadeOut));

        // Gentle staging: drift up a touch as it leaves.
        const y = (1 - fadeIn) * 26 + fadeOut * -18;

        gsap.set(inner, { autoAlpha: alpha, y });
      },
    });
  });

  gsap.utils.toArray(".timeline-card").forEach((card) => {
    gsap.fromTo(
      card,
      { autoAlpha: 0.62, y: 16 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        ease: "power2.out",
        scrollTrigger: {
          trigger: card,
          start: "top 92%",
          toggleActions: "play none none none",
          once: true,
        },
      },
    );
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
  requestAnimationFrame(() => ScrollTrigger.refresh());

  let resizeT = 0;
  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => ScrollTrigger.refresh(), 150);
    },
    { passive: true },
  );
};

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function setMotionMode() {
  const off = prefersReducedMotion();
  document.documentElement.dataset.motion = off ? "off" : "on";
  return !off;
}

// Flag View Transitions API support so CSS can hand off its own transitions
// to VT and avoid double-animating the same element.
function flagViewTransitions() {
  if (typeof document.startViewTransition === "function") {
    document.documentElement.classList.add("vt-enabled");
  }
}

// Dark-only site: no theme toggling logic needed.

function initMobileMenu() {
  const header = document.getElementById("siteHeader");
  const button = document.getElementById("menuButton");
  const menu = document.getElementById("mobileMenu");
  if (!button || !menu) return;

  // Start in a fully-hidden state for assistive tech so collapsed menu items
  // are never announced or tab-focused.
  menu.setAttribute("aria-hidden", "true");
  menu.setAttribute("inert", "");

  // Keep the `hidden` toggle for no-JS fallback, but layer a data attribute
  // so CSS can animate open/close smoothly.
  const close = () => {
    if (button.getAttribute("aria-expanded") !== "true") return;
    menu.setAttribute("data-open", "false");
    button.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
    menu.setAttribute("inert", "");
    setTimeout(() => {
      if (menu.getAttribute("data-open") === "false") menu.classList.add("hidden");
    }, 220);
  };
  const open = () => {
    menu.classList.remove("hidden");
    menu.removeAttribute("inert");
    menu.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => menu.setAttribute("data-open", "true"));
    button.setAttribute("aria-expanded", "true");
  };

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const expanded = button.getAttribute("aria-expanded") === "true";
    expanded ? close() : open();
  });

  // Close when any nav link inside the menu is tapped.
  menu.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) close();
  });

  // Click-outside: any tap outside the header while the menu is open closes it.
  document.addEventListener("click", (e) => {
    if (button.getAttribute("aria-expanded") !== "true") return;
    if (header && !header.contains(e.target)) close();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) close();
  });
}

// Elevates the header on scroll and drives the reading-progress bar.
// Uses a single rAF-throttled scroll listener so cost stays cheap.
function initStickyNav() {
  const header = document.getElementById("siteHeader");
  const bar = document.querySelector("#navProgress > span");
  if (!header && !bar) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;
    if (header) {
      header.setAttribute("data-elevated", y > 8 ? "true" : "false");
    }
    if (bar) {
      const doc = document.documentElement;
      const max = Math.max(1, (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight);
      const pct = Math.max(0, Math.min(100, (y / max) * 100));
      bar.style.width = `${pct}%`;
    }
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

// Scroll-spy: the section whose top has just crossed under the sticky header
// wins. This is deterministic (no timing flicker), respects the actual header
// height, and clamps to the last section when the user reaches the bottom.
function initScrollSpy() {
  const links = Array.from(document.querySelectorAll('a[href^="#"]'))
    .filter((a) => (a.getAttribute("href")?.length ?? 0) > 1)
    .filter((a) => a.classList.contains("navlink") || a.classList.contains("navlink-mobile"));
  if (!links.length) return;

  const ids = Array.from(new Set(links.map((a) => a.getAttribute("href").slice(1))));
  const sections = ids
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((s) => s.el);
  if (!sections.length) return;

  const byId = new Map();
  for (const a of links) {
    const id = a.getAttribute("href").slice(1);
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(a);
  }

  const header = document.getElementById("siteHeader");
  const getOffset = () => (header ? header.getBoundingClientRect().height : 0) + 24;

  let currentId = null;
  const setActive = (id) => {
    if (id === currentId) return;
    currentId = id;
    for (const [key, as] of byId.entries()) {
      for (const a of as) {
        if (id && key === id) {
          a.setAttribute("data-active", "true");
          a.setAttribute("aria-current", "location");
        } else {
          a.removeAttribute("data-active");
          a.removeAttribute("aria-current");
        }
      }
    }
  };

  let ticking = false;
  const compute = () => {
    ticking = false;
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportH = window.innerHeight;
    const pageH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);

    // Bottom of page: pin to the last section (e.g. Contact), even if its
    // bounding box is short. This avoids the last item never becoming active.
    if (scrollY + viewportH >= pageH - 4) {
      setActive(sections[sections.length - 1].id);
      return;
    }

    const offset = getOffset();
    // Pick the section whose top is closest to the header offset line.
    // This updates earlier than the "top crossed" rule, which can feel late
    // when sections are shorter and crossfading.
    let best = { id: null, d: Number.POSITIVE_INFINITY };
    for (const { id, el } of sections) {
      const rect = el.getBoundingClientRect();
      // Only consider sections that are meaningfully in view.
      if (rect.bottom <= offset + 8) continue;
      if (rect.top >= viewportH * 0.82) continue;
      const d = Math.abs(rect.top - offset);
      if (d < best.d) best = { id, d };
    }
    setActive(best.id);
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(compute);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  compute();
}

// Native CSS `scroll-behavior: smooth` + `scroll-padding-top` handles most of
// the work. This wrapper just makes sure reduced-motion users jump instantly
// and that we update the URL hash without the default anchor jump fighting
// the scroll. It does NOT hijack external links.
function initSmoothAnchors() {
  const supportsScrollSmooth = "scrollBehavior" in document.documentElement.style;
  const baseUrl = () => window.location.href.split("#")[0];
  const clearHashSoon = () => {
    if (!history.replaceState) return;
    // Let the scroll + focus happen, then clean the URL.
    // (scrollend isn't widely supported yet; this is a practical compromise.)
    setTimeout(() => history.replaceState(null, "", baseUrl()), 220);
  };

  // If the page is loaded with a hash, keep the scroll position but hide the fragment.
  if (window.location.hash && history.replaceState) {
    setTimeout(() => history.replaceState(null, "", baseUrl()), 0);
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href === "#" || href.length < 2) return;
    const target = document.getElementById(href.slice(1));
    if (!target) return;

    e.preventDefault();
    const motionOff = document.documentElement.dataset.motion === "off";
    const behavior = motionOff || !supportsScrollSmooth ? "auto" : "smooth";

    target.scrollIntoView({ behavior, block: "start" });
    // Briefly reflect the target in the URL (no jump), then hide it.
    if (history.replaceState) history.replaceState(null, "", href);
    clearHashSoon();
    // Move focus to the target for keyboard users (without re-scrolling).
    const prevTabindex = target.getAttribute("tabindex");
    if (prevTabindex === null) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    if (prevTabindex === null) {
      // Clean up so the tab order stays natural after focusing.
      setTimeout(() => target.removeAttribute("tabindex"), 400);
    }
  });
}

function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  // Default styles (so we can keep HTML clean).
  els.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    el.style.transition = "opacity 700ms ease, transform 700ms ease";
    el.style.willChange = "opacity, transform";
  });

  if (document.documentElement.dataset.motion === "off") {
    els.forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.transition = "none";
      el.classList.add("is-revealed");
    });
    return;
  }

  // Cache sibling index so stagger feels intentional (cap to avoid long cascades).
  const siblingIndex = new WeakMap();
  for (const el of els) {
    const parent = el.parentElement;
    if (!parent) continue;
    const siblings = Array.from(parent.children).filter((c) => c.classList.contains("reveal"));
    siblingIndex.set(el, Math.min(siblings.indexOf(el), 4));
  }

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const el = e.target;
          const idx = siblingIndex.get(el) ?? 0;
          el.style.transitionDelay = `${idx * 70}ms`;
          el.style.opacity = "1";
          el.style.transform = "none";
          el.classList.add("is-revealed");
          obs.unobserve(el);
        }
      }
    },
    { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
  );
  els.forEach((el) => obs.observe(el));
}

function injectUtilityClasses() {
  const style = document.createElement("style");
  style.textContent = `
    /* Mobile-first base. Spacing and type scale up at sm/md/lg. */
    .container { max-width: 72rem; margin-inline: auto; padding-inline: 1rem; }
    @media (min-width: 640px) { .container { padding-inline: 1.5rem; } }
    @media (min-width: 1024px) { .container { padding-inline: 2rem; } }

    .section { padding-block: 3rem; position: relative; isolation: isolate; overflow: hidden; }
    /* Scenes with pinned content must not clip (prevents pin "stick" feel). */
    .section.scene-pin { overflow: visible; }
    @media (min-width: 640px) { .section { padding-block: 4.5rem; } }
    @media (min-width: 1024px) { .section { padding-block: 5.5rem; } }
    /* Keep actual content above the ambient accents. */
    .section > .container { position: relative; z-index: 1; }

    /* ---------- Per-section ambient accents ----------
       Native radial-gradient backgrounds on each section. No blur filters,
       no pseudo-element animations, no will-change - because all of those
       forced continuous GPU compositing during scroll and tanked frame-rate.
       Radial gradients already fade softly, so visually indistinguishable
       from the blurred version, but effectively free for the compositor. */
    .section {
      background-image:
        radial-gradient(46rem 30rem at 0% 0%, rgba(42, 157, 143, .10), transparent 62%),
        radial-gradient(42rem 28rem at 100% 100%, rgba(38, 70, 83, .16), transparent 62%);
    }
    /* Alternate sections mirror the accent sides so scrolling has rhythm. */
    .section:nth-of-type(even) {
      background-image:
        radial-gradient(44rem 28rem at 100% 0%, rgba(127, 205, 191, .08), transparent 62%),
        radial-gradient(40rem 26rem at 0% 100%, rgba(42, 157, 143, .11), transparent 62%);
    }

    /* ---------- Drag-to-scroll enhancements (premium, subtle) ---------- */
    [data-drag-scroll] { scrollbar-width: thin; scrollbar-color: rgba(49,208,195,.4) transparent; }
    [data-drag-scroll]::-webkit-scrollbar { height: 10px; }
    [data-drag-scroll]::-webkit-scrollbar-thumb {
      background: rgba(49,208,195,.22);
      border-radius: 999px;
      border: 3px solid transparent;
      background-clip: padding-box;
    }
    [data-drag-scroll][data-overflowing] { cursor: grab; }
    [data-drag-scroll][data-dragging] { cursor: grabbing; }
    /* Allow vertical scrolling while enabling horizontal drag. */
    [data-drag-scroll][data-drag-scroll-axis="x"] { touch-action: pan-y; }

    /* Case studies carousel: keep cards readable and consistent widths on mobile. */
    .case-carousel { scroll-padding-left: 0.75rem; }
    @media (max-width: 767px) {
      .case-carousel { margin-inline: -0.25rem; padding-inline: 0.25rem; }
      .case-carousel > .case-card { min-width: 84%; max-width: 84%; flex: 0 0 auto; }
    }

    /* Thin top divider between consecutive sections - gentle horizon line. */
    .section + .section {
      box-shadow: inset 0 1px 0 0 rgba(42, 157, 143, .10);
    }

    /* ---------- Recruiter scan rhythm: takeaway + next-section preview ---------- */
    .takeaway-line { max-width: 42rem; }
    .section-tease {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.2rem 0.45rem;
      margin-top: 1.25rem;
      padding: 0.45rem 0.7rem;
      border-radius: var(--r-md);
      border: 1px solid rgba(49, 208, 195, 0.14);
      background: rgba(8, 18, 32, 0.32);
      font-size: 0.76rem;
      line-height: 1.25;
      color: rgba(215, 222, 230, 0.88);
      text-decoration: none;
      width: fit-content;
      max-width: fit-content;
      justify-self: start;
      align-self: flex-start;
      transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
    }
    .section-tease:hover {
      border-color: rgba(49, 208, 195, 0.36);
      background: rgba(8, 18, 32, 0.48);
      transform: translateY(-1px);
    }
    .section-tease:focus-visible {
      outline: 2px solid rgba(42, 157, 143, 0.55);
      outline-offset: 3px;
    }
    .section-tease-k {
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-size: 0.62rem;
      color: rgba(142, 242, 232, 0.95);
    }
    .section-tease-sep { opacity: 0.45; }
    .section-tease-mid { font-weight: 700; color: rgba(230, 237, 243, 0.96); }
    .section-tease-payoff { color: rgba(215, 222, 230, 0.72); }
    .section-tease-arrow { color: rgba(142, 242, 232, 0.85); margin-left: 0.05rem; }
    html[data-motion="off"] .section-tease:hover { transform: none; }

    /* Keep the preview compact on small screens. */
    @media (max-width: 639px) {
      .section-tease { margin-top: 1rem; }
      .section-tease-payoff { display: none; }
    }

    .card-proof {
      margin-top: 0.55rem;
      font-size: 0.72rem;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      font-weight: 700;
      color: rgba(127, 205, 191, 0.88);
    }

    /* Mobile: slightly tighter accent spread so it never dominates. */
    @media (max-width: 639px) {
      .section {
        background-image:
          radial-gradient(28rem 20rem at 0% 0%, rgba(42, 157, 143, .09), transparent 62%),
          radial-gradient(26rem 18rem at 100% 100%, rgba(38, 70, 83, .14), transparent 62%);
      }
      .section:nth-of-type(even) {
        background-image:
          radial-gradient(26rem 18rem at 100% 0%, rgba(127, 205, 191, .07), transparent 62%),
          radial-gradient(24rem 16rem at 0% 100%, rgba(42, 157, 143, .10), transparent 62%);
      }
    }

    .h2 { position: relative; font-size: 1.35rem; line-height: 1.75rem; font-weight: 600; letter-spacing: -0.015em; }
    @media (min-width: 640px) { .h2 { font-size: 1.75rem; line-height: 2.15rem; } }
    @media (min-width: 1024px) { .h2 { font-size: 1.95rem; line-height: 2.35rem; } }
    /* Subtle accent bar that draws in when the heading scrolls into view. */
    .h2.reveal::after { content: ""; display: block; margin-top: .6rem; height: 2px; width: 0;
      background: linear-gradient(90deg, #2A9D8F, rgba(42,157,143,0)); border-radius: 9999px;
      transition: width .7s ease .15s; }
    .h2.reveal.is-revealed::after { width: 2.5rem; }
    html[data-motion="off"] .h2.reveal::after { transition: none; width: 2.5rem; }

    .chip { display: inline-flex; align-items: center; border-radius: 9999px;
      padding: 0.375rem 0.8rem; font-size: 0.75rem; line-height: 1rem; font-weight: 500;
      border: 1px solid var(--border-soft); background: var(--surface-2);
      color: var(--text-md); backdrop-filter: blur(10px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      transition: transform .2s ease, border-color .2s ease, background .2s ease, color .2s ease; }
    .chip:hover { transform: translateY(-1px); border-color: var(--border-accent); color: var(--text-hi); background: var(--surface-3); }
    .dark .chip { color: var(--text-md); }
    html[data-motion="off"] .chip { transition: none; }
    html[data-motion="off"] .chip:hover { transform: none; }

    /* ---------- Brand identity block (navbar left) ---------- */
    .brand { min-height: 44px; padding: .25rem .35rem; transition: transform .15s ease; }
    .brand:hover { transform: translateY(-1px); }
    html[data-motion="off"] .brand { transition: none; }
    html[data-motion="off"] .brand:hover { transform: none; }

    .brand-text { display: grid; line-height: 1.05; }
    .brand-name { font-size: .92rem; font-weight: 700; letter-spacing: -0.015em; color: #E6EDF3; }
    .brand-sub { margin-top: .12rem; font-size: .72rem; color: rgba(174,185,198,.95); letter-spacing: .01em; }

    .brand-badge { position: relative; width: 40px; height: 40px; border-radius: 14px; display: grid; place-items: center;
      background: radial-gradient(circle at 30% 25%, rgba(49,208,195,.35), rgba(42,157,143,.18) 40%, rgba(8,18,32,.55) 72%),
                  linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0));
      border: 1px solid rgba(49,208,195,.24);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 14px 40px -26px rgba(49,208,195,.55);
      overflow: hidden;
    }

    .brand-badge::before { content: \"\"; position: absolute; inset: -10px; border-radius: 999px;
      background: radial-gradient(circle at 50% 50%, rgba(49,208,195,.22), rgba(49,208,195,0) 62%);
      filter: blur(2px); opacity: .95; }

    .brand-badge::after { content: \"\"; position: absolute; inset: -6px; border-radius: 999px;
      border: 1px solid rgba(49,208,195,.18);
      box-shadow: 0 0 0 1px rgba(223,243,239,.05);
      mask: radial-gradient(circle at 50% 50%, transparent 58%, #000 60%);
      opacity: .8;
      animation: brandRing 7.5s linear infinite;
      pointer-events: none;
    }
    @keyframes brandRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .brand-badge::after { animation: none; } }
    html[data-motion=\"off\"] .brand-badge::after { animation: none; }

    .brand-monogram { position: relative; z-index: 1; font-weight: 800; letter-spacing: -0.06em;
      font-size: .95rem; line-height: 1; display: inline-flex; }
    .brand-m1 { color: rgba(230,237,243,.96); text-shadow: 0 8px 22px rgba(0,0,0,.35); }
    .brand-m2 { margin-left: -0.12rem; color: rgba(142,242,232,.96); text-shadow: 0 10px 24px rgba(49,208,195,.18); }

    /* Variant B: profile photo in the same badge (off by default). */
    .brand-photo { position: absolute; inset: 4px; border-radius: 12px; width: calc(100% - 8px); height: calc(100% - 8px);
      object-fit: cover; display: none; z-index: 1; filter: saturate(1.02) contrast(1.02); }
    html[data-brand=\"photo\"] .brand-monogram { display: none; }
    html[data-brand=\"photo\"] .brand-photo { display: block; }

    /* ---------- Navbar: calm dark glass (healthtech) ---------- */
    .navlink { padding: .5rem .8rem; border-radius: .75rem; font-size: .875rem; font-weight: 500;
      color: #AEB9C6; transition: background .22s ease, color .22s ease, border-color .22s ease; }
    .navlink:hover { background: rgba(49,208,195,.06); color: #8EF2E8; }
    .navlink[data-active="true"] { background: rgba(49,208,195,.14); color: #E6EDF3; }
    .navlink:focus-visible { outline: 2px solid #31D0C3; outline-offset: 3px; background: rgba(49,208,195,.14); }

    /* Contact as a quiet CTA (desktop + mobile). */
    .nav-cta { border: 1px solid rgba(49,208,195,.26);
      background: rgba(49,208,195,.10); color: #E6EDF3;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
    .nav-cta:hover { background: rgba(49,208,195,.16); border-color: rgba(49,208,195,.44); color: #8EF2E8; }
    .nav-cta:focus-visible { outline: 2px solid #31D0C3; outline-offset: 3px; }

    .navlink-mobile { display:flex; align-items:center; min-height: 2.75rem; padding: .6rem .9rem; border-radius: .75rem; font-size: .95rem; font-weight: 500;
      color: #E6EDF3; transition: background .22s ease, color .22s ease, border-color .22s ease; }
    .navlink-mobile:hover { background: rgba(49,208,195,.08); color: #8EF2E8; }
    .navlink-mobile:focus-visible { outline: 2px solid #31D0C3; outline-offset: 2px; background: rgba(49,208,195,.16); }

    /* Small inline links (footer, inside prose). Must stay keyboard-visible. */
    .footer-link { min-height: 2.25rem; display: inline-flex; align-items: center; padding: .35rem .55rem;
      border-radius: .45rem; color: var(--text-lo); text-decoration: underline; text-underline-offset: 4px;
      text-decoration-color: rgba(42,157,143,.5); transition: color .15s ease, background .15s ease; }
    .footer-link:hover { color: var(--text-hi); background: var(--surface-2); text-decoration-color: #2A9D8F; }
    .footer-link:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; background: rgba(42,157,143,.15); color: var(--text-hi); }

    /* Primary: brand teal, solid. Shadow is tinted toward the accent for a
       calm, credible lift rather than a generic drop shadow. */
    .btn-primary { display:inline-flex; align-items:center; justify-content:center; gap: .4rem;
      min-height: 2.75rem; border-radius: .85rem; padding: .65rem 1.15rem; font-weight: 600;
      letter-spacing: -0.005em;
      background: #2A9D8F; color: #FFFFFF;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.14), 0 12px 24px -14px rgba(42,157,143,.55);
      transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
    .btn-primary:hover { transform: translateY(-1px); background: #33ad9e;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 18px 34px -16px rgba(42,157,143,.65); }
    .btn-primary:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; }
    html[data-motion="off"] .btn-primary { transition: none; }
    html[data-motion="off"] .btn-primary:hover { transform: none; }

    /* Hero primary CTA: slightly larger and more dominant. */
    .btn-primary--hero { min-height: 3rem; padding: .78rem 1.25rem; border-radius: 1rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 18px 40px -18px rgba(42,157,143,.7); }

    /* Secondary: glassy outline. Feels light, supporting. */
    .btn-secondary { display:inline-flex; align-items:center; justify-content:center; gap: .4rem;
      min-height: 2.75rem; border-radius: .85rem; padding: .65rem 1.15rem; font-weight: 600;
      letter-spacing: -0.005em;
      border: 1px solid var(--border-mid); background: var(--surface-2); color: var(--text-hi);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      transition: background .15s ease, border-color .15s ease, transform .15s ease; }
    .btn-secondary:hover { background: var(--surface-3); border-color: var(--border-accent); transform: translateY(-1px); }
    .btn-secondary:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; }
    html[data-motion="off"] .btn-secondary { transition: none; }
    html[data-motion="off"] .btn-secondary:hover { transform: none; }

    /* Tertiary: faintly tinted teal. Sits between primary and secondary. */
    .btn-tertiary { display:inline-flex; align-items:center; justify-content:center; gap: .4rem;
      min-height: 2.75rem; border-radius: .85rem; padding: .65rem 1.15rem; font-weight: 600;
      letter-spacing: -0.005em;
      color: var(--accent-200); background: rgba(42,157,143,.14);
      border: 1px solid rgba(42,157,143,.28);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      transition: background .15s ease, border-color .15s ease, transform .15s ease; }
    .btn-tertiary:hover { background: rgba(42,157,143,.22); border-color: rgba(42,157,143,.5); transform: translateY(-1px); }
    .btn-tertiary:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; }
    html[data-motion="off"] .btn-tertiary { transition: none; }
    html[data-motion="off"] .btn-tertiary:hover { transform: none; }

    /* On very narrow phones, let hero CTAs become full-width so taps are easy. */
    @media (max-width: 420px) {
      .hero-cta { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
      .hero-cta .btn-primary { grid-column: 1 / -1; }
    }

    .stat { border-radius: var(--r-md); border: 1px solid var(--border-soft); background: var(--surface-1); padding: .8rem .9rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
    .stat-label { font-size: .68rem; text-transform: uppercase; letter-spacing: .1em; font-weight: 600; color: var(--text-muted); }
    .stat-value { margin-top: .35rem; font-size: .92rem; font-weight: 600; color: var(--text-hi); letter-spacing: -0.005em; }

    /* Low-weight inline link for supporting CTAs (hero aside "Connect" row).
       Deliberately quieter than .mini-link so it doesn't compete with the
       primary buttons in the main pitch. */
    /* Hero "At a glance" labels. Subtle teal caret preserves the visual
       personality of the old icon chips without breaking column alignment. */
    .glance-label { position: relative; padding-left: 1.1rem;
      font-weight: 600; color: var(--text-hi); letter-spacing: -0.005em; }
    .glance-label::before { content: "▸"; position: absolute; left: 0; top: 0;
      color: var(--accent-400); font-weight: 400; }

    /* Inline link for data blocks (e.g. Contact dl). Intentionally slim - no
       padding or min-height - so it sits on the same baseline as sibling
       text values and keeps the row rhythm tight. */
    .contact-link { color: var(--text-hi); text-decoration: underline; text-underline-offset: 4px;
      text-decoration-color: rgba(42,157,143,.55);
      border-radius: .25rem; transition: color .15s ease, text-decoration-color .15s ease;
      word-break: break-word; }
    .contact-link:hover { color: var(--accent-200); text-decoration-color: #2A9D8F; }
    .contact-link:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; }

    /* Contact details: recruiter-friendly alignment (label column is fixed). */
    .contact-dl {
      display: grid;
      grid-template-columns: 6.5rem minmax(0, 1fr);
      gap: .6rem 1rem;
      align-items: baseline;
      padding: 1rem 1.05rem;
      border-radius: var(--r-lg);
      border: 1px solid rgba(255,255,255,.08);
      background: rgba(255,255,255,.02);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      color: var(--text-lo);
    }
    .contact-dl dt {
      font-size: .68rem;
      letter-spacing: .1em;
      text-transform: uppercase;
      font-weight: 700;
      color: rgba(174,185,198,.92);
    }
    .contact-dl dd { min-width: 0; color: rgba(230,234,240,.92); }
    .contact-value { color: rgba(230,234,240,.92); font-weight: 600; }
    .contact-pill {
      display: inline-flex;
      align-items: center;
      padding: .2rem .5rem;
      border-radius: 9999px;
      border: 1px solid rgba(49,208,195,.22);
      background: rgba(42,157,143,.12);
      color: rgba(223,243,239,.92);
      font-weight: 700;
      font-size: .72rem;
      letter-spacing: .01em;
      vertical-align: baseline;
    }
    .contact-sep { margin-inline: .4rem; opacity: .55; }
    @media (max-width: 639px) {
      .contact-dl { grid-template-columns: 6rem minmax(0, 1fr); }
    }

    .aside-link { display: inline-flex; align-items: center; min-height: 2rem;
      padding: .15rem .2rem; font-weight: 500; font-size: .85rem;
      color: var(--text-md); text-decoration: underline; text-underline-offset: 4px;
      text-decoration-color: rgba(42,157,143,.5);
      border-radius: .35rem; transition: color .15s ease, text-decoration-color .15s ease; }
    .aside-link:hover { color: var(--text-hi); text-decoration-color: #2A9D8F; }
    .aside-link:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; }

    .mini-link { display:flex; align-items:center; justify-content:center; min-height: 2.75rem; border-radius: .85rem; padding: .65rem .85rem; font-weight: 600; font-size: .9rem;
      border: 1px solid var(--border-soft); color: var(--text-hi); background: var(--surface-1);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      transition: transform .15s ease, background .15s ease, border-color .15s ease; }
    .mini-link:hover { transform: translateY(-1px); background: var(--surface-3); border-color: var(--border-accent); }
    .mini-link:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; }
    html[data-motion="off"] .mini-link { transition: none; }
    html[data-motion="off"] .mini-link:hover { transform: none; }

    /* ---------- Surface system ----------
       .panel = large section container (About principle box, Contact).
       .card  = content card (skills, etc.)
       All share: hairline border, barely-there surface, a 1px inner top
       highlight ("light catch"), and calm token-driven elevation. */
    .panel { position: relative; border-radius: var(--r-xl);
      border: 1px solid var(--border-soft);
      background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05), var(--elev-2); }

    .card { border-radius: var(--r-xl); border: 1px solid var(--border-soft);
      background: var(--surface-1); padding: 1.25rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.045), var(--elev-1);
      transition: border-color .2s ease, background .2s ease; }
    .card:hover { border-color: var(--border-mid); background: var(--surface-2); }
    .card-title { font-weight: 600; color: var(--text-hi); letter-spacing: -0.01em; }
    .card-body { margin-top: .5rem; color: var(--text-lo); font-size: .95rem; line-height: 1.55rem; }

    .pill { display:inline-flex; align-items: center; border-radius: 9999px; padding: .4rem .8rem; font-size: .8rem; font-weight: 500;
      border: 1px solid var(--border-soft); color: var(--text-md); background: var(--surface-1);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
      transition: transform .2s ease, border-color .2s ease, background .2s ease, color .2s ease; }
    .pill:hover { transform: translateY(-1px); background: var(--surface-2); border-color: var(--border-accent); color: var(--text-hi); }
    html[data-motion="off"] .pill { transition: none; }
    html[data-motion="off"] .pill:hover { transform: none; }

    /* Sits one layer higher than .panel (surface-2) so it reads as nested. */
    .mini-card {
      border-radius: var(--r-lg);
      border: 1px solid var(--border-soft);
      background: var(--surface-2);
      padding: 1rem 1.1rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-height: 7.1rem; /* aligns People/Process/Product tiles visually */
    }
    .mini-kicker { font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--text-muted); }
    .mini-text {
      margin-top: .4rem;
      font-weight: 600;
      color: var(--text-hi);
      letter-spacing: -0.005em;
      line-height: 1.25;
      hyphens: none;
      word-break: normal;
    }

    /* Tags: compact, brand-tinted, for tech/method callouts inside cards. */
    .tag { font-size: .72rem; border-radius: 9999px; padding: .28rem .6rem; font-weight: 500;
      background: rgba(42,157,143,.12); color: var(--accent-200);
      border: 1px solid rgba(42,157,143,.22);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }

    /* Interactive project cards (open modal). */
    .pcard { position: relative; display: flex; flex-direction: column; gap: .85rem; width: 100%;
      text-align: left; cursor: pointer;
      border-radius: var(--r-xl); padding: 1.4rem 1.4rem 1.25rem;
      border: 1px solid var(--border-soft);
      background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
      color: var(--text-hi);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.045), var(--elev-1);
      transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease, background .22s ease; }
    /* Subtle gradient sheen on hover (single-axis, low opacity - no blend mode). */
    .pcard::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: radial-gradient(120% 80% at 100% 0%, rgba(42,157,143,.10), rgba(42,157,143,0) 60%);
      opacity: 0; transition: opacity .25s ease; }
    .pcard:hover { transform: translateY(-2px); border-color: var(--border-accent);
      background: linear-gradient(180deg, var(--surface-3), var(--surface-2));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06), var(--elev-2); }
    .pcard:hover::before { opacity: 1; }
    .pcard:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 4px; }
    .pcard-top { display:flex; align-items: center; justify-content: space-between; gap: .75rem; }
    .pcard-kicker { font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--text-muted); }
    .pcard-arrow { font-size: 1.05rem; color: var(--text-muted); transform: translateX(0); transition: transform .22s ease, color .22s ease; }
    .pcard:hover .pcard-arrow { transform: translateX(4px); color: var(--accent-200); }
    .pcard-title { font-size: 1.12rem; line-height: 1.35; font-weight: 600; letter-spacing: -0.018em; color: var(--text-hi); }
    .pcard-body { font-size: .93rem; line-height: 1.55rem; color: var(--text-md); }
    .pcard-meta { display: grid; grid-template-columns: 1fr 1fr; gap: .55rem .9rem; margin-top: auto;
      padding-top: .75rem; border-top: 1px solid var(--border-soft); }
    .pcard-meta dt { font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--text-muted); }
    .pcard-meta dd { font-size: .88rem; color: var(--text-hi); font-weight: 500; }
    .pcard-tags { display:flex; flex-wrap: wrap; gap: .4rem; }
    html[data-motion="off"] .pcard, html[data-motion="off"] .pcard-arrow { transition: none; }
    html[data-motion="off"] .pcard:hover { transform: none; }

    /* Project modal (accessible, focus-trapped). */
    html.modal-open, html.modal-open body { overflow: hidden; }
    .pmodal { position: fixed; inset: 0; z-index: 70; display: none; }
    .pmodal.is-open { display: block; }
    .pmodal-backdrop { position: absolute; inset: 0; background: rgba(6, 10, 16, .70); backdrop-filter: blur(6px);
      opacity: 0; transition: opacity .2s ease; }
    .pmodal.is-open .pmodal-backdrop { opacity: 1; }
    .pmodal-panel { position: relative; z-index: 1; width: min(52rem, calc(100vw - 2rem));
      max-height: calc(100vh - 2rem); overflow-y: auto; margin: 1rem auto; top: 50%; transform: translateY(-50%) scale(.98);
      border-radius: var(--r-xl); border: 1px solid var(--border-mid);
      background: linear-gradient(180deg, rgba(22, 30, 40, .98), rgba(14, 20, 28, .98));
      color: var(--text-hi); padding: 1.75rem 1.75rem 1.85rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05), var(--elev-3);
      opacity: 0; transition: opacity .22s ease, transform .22s ease; outline: none; }
    .pmodal.is-open .pmodal-panel { opacity: 1; transform: translateY(-50%) scale(1); }
    @media (min-width: 640px) { .pmodal-panel { padding: 1.75rem 1.85rem 2rem; } }
    .pmodal-close { position: absolute; top: .75rem; right: .75rem; width: 2.5rem; height: 2.5rem; min-height: 2.75rem; min-width: 2.75rem; border-radius: 9999px;
      display: inline-flex; align-items: center; justify-content: center;
      border: 1px solid var(--border-mid); background: var(--surface-2); color: var(--text-hi);
      font-size: 1.25rem; line-height: 1; cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      transition: background .15s ease, border-color .15s ease, transform .15s ease; }
    .pmodal-close:hover { background: var(--surface-3); border-color: var(--border-accent); transform: rotate(90deg); }
    .pmodal-close:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; background: rgba(42,157,143,.18); }
    html[data-motion="off"] .pmodal-close { transition: none; }
    html[data-motion="off"] .pmodal-close:hover { transform: none; }
    .pmodal-kicker { font-size: .68rem; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; color: var(--text-muted); }
    .pmodal-title { margin-top: .4rem; font-size: 1.4rem; line-height: 1.25; font-weight: 600; letter-spacing: -0.022em; color: var(--text-hi); text-wrap: balance; }
    @media (min-width: 640px) { .pmodal-title { font-size: 1.6rem; } }
    .pmodal-desc { margin-top: .75rem; color: var(--text-md); line-height: 1.6rem; max-width: 52ch; }
    .pmodal-grid { margin-top: 1.4rem; display: grid; grid-template-columns: 1fr; gap: 1rem 1.25rem; }
    @media (min-width: 700px) { .pmodal-grid { grid-template-columns: 1fr 1fr; } }
    .pmodal-grid section { border: 1px solid var(--border-soft); border-radius: var(--r-md); padding: 1rem 1.1rem;
      background: var(--surface-1); box-shadow: inset 0 1px 0 rgba(255,255,255,.04); }
    .pmodal-grid h4 { font-size: .65rem; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; color: var(--text-muted); margin-bottom: .55rem; }
    .pmodal-grid p { color: var(--text-md); line-height: 1.55rem; font-size: .93rem; }
    .pmodal-grid ul { display: grid; gap: .45rem; color: var(--text-md); font-size: .92rem; line-height: 1.5rem; }
    .pmodal-grid li { position: relative; padding-left: 1rem; }
    .pmodal-grid li::before { content: ""; position: absolute; left: 0; top: .55rem; width: .38rem; height: .38rem;
      border-radius: 9999px; background: #2A9D8F; }
    .pmodal-wide { grid-column: 1 / -1; }
    .pmodal-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
    html[data-motion="off"] .pmodal-backdrop,
    html[data-motion="off"] .pmodal-panel { transition: none; }

    /* Featured case study cards (clickable). Same surface family as .pcard. */
    .case-card { position: relative; display: flex; flex-direction: column; gap: .85rem;
      border-radius: var(--r-xl); padding: 1.4rem 1.4rem 1.25rem;
      border: 1px solid var(--border-soft);
      background: linear-gradient(180deg, var(--surface-2), var(--surface-1));
      color: var(--text-hi); text-decoration: none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.045), var(--elev-1);
      transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease, background .2s ease; }
    .case-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
      background: radial-gradient(120% 80% at 0% 0%, rgba(42,157,143,.08), rgba(42,157,143,0) 60%);
      opacity: 0; transition: opacity .25s ease; }
    .case-card:hover { transform: translateY(-2px); border-color: var(--border-accent);
      background: linear-gradient(180deg, var(--surface-3), var(--surface-2));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06), var(--elev-2); }
    .case-card:hover::before { opacity: 1; }
    .case-card:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 4px; }
    html[data-motion="off"] .case-card { transition: none; }
    html[data-motion="off"] .case-card:hover { transform: none; }
    html[data-motion="off"] .case-card:hover .case-arrow { transform: none; }
    .case-top { display:flex; align-items:center; justify-content: space-between; gap: .75rem; }
    .case-kicker { font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--text-muted); }
    .case-arrow { font-size: 1rem; color: var(--text-muted); transition: transform .2s ease, color .2s ease; }
    .case-card:hover .case-arrow { transform: translateX(3px); color: var(--accent-200); }
    .case-title { margin-top: .25rem; font-size: 1.12rem; line-height: 1.35; font-weight: 600; letter-spacing: -0.018em; color: var(--text-hi); }
    .case-list { display: grid; gap: .65rem; margin-top: .25rem; }
    .case-list > div { display: grid; grid-template-columns: 7rem 1fr; gap: .75rem; align-items: baseline; }
    .case-list dt { font-size: .65rem; letter-spacing: .1em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .case-list dd { font-size: .93rem; color: var(--text-md); line-height: 1.45rem; }
    .case-tags { display:flex; flex-wrap: wrap; gap: .4rem; margin-top: .25rem; }
    @media (max-width: 640px) {
      .case-list > div { grid-template-columns: 1fr; gap: .15rem; }
    }

    .timeline { position: relative; display:grid; grid-template-columns: 1.25rem 1fr; gap: 1rem; }
    /* Vertical guide rail fades toward the ends so it doesn't "clip". */
    .timeline::before { content:""; position:absolute; left:.55rem; top: .4rem; bottom: .4rem; width: 1px;
      background: linear-gradient(180deg, transparent, var(--border-mid) 10%, var(--border-mid) 90%, transparent); }
    .timeline-dot { width: 1rem; height: 1rem; border-radius: 9999px; background: #2A9D8F;
      border: 3px solid var(--surface-0); box-shadow: 0 0 0 1px var(--border-mid); margin-top: .25rem; }
    .timeline-card { border-radius: var(--r-xl); border: 1px solid var(--border-soft); background: var(--surface-1);
      padding: 1.1rem 1.25rem;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04), var(--elev-1);
      transition: border-color .2s ease, background .2s ease; }
    .timeline-card:hover { border-color: var(--border-mid); background: var(--surface-2); }
    .timeline-top { display:flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
    .timeline-role { font-weight: 600; color: var(--text-hi); letter-spacing: -0.01em; }
    .timeline-time { font-size: .8rem; color: var(--text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .timeline-body { margin-top: .45rem; color: var(--text-md); line-height: 1.55rem; }

    /* Timeline dot: grows in gently when its row enters view, soft hover ring. */
    .timeline-dot { transform: scale(.75); opacity: .7; transition: transform .5s ease .1s, opacity .5s ease .1s, box-shadow .2s ease; }
    .timeline.is-revealed .timeline-dot,
    .reveal.is-revealed .timeline-dot { transform: scale(1); opacity: 1; }
    .timeline-card:hover ~ .timeline-dot,
    .timeline:hover .timeline-dot,
    .timeline:focus-within .timeline-dot { box-shadow: 0 0 0 4px rgba(42,157,143,.18); }
    html[data-motion="off"] .timeline-dot { transform: none; opacity: 1; transition: none; }

    /* Expandable disclosure (timeline cards, etc.) */
    .expandable-toggle { display: inline-flex; align-items: center; gap: .4rem; margin-top: .75rem;
      min-height: 2.5rem; padding: .45rem .9rem .45rem .95rem; border-radius: 9999px;
      border: 1px solid rgba(42,157,143,.3); background: rgba(42,157,143,.1); color: var(--accent-200);
      font-size: .82rem; font-weight: 600; letter-spacing: -0.005em; cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
      transition: background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease; }
    /* Bump to 44px min on touch-first devices to satisfy WCAG 2.5.5. */
    @media (hover: none) and (pointer: coarse) { .expandable-toggle { min-height: 2.75rem; } }
    .expandable-toggle:hover { background: rgba(42,157,143,.18); border-color: rgba(42,157,143,.5); transform: translateY(-1px); }
    .expandable-toggle:focus-visible { outline: 2px solid #2A9D8F; outline-offset: 3px; }
    .expandable-toggle .caret { display: inline-block; transition: transform .25s ease; }
    .expandable-toggle[aria-expanded="true"] .caret { transform: rotate(90deg); }
    html[data-motion="off"] .expandable-toggle,
    html[data-motion="off"] .expandable-toggle .caret { transition: none; }

    /* Use grid-template-rows trick to animate from auto height accessibly. */
    .expandable-panel { display: grid; grid-template-rows: 0fr;
      transition: grid-template-rows .32s ease, margin-top .32s ease, opacity .25s ease;
      margin-top: 0; opacity: 0; }
    .expandable-panel > .expandable-inner { overflow: hidden; min-height: 0; }
    .expandable-panel[data-open="true"] { grid-template-rows: 1fr; margin-top: .75rem; opacity: 1; }
    html[data-motion="off"] .expandable-panel { transition: none; }

    .expandable-list { margin: 0; padding: 0; display: grid; gap: .35rem; list-style: none; }
    .expandable-list li { position: relative; padding-left: 1rem; font-size: .9rem; line-height: 1.45rem; color: rgba(230,234,240,.92); }
    .expandable-list li::before { content: ""; position: absolute; left: 0; top: .55rem; width: .35rem; height: .35rem;
      border-radius: 9999px; background: #2A9D8F; }
    .dark .expandable-list li { color: rgba(215,222,230,.95); }

    /* Floating back-to-top button. Flex-centered so the SVG sits exactly in
       the middle regardless of its intrinsic size or baseline. */
    .to-top { position: fixed; right: 1rem; bottom: 1rem; z-index: 55;
      width: 2.75rem; height: 2.75rem; padding: 0; border-radius: 9999px;
      display: inline-flex; align-items: center; justify-content: center; line-height: 0;
      border: 1px solid var(--border-mid); background: rgba(18,26,36,.82); color: var(--accent-200);
      cursor: pointer;
      opacity: 0; transform: translateY(10px); pointer-events: none;
      transition: opacity .25s ease, transform .25s ease, background .2s ease, border-color .2s ease;
      backdrop-filter: blur(6px);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05), 0 14px 40px -20px rgba(0,0,0,.6); }
    .to-top[data-show="true"] { opacity: 1; transform: translateY(0); pointer-events: auto; }
    /* When user can Tab/focus it while hidden, keep it visible for keyboard. */
    .to-top:focus-visible { opacity: 1; transform: translateY(0); pointer-events: auto;
      outline: 2px solid #2A9D8F; outline-offset: 3px; }
    .to-top:hover { background: rgba(42,157,143,.28); border-color: var(--border-accent); }
    .to-top > svg { display: block; }
    @media (min-width: 640px) { .to-top { right: 1.5rem; bottom: 1.5rem; } }
    html[data-motion="off"] .to-top { transition: opacity .15s ease; transform: none; }

    /* One-time emphasis ring on the primary Contact CTA when that section
       scrolls into view. Preserves the button's normal shadow, layers a
       ring that expands-and-fades once, then is removed by JS. */
    .cta-pulse { animation: ctaPulse 2.2s cubic-bezier(.2,.7,.2,1) 1; }
    @keyframes ctaPulse {
      0% {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.14),
          0 12px 24px -14px rgba(42,157,143,.55),
          0 0 0 0 rgba(42,157,143,.45);
      }
      70% {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.14),
          0 12px 24px -14px rgba(42,157,143,.55),
          0 0 0 14px rgba(42,157,143,0);
      }
      100% {
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.14),
          0 12px 24px -14px rgba(42,157,143,.55),
          0 0 0 0 rgba(42,157,143,0);
      }
    }
    @media (prefers-reduced-motion: reduce) { .cta-pulse { animation: none; } }
    html[data-motion="off"] .cta-pulse { animation: none; }

    /* Mobile menu slide-in (works alongside Tailwind's .hidden fallback). */
    #mobileMenu { overflow: hidden; max-height: 0; opacity: 0;
      transition: max-height .24s ease, opacity .22s ease; }
    #mobileMenu[data-open="true"] { max-height: 28rem; opacity: 1; }
    html[data-motion="off"] #mobileMenu { transition: none; }

    /* ---------- Hero: executive-summary polish ---------- */
    .glance-row { display: grid; grid-template-columns: auto 1fr; gap: .75rem; align-items: baseline; }
    .glance-label { color: rgba(230,237,243,.72); font-weight: 600; font-size: .78rem; letter-spacing: .02em; text-transform: uppercase; }
    .glance-value { color: rgba(230,237,243,.92); }
    .hero-metric { display:inline-flex; align-items:center; gap: .45rem; padding: .35rem .6rem;
      border-radius: 9999px; border: 1px solid rgba(49,208,195,.18); background: rgba(8,18,32,.38);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
    .hero-metric-k { color: rgba(142,242,232,.92); font-weight: 700; }

    /* ---------- Hero: typewriter headline ---------- */
    /* Every character is laid out at its final wrapped position on first paint
       (with visibility:hidden) so the headline never shifts as letters appear.
       The caret is absolutely positioned over the stage and jumps to the
       trailing edge of the most recently revealed character. */
    .hero-type-stage { position: relative; display: block; }
    .hero-char { visibility: hidden; }
    /* Revealed characters briefly flash a luminous violet→cyan glow, then
       settle into a calm resting shimmer that keeps the whole line glowing. */
    .hero-char.is-shown {
      visibility: visible;
      animation: heroCharLight 1.1s ease-out forwards;
      text-shadow: 0 0 14px rgba(125, 211, 252, 0.22), 0 0 28px rgba(167, 139, 250, 0.12);
    }
    @keyframes heroCharLight {
      0% {
        color: #f5f7ff;
        text-shadow:
          0 0 10px rgba(240, 249, 255, 0.95),
          0 0 22px rgba(125, 211, 252, 0.85),
          0 0 38px rgba(167, 139, 250, 0.6);
      }
      60% {
        text-shadow:
          0 0 16px rgba(125, 211, 252, 0.55),
          0 0 32px rgba(167, 139, 250, 0.35);
      }
      100% {
        color: inherit;
        text-shadow:
          0 0 14px rgba(125, 211, 252, 0.22),
          0 0 28px rgba(167, 139, 250, 0.12);
      }
    }
    /* Traveling glow sweep: re-triggered on a 3-second cycle so the headline
       pulses from first character to last like a soft wave of light. */
    .hero-char.is-pulsing {
      animation: heroCharPulse 0.65s ease-out;
    }
    @keyframes heroCharPulse {
      0% {
        color: inherit;
        text-shadow:
          0 0 14px rgba(125, 211, 252, 0.22),
          0 0 28px rgba(167, 139, 250, 0.12);
      }
      45% {
        color: #f5f7ff;
        text-shadow:
          0 0 12px rgba(240, 249, 255, 0.95),
          0 0 28px rgba(125, 211, 252, 0.8),
          0 0 48px rgba(167, 139, 250, 0.55);
      }
      100% {
        color: inherit;
        text-shadow:
          0 0 14px rgba(125, 211, 252, 0.22),
          0 0 28px rgba(167, 139, 250, 0.12);
      }
    }
    .hero-type-caret {
      position: absolute;
      top: 0;
      left: 0;
      width: 2.5px;
      height: 0.9em;
      border-radius: 2px;
      background: linear-gradient(180deg, #e0f2fe 0%, #7dd3fc 45%, #a78bfa 100%);
      box-shadow:
        0 0 8px rgba(224, 242, 254, 0.95),
        0 0 18px rgba(125, 211, 252, 0.8),
        0 0 36px rgba(167, 139, 250, 0.55);
      animation: heroCaretBlink 1s steps(2, jump-none) infinite;
      transition: opacity .6s ease;
      pointer-events: none;
      will-change: transform;
    }
    @keyframes heroCaretBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
    .hero-type-caret.is-stopped { animation: none; opacity: 0; }
    @media (prefers-reduced-motion: reduce) {
      .hero-type-caret { animation: none; opacity: 0; }
      .hero-char.is-shown,
      .hero-char.is-pulsing { animation: none; text-shadow: none; }
    }
    html[data-motion="off"] .hero-type-caret { display: none; }
    html[data-motion="off"] .hero-char.is-shown,
    html[data-motion="off"] .hero-char.is-pulsing { animation: none; text-shadow: none; }

    .hero-scroll-hint { position: absolute; left: 50%; bottom: .75rem; transform: translateX(-50%);
      display:flex; flex-direction: column; align-items: center; gap: .4rem; z-index: 5;
      color: rgba(230,237,243,.8); text-decoration: none; }
    .hero-scroll-pill { font-size: .72rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
      padding: .3rem .65rem; border-radius: 9999px; border: 1px solid rgba(49,208,195,.18);
      background: rgba(8,18,32,.35); }
    .hero-scroll-dot { width: 6px; height: 18px; border-radius: 9999px; border: 1px solid rgba(49,208,195,.35);
      position: relative; overflow: hidden; }
    .hero-scroll-dot::after { content:\"\"; position: absolute; left: 50%; top: 4px; transform: translateX(-50%);
      width: 4px; height: 4px; border-radius: 9999px; background: rgba(49,208,195,.9);
      animation: scrollDot 1.35s ease-in-out infinite; }
    @keyframes scrollDot { 0% { transform: translate(-50%, 0); opacity: .45; } 55% { transform: translate(-50%, 8px); opacity: 1; } 100% { transform: translate(-50%, 12px); opacity: .2; } }
    @media (prefers-reduced-motion: reduce) { .hero-scroll-dot::after { animation: none; opacity: .6; } }
    html[data-motion="off"] .hero-scroll-dot::after { animation: none; opacity: .6; }

    /* ---------- Sticky navigation: polish layer ---------- */
    /* Offset smooth anchor jumps so targets land below the sticky header. */
    html { scroll-padding-top: 4.75rem; }
    @media (min-width: 1024px) { html { scroll-padding-top: 5.25rem; } }
    /* Respect user preference: skip smooth scroll when motion is off. */
    @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto !important; } }
    html[data-motion="off"] { scroll-behavior: auto !important; }

    /* Header is transparent-ish at the top of the page, then firms up when
       the user scrolls. Keeps the hero feeling open on first paint. */
    #siteHeader { transition: background-color .22s ease, box-shadow .22s ease, border-color .22s ease; }
    #siteHeader[data-elevated="true"] {
      background-color: rgba(8, 18, 32, .90);
      border-bottom-color: rgba(49, 208, 195, .22);
      box-shadow: 0 16px 40px -28px rgba(0, 0, 0, .8);
    }
    html[data-motion="off"] #siteHeader { transition: none; }

    /* Thin reading-progress bar sitting on the header's bottom edge. */
    #navProgress { position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
      pointer-events: none; overflow: hidden; }
    #navProgress > span { display: block; height: 100%; width: 0%;
      background: linear-gradient(90deg, #31D0C3, #8EF2E8 70%, rgba(230,237,243,.92));
      transform-origin: left center;
      /* No width transition: JS updates width from scroll; animating width here fights
         the compositor and reads as stutter during fast scroll. */
      transition: none; }

    /* Scroll-spy underline on active nav link (desktop). */
    .navlink { position: relative; }
    .navlink::after { content: ""; position: absolute; left: .75rem; right: .75rem; bottom: .25rem;
      height: 2px; background: #31D0C3; border-radius: 9999px;
      transform: scaleX(0); transform-origin: left center; transition: transform .25s ease; }
    .navlink[data-active="true"]::after { transform: scaleX(1); }
    .navlink[aria-current="location"] { color: #E6EDF3; }
    html[data-motion="off"] .navlink::after { transition: none; }

    /* Mobile nav: show a left-side indicator + tinted bg on the active item
       so recruiters scanning on phones can see where they are at a glance. */
    .navlink-mobile { position: relative; padding-left: 1rem; }
    .navlink-mobile::before { content: ""; position: absolute; left: .25rem; top: 50%;
      width: 3px; height: 1rem; border-radius: 2px; background: #31D0C3;
      transform: translateY(-50%) scaleY(0); transform-origin: center;
      transition: transform .2s ease, opacity .2s ease; opacity: 0; }
    .navlink-mobile[data-active="true"]::before,
    .navlink-mobile[aria-current="location"]::before { transform: translateY(-50%) scaleY(1); opacity: 1; }
    .navlink-mobile[data-active="true"],
    .navlink-mobile[aria-current="location"] { background: rgba(49,208,195,.14); color: #E6EDF3; }
    html[data-motion="off"] .navlink-mobile::before { transition: none; }

    /* ---------- Mobile-first responsive refinements ---------- */

    /* Tablet and below: stack timeline role + date so nothing squishes. */
    @media (max-width: 767px) {
      .timeline-top { flex-direction: column; align-items: flex-start; gap: .15rem; }
      .timeline-time { font-size: .8rem; }
    }

    /* Phone: tighten spacing, reduce desktop-only effects, protect tap targets. */
    @media (max-width: 639px) {
      /* Typography breathing room */
      .chip { padding: 0.3rem 0.65rem; font-size: 0.7rem; }
      .tag { padding: .28rem .55rem; font-size: .72rem; }

      /* Cards: slightly tighter for mobile density */
      .card { padding: 1rem 1.1rem; border-radius: 1.25rem; }
      .pcard { padding: 1rem 1.1rem; gap: .65rem; border-radius: 1.25rem; }
      .pcard-title { font-size: 1.02rem; }
      .pcard-body { font-size: .9rem; line-height: 1.4rem; }
      .pcard-meta { grid-template-columns: 1fr 1fr; gap: .35rem .6rem; padding-top: .4rem; }
      .pcard-meta dd { font-size: .8rem; }

      .case-card { padding: 1rem 1.1rem .95rem; border-radius: 1.25rem; }
      .case-title { font-size: 1rem; }
      .case-list dd { font-size: .88rem; line-height: 1.35rem; }

      /* Mini card: mini-kicker/mini-text hierarchy shows clearly on small widths */
      .mini-card { padding: .85rem .9rem; }

      /* Stats */
      .stat { padding: .7rem .8rem; border-radius: .85rem; }
      .stat-label { font-size: .65rem; }
      .stat-value { font-size: .9rem; }

      /* Ensure inline links don't shrink to unreadable sizes */
      .pill { padding: .35rem .6rem; font-size: .75rem; }

      /* Simplify expensive desktop effects on small screens */
      .pcard::before { display: none; }
      .pcard { box-shadow: 0 12px 24px -20px rgba(0,0,0,.55); }
      .pcard:hover { transform: none; box-shadow: 0 12px 24px -20px rgba(0,0,0,.55); }
      .case-card { box-shadow: 0 12px 24px -20px rgba(0,0,0,.55); }
      .case-card:hover { transform: none; box-shadow: 0 12px 24px -20px rgba(0,0,0,.55); }
      .chip { backdrop-filter: none; }

      /* Modal fills the screen more comfortably on small phones */
      .pmodal-panel { width: calc(100vw - 1rem); margin: .5rem auto;
        max-height: calc(100vh - 1rem); padding: 1.1rem 1rem 1.35rem;
        border-radius: 1.15rem; top: 50%; }
      .pmodal-grid { gap: .7rem; margin-top: 1rem; }
      .pmodal-grid section { padding: .75rem .85rem; border-radius: .85rem; }
      .pmodal-title { font-size: 1.2rem; }
      .pmodal-close { top: .45rem; right: .5rem; width: 2.5rem; height: 2.5rem; }
    }

    /* Very narrow phones: drop heaviest decorations entirely. */
    @media (max-width: 400px) {
      h1.text-balance { font-size: 1.55rem !important; }
    }

    /* ---------- View Transitions (progressive enhancement) ---------- */
    /* In VT-capable browsers, the modal panel's own CSS transition is handed
       off to the View Transition so we don't double-animate (which would cause
       the panel snapshot to be captured mid-fade and look washed out). */
    html.vt-enabled .pmodal-panel { transition: none; }

    /* Default root crossfade: quick, subtle, professional. */
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation-duration: 180ms;
      animation-timing-function: cubic-bezier(.2, .7, .2, 1);
    }
    /* Card <-> modal morph: slightly longer so the shape change reads. */
    ::view-transition-group(project-morph) {
      animation-duration: 320ms;
      animation-timing-function: cubic-bezier(.2, .7, .2, 1);
    }
    ::view-transition-old(project-morph),
    ::view-transition-new(project-morph) {
      animation-duration: 260ms;
      mix-blend-mode: normal;
    }
    /* Reduced-motion: let the DOM change happen but skip the animation. */
    @media (prefers-reduced-motion: reduce) {
      ::view-transition-group(*),
      ::view-transition-old(*),
      ::view-transition-new(*) {
        animation-duration: 0.001ms !important;
        animation-delay: 0s !important;
      }
    }
    /* Mirror our explicit motion flag (covers cases where JS has opted out). */
    html[data-motion="off"] ::view-transition-group(*),
    html[data-motion="off"] ::view-transition-old(*),
    html[data-motion="off"] ::view-transition-new(*) {
      animation-duration: 0.001ms !important;
      animation-delay: 0s !important;
    }
  `;
  document.head.appendChild(style);
}

function initYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
}

function initCursorTrail({ allowMotion }) {
  // Disabled automatically for touch/coarse pointers and reduced-motion users.
  // NOTE: Some environments report (hover: hover) inconsistently, so we use a more forgiving check.
  const prefersCoarse = window.matchMedia?.("(any-pointer: coarse)")?.matches ?? false;
  const hasFinePointer = window.matchMedia?.("(any-pointer: fine)")?.matches ?? true;
  if (prefersCoarse || !hasFinePointer || !allowMotion) return;

  const canvas = document.getElementById("cursor-trail");
  if (!canvas) return;

  const root = document.documentElement;
  root.classList.add("trail-on");

  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return;

  // ---- Customization knobs (tune intensity here) ----
  const MAX_PARTICLES = 44; // Hard cap for performance
  const MIN_SPAWN_DISTANCE = 14; // px; higher = fewer particles
  const BASE_LIFETIME_MS = 240; // lower = quicker fade
  const SIZE_MIN = 2.0;
  const SIZE_MAX = 6.0;
  const OPACITY = 0.22; // overall subtlety (0..1)
  // Colors aligned to your palette (teal + soft highlight).
  const COLOR_CORE = "42,157,143"; // #2A9D8F
  const COLOR_GLOW = "223,243,239"; // #DFF3EF
  // --------------------------------------------------

  const particles = [];

  const state = {
    w: 1,
    h: 1,
    lastX: null,
    lastY: null,
    lastT: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  };

  function resize() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    state.w = Math.floor(window.innerWidth);
    state.h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(state.w * dpr);
    canvas.height = Math.floor(state.h * dpr);
    canvas.style.width = `${state.w}px`;
    canvas.style.height = `${state.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  function spawn(x, y, speed) {
    if (particles.length >= MAX_PARTICLES) particles.shift();

    // Slight variation: mix a teal core with a soft highlight glow.
    const useGlow = Math.random() < 0.35;
    const size = SIZE_MIN + Math.random() * (SIZE_MAX - SIZE_MIN);
    const life = BASE_LIFETIME_MS + clamp(speed * 6, 0, 180); // denser on faster motion, still subtle
    const drift = 0.22;

    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * drift,
      vy: (Math.random() - 0.5) * drift,
      r: size,
      t0: performance.now(),
      life,
      glow: useGlow,
    });
  }

  // Throttle spawning to animation frames for smoother UI.
  let pendingMove = null;
  function onMove(e) {
    pendingMove = e;
  }

  function consumeMove(e) {
    const now = performance.now();
    const x = e.clientX;
    const y = e.clientY;

    if (state.lastX == null) {
      state.lastX = x;
      state.lastY = y;
      state.lastT = now;
      return;
    }

    const dx = x - state.lastX;
    const dy = y - state.lastY;
    const dist = Math.hypot(dx, dy);
    const dt = Math.max(8, now - state.lastT);
    const speed = dist / dt; // px per ms

    if (dist >= MIN_SPAWN_DISTANCE) {
      // Spawn along the path for smoothness.
      const steps = Math.min(4, Math.max(1, Math.floor(dist / MIN_SPAWN_DISTANCE)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        spawn(state.lastX + dx * t, state.lastY + dy * t, speed);
      }
      state.lastX = x;
      state.lastY = y;
      state.lastT = now;
    }
  }

  let raf = 0;
  let running = false;
  let idleFrames = 0;

  function frame() {
    const now = performance.now();
    if (pendingMove) {
      consumeMove(pendingMove);
      pendingMove = null;
    }

    ctx.clearRect(0, 0, state.w, state.h);

    // Draw newest last for a cleaner look.
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const age = now - p.t0;
      const t = clamp(age / p.life, 0, 1);
      const a = (1 - t) * OPACITY;
      if (a <= 0.002) continue;

      // Ease-out fade and slight scale-down.
      const ease = 1 - Math.pow(t, 2);
      const r = p.r * (0.85 + ease * 0.25);

      p.x += p.vx;
      p.y += p.vy;

      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      const core = p.glow ? COLOR_GLOW : COLOR_CORE;
      ctx.fillStyle = `rgba(${core}, ${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Optional faint ring for “premium residue” (very subtle).
      if (!p.glow && t < 0.65) {
        ctx.strokeStyle = `rgba(${COLOR_CORE}, ${a * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Cleanup expired particles.
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (now - p.t0 >= p.life) particles.splice(i, 1);
    }

    if (particles.length === 0 && !pendingMove) {
      idleFrames++;
    } else {
      idleFrames = 0;
    }

    // Stop rendering when idle to avoid constant redraw cost.
    if (idleFrames > 8) {
      running = false;
      ctx.clearRect(0, 0, state.w, state.h);
      return;
    }

    raf = requestAnimationFrame(frame);
  }
  function ensureRunning() {
    if (running) return;
    running = true;
    idleFrames = 0;
    raf = requestAnimationFrame(frame);
  }

  const onPointerMove = (e) => {
    onMove(e);
    ensureRunning();
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // Pause when hidden.
  const onVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      running = false;
      pendingMove = null;
    }
  };
  document.addEventListener("visibilitychange", onVis);

  function stop() {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVis);
    root.classList.remove("trail-on");
  }

  // Graceful fallback if input mode changes (hybrid devices).
  const mq = window.matchMedia?.("(pointer: fine) and (hover: hover)");
  const onMQ = () => {
    const ok = mq?.matches ?? false;
    if (!ok) stop();
  };
  mq?.addEventListener?.("change", onMQ);
}

async function initThree(allowMotion) {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  const smallScreen = window.matchMedia?.("(max-width: 639px)")?.matches ?? false;
  const animate = allowMotion && !smallScreen;
  try {
    const fn = window.initHeroNetwork;
    if (typeof fn !== "function") return;
    await fn(canvas, { animate });
  } catch {
    // If Three.js fails for any reason, keep the site usable.
  }
}

const PROJECT_DATA = {
  "hmgics-governance": {
    kicker: "Program delivery • Digital transformation",
    title: "Governance + KPI reporting for a digital transformation program",
    desc: "Tracking milestones, delivery health, and risks across workstreams, and packaging updates into decision-ready dashboards for leadership.",
    problem:
      "With multiple parallel workstreams, leaders needed consistent visibility into milestones, risks, and KPIs. Without a clear governance view, decision-making slows and delivery drift increases.",
    role: "Project Management Intern - supported program governance, cross-functional coordination, and executive reporting using JIRA and structured status updates.",
    improved: [
      "Maintained milestone, health, and risk tracking across workstreams in JIRA.",
      "Built concise KPI dashboards and executive-ready presentations for regular leadership reviews.",
      "Improved reporting cadence and documentation quality to keep updates consistent and actionable.",
    ],
    outcomes: [
      "Faster leadership decisions through clearer, more digestible KPI and progress updates.",
      "Better delivery cadence and shared situational awareness across teams.",
      "Reduced ambiguity in status reporting through more rigorous documentation.",
    ],
    tools: ["JIRA", "Program governance", "KPI dashboards", "Stakeholder coordination", "SDLC awareness"],
  },
  "d365-migration": {
    kicker: "ERP delivery • Requirements & data migration",
    title: "Requirements + data migration for Dynamics 365 Business Central onboarding",
    desc: "Supporting requirements gathering and migration validation so client onboarding is accurate, traceable, and low-risk at go-live.",
    problem:
      "ERP onboarding can fail quietly: small data issues or unclear requirements surface after go-live as operational disruption, rework, and support burden.",
    role: "Associate Consultant Intern - supported requirements gathering, validated migration datasets, and produced functional/technical documentation with internal and external stakeholders.",
    improved: [
      "Validated and reconciled migration datasets using Excel to ensure accuracy during onboarding.",
      "Supported requirements gathering and clarified operational needs with internal/external teams.",
      "Produced functional and technical documentation to track decisions, risks, and fixes.",
      "Proactively raised and resolved risks, bugs, and errors before deployment.",
    ],
    outcomes: [
      "Achieved 100% data accuracy during client onboarding.",
      "Reduced post-deployment issues by 30% through proactive risk/bug resolution.",
      "Consistently met project milestones ahead of schedule through coordination and documentation discipline.",
    ],
    tools: ["Dynamics 365 Business Central", "Excel", "Requirements gathering", "Data migration", "Functional documentation", "Risk management"],
  },
  "outsystems-qa": {
    kicker: "Public sector • QA & test automation",
    title: "Performance testing + Selenium automation for corporate websites",
    desc: "Executing structured test coverage on OutSystems sites and automating repetitive checks to improve QA efficiency and consistency.",
    problem:
      "Manual testing is slow and inconsistent, especially when regression checks repeat across releases. Teams need repeatable coverage without ballooning effort.",
    role: "Business Analyst Intern (QA) - executed test cases, documented issues with recommendations, and engineered test automation scripts to reduce manual workload.",
    improved: [
      "Executed 50+ detailed performance and functional test cases for OutSystems corporate websites.",
      "Logged issues clearly and proposed actionable improvements to strengthen user experience and reliability.",
      "Built Selenium automation scripts to streamline repetitive testing workflows.",
    ],
    outcomes: [
      "Reduced manual testing time by 40% via automation.",
      "Improved speed and consistency of issue discovery across test cycles.",
      "Strengthened delivery confidence through clearer, repeatable test evidence.",
    ],
    tools: ["OutSystems", "Selenium", "Test cases", "QA documentation", "Defect triage", "UX feedback"],
  },
};

function initProjectModal() {
  const modal = document.getElementById("projectModal");
  if (!modal) return;
  const panel = modal.querySelector(".pmodal-panel");
  const kicker = modal.querySelector("#pmodalKicker");
  const title = modal.querySelector("#pmodalTitle");
  const desc = modal.querySelector("#pmodalDesc");

  const fields = {
    problem: modal.querySelector('[data-field="problem"]'),
    role: modal.querySelector('[data-field="role"]'),
    improved: modal.querySelector('[data-field="improved"]'),
    outcomes: modal.querySelector('[data-field="outcomes"]'),
    tools: modal.querySelector('[data-field="tools"]'),
  };

  let lastFocused = null;
  const MORPH_NAME = "project-morph";

  const renderList = (ul, items) => {
    ul.innerHTML = "";
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    }
  };

  const renderTags = (container, items) => {
    container.innerHTML = "";
    for (const item of items) {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = item;
      container.appendChild(span);
    }
  };

  // Pure state change (no focus / no transition handling).
  const openMount = (id, trigger) => {
    const data = PROJECT_DATA[id];
    if (!data) return false;
    lastFocused = trigger || document.activeElement;

    kicker.textContent = data.kicker || "";
    title.textContent = data.title || "";
    desc.textContent = data.desc || "";
    fields.problem.textContent = data.problem || "";
    fields.role.textContent = data.role || "";
    renderList(fields.improved, data.improved || []);
    renderList(fields.outcomes, data.outcomes || []);
    renderTags(fields.tools, data.tools || []);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("modal-open");
    return true;
  };

  const closeMount = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("modal-open");
  };

  const supportsVT = typeof document.startViewTransition === "function";

  const open = (id, trigger) => {
    if (!PROJECT_DATA[id]) return;

    // Use View Transitions where available so the card smoothly morphs into
    // the modal panel. Falls back to plain state change otherwise.
    if (supportsVT && trigger) {
      trigger.style.viewTransitionName = MORPH_NAME;
      const t = document.startViewTransition(() => {
        trigger.style.viewTransitionName = "";
        panel.style.viewTransitionName = MORPH_NAME;
        openMount(id, trigger);
      });
      t.finished
        .finally(() => {
          panel.style.viewTransitionName = "";
          requestAnimationFrame(() => panel.focus({ preventScroll: true }));
        })
        .catch(() => {});
    } else {
      openMount(id, trigger);
      requestAnimationFrame(() => panel.focus({ preventScroll: true }));
    }
  };

  const close = () => {
    const prev = lastFocused;
    const focusPrev = () => {
      if (prev && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    };

    if (supportsVT && prev) {
      panel.style.viewTransitionName = MORPH_NAME;
      const t = document.startViewTransition(() => {
        panel.style.viewTransitionName = "";
        closeMount();
        prev.style.viewTransitionName = MORPH_NAME;
      });
      t.finished
        .finally(() => {
          prev.style.viewTransitionName = "";
          focusPrev();
        })
        .catch(() => {});
    } else {
      closeMount();
      focusPrev();
    }
  };

  // Open handlers
  document.querySelectorAll(".pcard[data-project-id]").forEach((card) => {
    card.addEventListener("click", () => open(card.dataset.projectId, card));
  });

  // Close handlers (backdrop + close button)
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof HTMLElement && t.dataset.close === "true") close();
  });

  // Keyboard: Esc to close, Tab focus-trap within the panel.
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === "Tab") {
      const focusables = panel.querySelectorAll(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

function initExpandables() {
  const buttons = document.querySelectorAll(".expandable-toggle");
  buttons.forEach((btn) => {
    const panelId = btn.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    const label = btn.querySelector(".expandable-label");
    const openText = btn.dataset.openText || "Hide details";
    const closedText = btn.dataset.closedText || "Show details";

    // Initial state: closed. `inert` keeps inner content out of focus + a11y tree.
    const setState = (open) => {
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      panel.setAttribute("data-open", open ? "true" : "false");
      if (open) {
        panel.removeAttribute("inert");
        panel.removeAttribute("aria-hidden");
      } else {
        panel.setAttribute("inert", "");
        panel.setAttribute("aria-hidden", "true");
      }
      if (label) label.textContent = open ? openText : closedText;
    };

    setState(false);
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") !== "true";
      setState(open);
    });
  });
}

function initBackToTop() {
  const btn = document.getElementById("toTop");
  const hero = document.getElementById("top");
  if (!btn || !hero) return;
  btn.hidden = false;

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        btn.setAttribute("data-show", e.isIntersecting ? "false" : "true");
      }
    },
    { threshold: 0, rootMargin: "-10% 0px 0px 0px" },
  );
  obs.observe(hero);

  btn.addEventListener("click", () => {
    const motionOff = document.documentElement.dataset.motion === "off";
    window.scrollTo({ top: 0, behavior: motionOff ? "auto" : "smooth" });
    // Move focus to the site logo so keyboard users land at the top of the
    // tab order rather than losing focus on the now-hidden back-to-top.
    const logo = document.querySelector('header a[href="#top"]');
    if (logo) logo.focus({ preventScroll: true });
  });
}

function initDragScrollEnhancements({ allowMotion }) {
  const els = Array.from(document.querySelectorAll("[data-drag-scroll]"));
  if (!els.length) return;

  const motionOff = document.documentElement.dataset.motion === "off";

  const enhance = (el) => {
    const axis = el.getAttribute("data-drag-scroll-axis") || "x";
    const snapMode = el.getAttribute("data-drag-scroll-snap") || "none";
    const isX = axis === "x";

    // Make it feel like a control only when it actually overflows.
    const updateOverflowState = () => {
      const over = isX ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
      el.toggleAttribute("data-overflowing", over > 4);
    };
    updateOverflowState();
    window.addEventListener("resize", updateOverflowState, { passive: true });

    let dragging = false;
    let moved = false;
    let start = 0;
    let startScroll = 0;
    let last = 0;
    let lastT = 0;
    let v = 0;
    let raf = 0;

    const stopInertia = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      v = 0;
    };

    const startInertia = () => {
      if (motionOff || !allowMotion) return;
      stopInertia();
      const step = () => {
        // Friction tuned to feel premium, not "flingy".
        v *= 0.92;
        if (Math.abs(v) < 0.1) {
          raf = 0;
          if (snapMode === "cards") snapToCard();
          return;
        }
        if (isX) el.scrollLeft -= v;
        else el.scrollTop -= v;
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const snapToCard = () => {
      // Only on small layouts where it's a carousel.
      if (window.matchMedia?.("(min-width: 768px)")?.matches) return;
      const cards = Array.from(el.querySelectorAll(".case-card"));
      if (!cards.length) return;
      const center = el.scrollLeft + el.clientWidth * 0.5;
      let best = { x: el.scrollLeft, d: Number.POSITIVE_INFINITY };
      for (const c of cards) {
        const cx = c.offsetLeft + c.offsetWidth * 0.5;
        const d = Math.abs(cx - center);
        if (d < best.d) best = { x: c.offsetLeft - 12, d };
      }
      el.scrollTo({ left: Math.max(0, best.x), behavior: motionOff ? "auto" : "smooth" });
    };

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!el.hasAttribute("data-overflowing")) return;
      stopInertia();
      dragging = true;
      moved = false;
      el.setAttribute("data-dragging", "true");
      start = isX ? e.clientX : e.clientY;
      startScroll = isX ? el.scrollLeft : el.scrollTop;
      last = start;
      lastT = performance.now();
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onPointerMove = (e) => {
      if (!dragging) return;
      const now = performance.now();
      const cur = isX ? e.clientX : e.clientY;
      const dx = cur - start;

      if (!moved && Math.abs(dx) > 6) moved = true;
      const next = startScroll - dx;
      if (isX) el.scrollLeft = next;
      else el.scrollTop = next;

      const dt = Math.max(8, now - lastT);
      v = (cur - last) / dt * 16; // px per frame-ish
      last = cur;
      lastT = now;
    };

    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      el.removeAttribute("data-dragging");
      try {
        el.releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      if (moved) startInertia();
      else if (snapMode === "cards") snapToCard();
    };

    // Prevent accidental click-through when a drag happened.
    el.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true,
    );

    // Keyboard support: arrows scroll the carousel when focused.
    el.addEventListener("keydown", (e) => {
      if (!el.hasAttribute("data-overflowing")) return;
      if (!(e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      if (!isX) return;
      const dir = e.key === "ArrowLeft" ? -1 : 1;
      const delta = Math.max(240, Math.round(el.clientWidth * 0.75));
      el.scrollBy({ left: dir * delta, behavior: motionOff ? "auto" : "smooth" });
    });

    // Pointer listeners.
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointermove", onPointerMove, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointercancel", onPointerUp, { passive: true });

    // If the user wheel-scrolls horizontally, snap afterwards.
    let wheelT = 0;
    el.addEventListener(
      "scroll",
      () => {
        if (snapMode !== "cards") return;
        window.clearTimeout(wheelT);
        wheelT = window.setTimeout(() => snapToCard(), 110);
      },
      { passive: true },
    );
  };

  els.forEach(enhance);
}

// When the Contact section scrolls into view, briefly pulse the primary CTA
// (Email me) once - a quiet nudge that the page's main action is within
// reach. One-shot animation, not infinite; skipped for reduced-motion users.
function initCtaEmphasis() {
  const contact = document.getElementById("contact");
  const cta = document.getElementById("emailCta");
  if (!contact || !cta) return;
  if (document.documentElement.dataset.motion === "off") return;

  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        cta.classList.add("cta-pulse");
        // Remove after the animation so focus/hover states aren't polluted.
        setTimeout(() => cta.classList.remove("cta-pulse"), 2400);
        obs.disconnect();
      }
    },
    { threshold: 0.35 }
  );
  obs.observe(contact);
}

function initHeroIntroMotion({ allowMotion }) {
  const hero = document.querySelector('section[data-scene="hero"]');
  if (!hero) return;

  const h1 = hero.querySelector("[data-typewriter]");
  const fullText = h1 ? (h1.textContent || "").replace(/\s+/g, " ").trim() : "";
  if (!h1 || !fullText) return;

  // Full sentence for screen readers regardless of animation state.
  h1.setAttribute("aria-label", fullText);

  const motionOff =
    !allowMotion ||
    document.documentElement.dataset.motion === "off" ||
    typeof window.gsap === "undefined";

  if (motionOff) {
    // Show the full headline immediately, no typewriter.
    h1.textContent = fullText;
    return;
  }

  const gsap = window.gsap;

  // Build every character up front in its final wrapped position. Each span
  // is visibility:hidden so it reserves its exact layout slot; typing then
  // flips them visible in order. This keeps letters from sliding rightward.
  h1.textContent = "";
  const stage = document.createElement("span");
  stage.className = "hero-type-stage";
  stage.setAttribute("aria-hidden", "true");

  const chars = [];
  for (const ch of fullText) {
    const sp = document.createElement("span");
    sp.className = "hero-char";
    // Non-breaking invisibility for spaces while retaining break opportunity.
    sp.textContent = ch;
    stage.appendChild(sp);
    chars.push(sp);
  }

  const caret = document.createElement("span");
  caret.className = "hero-type-caret";
  stage.appendChild(caret);
  h1.appendChild(stage);

  // Position the caret at the trailing edge of the n-th character.
  // Uses rect measurement so the caret lands correctly on every line even
  // when the headline wraps across multiple lines.
  const placeCaretAt = (idx) => {
    if (!chars.length) return;
    const clamped = Math.max(0, Math.min(chars.length - 1, idx));
    const target = chars[clamped];
    if (!target) return;
    const stageRect = stage.getBoundingClientRect();
    const r = target.getBoundingClientRect();
    // Before the first char has been "typed", anchor to its leading edge.
    const atLeading = idx < 0;
    const x = (atLeading ? r.left : r.right) - stageRect.left;
    const y = r.top - stageRect.top + r.height * 0.08;
    caret.style.transform = `translate(${x}px, ${y}px)`;
    caret.style.height = `${r.height * 0.82}px`;
  };

  // Initial caret placement once the browser has laid out the headline.
  requestAnimationFrame(() => placeCaretAt(-1));

  // Split after commas to insert natural pauses between clauses.
  const segments = fullText.split(/(?<=,)/);
  const charDuration = 0.044; // ~44ms per character (2× slower, calmer cadence)
  const commaPause = 0.22;
  let typedCount = 0;

  const tl = gsap.timeline();

  segments.forEach((seg, idx) => {
    const startLen = typedCount;
    const endLen = startLen + seg.length;
    const counter = { n: startLen };
    tl.to(counter, {
      n: endLen,
      duration: Math.max(0.08, seg.length * charDuration),
      ease: "none",
      onUpdate: () => {
        const cur = Math.floor(counter.n);
        for (let i = 0; i < cur; i++) {
          const c = chars[i];
          if (c && !c.classList.contains("is-shown")) {
            c.classList.add("is-shown");
          }
        }
        placeCaretAt(cur - 1);
      },
    });
    typedCount = endLen;
    if (idx < segments.length - 1) {
      tl.to({}, { duration: commaPause });
    }
  });

  tl.call(() => {
    chars.forEach((c) => c.classList.add("is-shown"));
    placeCaretAt(chars.length - 1);
    // Caret stays parked at the end and keeps blinking (CSS animation).
    // Start a 3-second glow wave that travels first → last character.
    startHeadlineGlowWave(chars);
  });
}

function startHeadlineGlowWave(chars) {
  if (!chars || !chars.length) return;
  const gsap = window.gsap;
  if (!gsap) return;
  if (document.documentElement.dataset.motion === "off") return;

  // Sweep duration + repeat delay = 3 seconds per full cycle.
  const sweepDuration = 1.4;
  const cycleDelay = 1.6;
  const perChar = sweepDuration / Math.max(1, chars.length - 1);

  const waveTl = gsap.timeline({ repeat: -1, repeatDelay: cycleDelay });

  chars.forEach((c, i) => {
    waveTl.call(
      () => {
        // Restart the CSS pulse animation on each pass.
        c.classList.remove("is-pulsing");
        // Force reflow so the animation actually replays.
        void c.offsetWidth;
        c.classList.add("is-pulsing");
      },
      null,
      i * perChar,
    );
  });
}

injectUtilityClasses();
flagViewTransitions();
initYear();
initMobileMenu();
initStickyNav();
initSmoothAnchors();
initScrollSpy();
const allowMotion = setMotionMode();
initReveal();
initCursorTrail({ allowMotion });
initHeroIntroMotion({ allowMotion });
initThree(allowMotion);
if (typeof window.initStoryScroll === "function") window.initStoryScroll(allowMotion);
initProjectModal();
initExpandables();
initBackToTop();
initCtaEmphasis();
initDragScrollEnhancements({ allowMotion });


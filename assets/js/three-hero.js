// Hero background: a soft "service ecosystem" visualization.
//
// Metaphor, not decoration: a handful of coordinating hubs (e.g. services,
// teams, case owners) with stakeholders / touchpoints orbiting around them,
// joined by a few cross-cluster bridges. Occasional pulses travel along
// connections to suggest signals, handoffs, or coordination.
//
// Design constraints:
//   - Very low contrast so it never competes with the headline.
//   - Small, deterministic structure (no random distance checks per frame).
//   - Cheap per-frame work: only orbit angles and pulse progress update.
//   - Respects prefers-reduced-motion via the `animate` flag (one static frame).
//   - Mobile gets skipped entirely upstream in main.js.

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Deterministic pseudo-random for stable placements across reloads.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Colors pulled from the site palette so the background reads as part of the
// brand, not a generic "tech demo."
const COLORS = {
  hub: 0x2a9d8f, // primary accent - stronger nodes
  orbit: 0xdff3ef, // soft highlight - quieter nodes
  line: 0xdff3ef, // connections
  pulse: 0x7fcdbf, // coordination signal
};

function lerpColorHex(a, b, t) {
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const rr = Math.round(lerp(ar, br, t));
  const rg = Math.round(lerp(ag, bg, t));
  const rb = Math.round(lerp(ab, bb, t));
  return (rr << 16) | (rg << 8) | rb;
}

window.initHeroNetwork = async function initHeroNetwork(canvas, { animate }) {
  const THREE = window.THREE;
  if (!THREE) throw new Error("Three.js not loaded");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(clamp(window.devicePixelRatio || 1, 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const group = new THREE.Group();
  scene.add(group);

  // Slight global tilt so the composition reads as 2.5D rather than flat.
  group.rotation.set(0.05, -0.08, 0);

  // ---------- Structure ----------
  // Hubs positioned in an asymmetric triangle - balanced but not mechanical.
  const rnd = mulberry32(42);
  const hubs = [
    { x: -2.9, y: 0.7, z: 0.0, orbits: 6, radius: 1.45, dir: 1, baseAngle: 0 },
    { x: 2.5, y: 1.3, z: -0.4, orbits: 5, radius: 1.25, dir: -1, baseAngle: 0.6 },
    { x: 1.0, y: -1.7, z: 0.2, orbits: 4, radius: 1.05, dir: 1, baseAngle: 1.8 },
  ];

  // Orbit nodes tied to a hub with angle + small z offset.
  const orbits = [];
  for (let hi = 0; hi < hubs.length; hi++) {
    const h = hubs[hi];
    for (let i = 0; i < h.orbits; i++) {
      const angle = h.baseAngle + (i / h.orbits) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
      orbits.push({
        hub: hi,
        angle,
        angleVel: 0.00018 * h.dir * (0.85 + rnd() * 0.4), // very slow
        radius: h.radius * (0.88 + rnd() * 0.2),
        yFlatten: 0.82 + rnd() * 0.1, // slightly squashed ellipse
        z: h.z + (rnd() - 0.5) * 0.6,
      });
    }
  }

  const HUB_COUNT = hubs.length;
  const ORBIT_COUNT = orbits.length;
  const TOTAL_COUNT = HUB_COUNT + ORBIT_COUNT;

  // Shared position buffer indexed by [hubs..., orbits...].
  const allPositions = new Float32Array(TOTAL_COUNT * 3);
  const writeHubPositions = () => {
    for (let i = 0; i < HUB_COUNT; i++) {
      allPositions[i * 3 + 0] = hubs[i].x;
      allPositions[i * 3 + 1] = hubs[i].y;
      allPositions[i * 3 + 2] = hubs[i].z;
    }
  };
  const writeOrbitPositions = () => {
    for (let oi = 0; oi < ORBIT_COUNT; oi++) {
      const o = orbits[oi];
      const h = hubs[o.hub];
      const px = h.x + Math.cos(o.angle) * o.radius;
      const py = h.y + Math.sin(o.angle) * o.radius * o.yFlatten;
      const pz = o.z;
      const idx = (HUB_COUNT + oi) * 3;
      allPositions[idx + 0] = px;
      allPositions[idx + 1] = py;
      allPositions[idx + 2] = pz;
    }
  };
  writeHubPositions();
  writeOrbitPositions();

  // ---------- Geometries / materials ----------

  // Hubs: brighter, slightly larger.
  const hubGeom = new THREE.BufferGeometry();
  const hubPositions = new Float32Array(HUB_COUNT * 3);
  for (let i = 0; i < HUB_COUNT; i++) {
    hubPositions[i * 3 + 0] = allPositions[i * 3 + 0];
    hubPositions[i * 3 + 1] = allPositions[i * 3 + 1];
    hubPositions[i * 3 + 2] = allPositions[i * 3 + 2];
  }
  hubGeom.setAttribute("position", new THREE.BufferAttribute(hubPositions, 3));
  const hubMaterial = new THREE.PointsMaterial({
    size: 0.13,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    color: new THREE.Color(COLORS.hub),
  });
  const hubPoints = new THREE.Points(hubGeom, hubMaterial);
  group.add(hubPoints);

  // Orbit nodes: softer, smaller.
  const orbitGeom = new THREE.BufferGeometry();
  const orbitPositions = new Float32Array(ORBIT_COUNT * 3);
  for (let oi = 0; oi < ORBIT_COUNT; oi++) {
    const base = (HUB_COUNT + oi) * 3;
    orbitPositions[oi * 3 + 0] = allPositions[base + 0];
    orbitPositions[oi * 3 + 1] = allPositions[base + 1];
    orbitPositions[oi * 3 + 2] = allPositions[base + 2];
  }
  orbitGeom.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3));
  const orbitMaterial = new THREE.PointsMaterial({
    size: 0.065,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    color: new THREE.Color(COLORS.orbit),
  });
  const orbitPointsObj = new THREE.Points(orbitGeom, orbitMaterial);
  group.add(orbitPointsObj);

  // Connections: every orbit node -> its hub, plus inter-hub bridges.
  const segments = [];
  for (let oi = 0; oi < ORBIT_COUNT; oi++) {
    segments.push({ a: HUB_COUNT + oi, b: orbits[oi].hub }); // orbit -> hub
  }
  for (let i = 0; i < HUB_COUNT; i++) {
    for (let j = i + 1; j < HUB_COUNT; j++) {
      segments.push({ a: i, b: j }); // hub <-> hub
    }
  }

  const lineGeom = new THREE.BufferGeometry();
  const linePositions = new Float32Array(segments.length * 2 * 3);
  lineGeom.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  const lineMaterial = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: 0.13, // very quiet; text should always win
    depthWrite: false,
    color: new THREE.Color(COLORS.line),
  });
  const lines = new THREE.LineSegments(lineGeom, lineMaterial);
  group.add(lines);

  const updateLinePositions = () => {
    for (let s = 0; s < segments.length; s++) {
      const { a, b } = segments[s];
      const k = s * 2 * 3;
      linePositions[k + 0] = allPositions[a * 3 + 0];
      linePositions[k + 1] = allPositions[a * 3 + 1];
      linePositions[k + 2] = allPositions[a * 3 + 2];
      linePositions[k + 3] = allPositions[b * 3 + 0];
      linePositions[k + 4] = allPositions[b * 3 + 1];
      linePositions[k + 5] = allPositions[b * 3 + 2];
    }
    lineGeom.attributes.position.needsUpdate = true;
  };
  updateLinePositions();

  // Pulses: small bright dots that travel along random segments - the
  // "signal" metaphor. Kept to 2 so cost stays negligible.
  const PULSE_COUNT = 2;
  const pulses = [];
  for (let i = 0; i < PULSE_COUNT; i++) {
    pulses.push({ seg: Math.floor(rnd() * segments.length), t: rnd(), speed: 0 });
  }
  const assignPulseSpeed = (p) => {
    p.speed = 0.00045 + rnd() * 0.00035;
  };
  pulses.forEach(assignPulseSpeed);

  const pulseGeom = new THREE.BufferGeometry();
  const pulsePositions = new Float32Array(PULSE_COUNT * 3);
  pulseGeom.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));
  const pulseMaterial = new THREE.PointsMaterial({
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    color: new THREE.Color(COLORS.pulse),
  });
  const pulsePoints = new THREE.Points(pulseGeom, pulseMaterial);
  group.add(pulsePoints);

  const updatePulses = (dt) => {
    for (let i = 0; i < pulses.length; i++) {
      const p = pulses[i];
      p.t += p.speed * dt;
      if (p.t >= 1) {
        p.t = 0;
        p.seg = Math.floor(rnd() * segments.length);
        assignPulseSpeed(p);
      }
      const { a, b } = segments[p.seg];
      const ax = allPositions[a * 3 + 0];
      const ay = allPositions[a * 3 + 1];
      const az = allPositions[a * 3 + 2];
      const bx = allPositions[b * 3 + 0];
      const by = allPositions[b * 3 + 1];
      const bz = allPositions[b * 3 + 2];
      // Ease-in-out so pulses accelerate then glide into the hub.
      const e = p.t < 0.5 ? 2 * p.t * p.t : 1 - Math.pow(-2 * p.t + 2, 2) / 2;
      pulsePositions[i * 3 + 0] = lerp(ax, bx, e);
      pulsePositions[i * 3 + 1] = lerp(ay, by, e);
      pulsePositions[i * 3 + 2] = lerp(az, bz, e);
      // Fade at the tails so they feel like signals, not bullets.
      const edgeFade = Math.min(p.t, 1 - p.t) * 6; // 0 at ends, 1 in middle
      pulseMaterial.opacity = clamp(0.15 + edgeFade * 0.55, 0.15, 0.7);
    }
    pulseGeom.attributes.position.needsUpdate = true;
  };

  // ---------- Layout / events ----------

  const state = {
    w: 1,
    h: 1,
    mouseX: 0,
    mouseY: 0,
    targetMX: 0,
    targetMY: 0,
    dragOn: false,
    dragX: 0,
    dragY: 0,
    dragTX: 0,
    dragTY: 0,
    energy: 0,
  };

  function setSize() {
    const rect = canvas.getBoundingClientRect();
    state.w = Math.max(1, Math.floor(rect.width));
    state.h = Math.max(1, Math.floor(rect.height));
    camera.aspect = state.w / state.h;
    camera.updateProjectionMatrix();
    renderer.setSize(state.w, state.h, false);
  }
  setSize();

  let disposed = false;
  const ro = new ResizeObserver(() => setSize());
  ro.observe(canvas);

  const pointFromEvent = (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x, y };
  };

  function onPointerMove(e) {
    const { x, y } = pointFromEvent(e);
    state.targetMX = clamp((x - 0.5) * 2, -1, 1);
    state.targetMY = clamp((y - 0.5) * 2, -1, 1);
  }

  function onPointerDown(e) {
    if (!animate) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    state.dragOn = true;
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerUp(e) {
    if (!animate) return;
    state.dragOn = false;
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  }

  function onPointerDrag(e) {
    if (!animate) return;
    if (!state.dragOn) return;
    const dx = typeof e.movementX === "number" ? e.movementX : 0;
    const dy = typeof e.movementY === "number" ? e.movementY : 0;
    const scale = 1 / Math.max(420, Math.min(window.innerWidth, 1400));
    state.dragTX = clamp(state.dragTX + dx * scale, -0.16, 0.16);
    state.dragTY = clamp(state.dragTY + dy * scale, -0.16, 0.16);
    state.energy = clamp(state.energy + (Math.abs(dx) + Math.abs(dy)) * 0.003, 0, 1);
  }

  // Only wire pointer interactions when animating - saves listeners otherwise.
  if (animate) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
    canvas.addEventListener("pointerup", onPointerUp, { passive: true });
    canvas.addEventListener("pointercancel", onPointerUp, { passive: true });
    canvas.addEventListener("pointermove", onPointerDrag, { passive: true });
  }

  // ---------- Render loop ----------

  const SCENE_STATES = [
    { id: "hero", hub: COLORS.hub, orbit: COLORS.orbit, line: COLORS.line, pulse: COLORS.pulse, rotZ: 0.09, lineA: 0.13 },
    { id: "focus", hub: 0x31d0c3, orbit: 0xdff3ef, line: 0xdff3ef, pulse: 0x8ef2e8, rotZ: 0.075, lineA: 0.12 },
    { id: "skills", hub: 0x2a9d8f, orbit: 0xc7eae3, line: 0xdff3ef, pulse: 0x7fcdbf, rotZ: 0.085, lineA: 0.125 },
    { id: "projects", hub: 0x31d0c3, orbit: 0xdff3ef, line: 0xdff3ef, pulse: 0x7fcdbf, rotZ: 0.095, lineA: 0.145 },
    { id: "experience", hub: 0x23897d, orbit: 0xdff3ef, line: 0xdff3ef, pulse: 0xa8ded6, rotZ: 0.07, lineA: 0.115 },
    { id: "contact", hub: 0x56bbaa, orbit: 0xdff3ef, line: 0xdff3ef, pulse: 0xdff3ef, rotZ: 0.055, lineA: 0.105 },
  ];

  const applyStoryAmbience = () => {
    const sp = typeof window.__storyScrollProgress === "number" ? window.__storyScrollProgress : 0;
    const activeId = typeof window.__storyScene === "string" ? window.__storyScene : "hero";
    const sceneP =
      window.__storySceneProgress && typeof window.__storySceneProgress[activeId] === "number"
        ? window.__storySceneProgress[activeId]
        : 0;

    const curIdx = Math.max(0, SCENE_STATES.findIndex((s) => s.id === activeId));
    const cur = SCENE_STATES[curIdx] || SCENE_STATES[0];
    const next = SCENE_STATES[Math.min(SCENE_STATES.length - 1, curIdx + 1)] || cur;

    // Blend into the next scene as you move through the current one.
    const t = clamp((sceneP - 0.35) / 0.65, 0, 1);
    hubMaterial.color.setHex(lerpColorHex(cur.hub, next.hub, t));
    orbitMaterial.color.setHex(lerpColorHex(cur.orbit, next.orbit, t));
    lineMaterial.color.setHex(lerpColorHex(cur.line, next.line, t));
    pulseMaterial.color.setHex(lerpColorHex(cur.pulse, next.pulse, t));
    lineMaterial.opacity = lerp(cur.lineA, next.lineA, t);

    const rotZ = lerp(cur.rotZ, next.rotZ, t);
    group.rotation.z = sp * rotZ - 0.03;
    canvas.style.opacity = String(0.62 + sp * 0.34);

    state.dragX = lerp(state.dragX, state.dragTX, 0.08);
    state.dragY = lerp(state.dragY, state.dragTY, 0.08);
    state.dragTX *= 0.965;
    state.dragTY *= 0.965;
    state.energy = lerp(state.energy, 0, 0.06);
  };

  function step(dt) {
    // Ease pointer influence - very subtle so the background is never pushy.
    state.mouseX = lerp(state.mouseX, state.targetMX, 0.045);
    state.mouseY = lerp(state.mouseY, state.targetMY, 0.045);
    group.rotation.y = 0.05 + state.mouseX * 0.12 + state.dragX * 0.9;
    group.rotation.x = -0.08 - state.mouseY * 0.08 - state.dragY * 0.7;
    applyStoryAmbience();

    // Slow orbit motion - visible only on close inspection.
    for (let oi = 0; oi < ORBIT_COUNT; oi++) {
      const boost = 1 + state.energy * 0.9;
      orbits[oi].angle += orbits[oi].angleVel * dt * boost;
    }
    writeOrbitPositions();

    // Push orbit positions to GPU.
    for (let oi = 0; oi < ORBIT_COUNT; oi++) {
      const base = (HUB_COUNT + oi) * 3;
      orbitPositions[oi * 3 + 0] = allPositions[base + 0];
      orbitPositions[oi * 3 + 1] = allPositions[base + 1];
      orbitPositions[oi * 3 + 2] = allPositions[base + 2];
    }
    orbitGeom.attributes.position.needsUpdate = true;

    // Lines follow the moving orbit ends.
    updateLinePositions();

    updatePulses(dt);
  }

  function renderOnce() {
    // Static composition for reduced-motion: one clean frame, no pulses.
    pulsePoints.visible = false;
    applyStoryAmbience();
    renderer.render(scene, camera);
  }

  let last = performance.now();
  function loop(now) {
    if (disposed) return;
    const dtMs = now - last;
    last = now;
    const dt = clamp(dtMs, 10, 40);
    step(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  if (animate) requestAnimationFrame(loop);
  else renderOnce();

  // Static WebGL (e.g. mobile): still follow scroll-linked ambience when GSAP sets __storyScrollProgress.
  let ambRaf = 0;
  const onScrollAmbience = () => {
    if (animate) return;
    if (ambRaf) return;
    ambRaf = requestAnimationFrame(() => {
      ambRaf = 0;
      applyStoryAmbience();
      renderer.render(scene, camera);
    });
  };
  if (!animate) {
    window.addEventListener("scroll", onScrollAmbience, { passive: true });
  }

  // Pause when tab hidden or when the hero scrolls out of view - both save
  // battery on laptops and stop unnecessary GPU work.
  function onVis() {
    if (!animate) return;
    if (document.hidden) {
      disposed = true;
    } else if (disposed) {
      disposed = false;
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }
  document.addEventListener("visibilitychange", onVis);

  let inView = true;
  const visObs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        inView = e.isIntersecting;
        if (!animate) return;
        if (!inView) {
          disposed = true;
        } else if (disposed && !document.hidden) {
          disposed = false;
          last = performance.now();
          requestAnimationFrame(loop);
        }
      }
    },
    { threshold: 0 },
  );
  visObs.observe(canvas);

  return () => {
    disposed = true;
    ro.disconnect();
    visObs.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("scroll", onScrollAmbience);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("pointermove", onPointerDrag);
    document.removeEventListener("visibilitychange", onVis);
    renderer.dispose();
    hubGeom.dispose();
    orbitGeom.dispose();
    lineGeom.dispose();
    pulseGeom.dispose();
    hubMaterial.dispose();
    orbitMaterial.dispose();
    lineMaterial.dispose();
    pulseMaterial.dispose();
  };
};

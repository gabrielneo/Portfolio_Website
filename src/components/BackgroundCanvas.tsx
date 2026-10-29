import { lazy, Suspense, useEffect, useState } from "react";
import { backgroundInput as input } from "./backgroundInput";

const NetworkScene = lazy(() => import("./NetworkScene"));

// ---------------------------------------------------------------------------
// Background: an interactive constellation behind every section.
//   - Nodes drift, link up when close, lean towards the cursor, and speed up
//     and stretch with scroll velocity before settling again.
//   - Desktop only. Phones, modest GPUs and Reduce Motion get a static CSS
//     gradient mesh instead (no WebGL at all).
//   - Never intercepts clicks; pauses automatically when the tab is hidden.
// ---------------------------------------------------------------------------

/** Static fallback: layered radial gradients that suggest the same glow. */
function GradientMesh() {
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: [
          "radial-gradient(40% 35% at 15% 12%, rgba(16,185,129,.20), transparent 70%)",
          "radial-gradient(35% 30% at 85% 25%, rgba(6,182,212,.16), transparent 70%)",
          "radial-gradient(45% 40% at 70% 85%, rgba(45,212,191,.10), transparent 70%)",
          "radial-gradient(30% 30% at 25% 70%, rgba(6,182,212,.08), transparent 70%)",
        ].join(","),
      }}
    />
  );
}

type Mode = "webgl" | "mesh";

export function detectBackgroundMode(): Mode {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "mesh";
  if (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768) return "mesh";
  if ((navigator.hardwareConcurrency ?? 4) <= 4) return "mesh";
  try {
    const canvas = document.createElement("canvas");
    if (!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"))) return "mesh";
  } catch {
    return "mesh";
  }
  return "webgl";
}

export default function BackgroundCanvas() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    setMode(detectBackgroundMode());

    const onMove = (e: PointerEvent) => {
      input.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.y = -((e.clientY / window.innerHeight) * 2 - 1);
      input.active = true;
    };
    const onLeave = () => (input.active = false);
    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      input.scrollVelocity = ((window.scrollY - lastY) / dt) * 1000; // px per second
      lastY = window.scrollY;
      lastT = now;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
      <GradientMesh />
      {mode === "webgl" && (
        <Suspense fallback={null}>
          <NetworkScene />
        </Suspense>
      )}
    </div>
  );
}

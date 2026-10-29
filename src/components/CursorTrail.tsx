import { useEffect, useRef } from "react";

// A soft teal glow that follows the cursor and fades out. Mouse/trackpad
// only, off with Reduce Motion, never blocks clicks, and stops drawing as
// soon as the trail has faded.
const MAX_POINTS = 28;
const LIFETIME_MS = 420;

export default function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine) and (hover: hover)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!fine || reduced || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points: { x: number; y: number; t: number }[] = [];
    let frame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = () => {
      const now = performance.now();
      while (points.length && now - points[0].t > LIFETIME_MS) points.shift();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";
      points.forEach((p, i) => {
        const life = 1 - (now - p.t) / LIFETIME_MS;
        const radius = 4 + (i / points.length) * 10;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        g.addColorStop(0, `rgba(45, 212, 191, ${0.22 * life})`);
        g.addColorStop(1, "rgba(6, 182, 212, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
      frame = points.length ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (points.length > MAX_POINTS) points.shift();
      if (!frame) frame = requestAnimationFrame(draw);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 h-full w-full" />;
}

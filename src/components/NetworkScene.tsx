import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { backgroundInput as input } from "./backgroundInput";

// WebGL constellation. Loaded lazily by BackgroundCanvas, and only on
// desktops that can run it, so phones never download three.js.

const NODE_COUNT = 90;
const LINK_DISTANCE = 1.55;
const TEAL = new THREE.Color("#2dd4bf");
const CYAN = new THREE.Color("#06b6d4");

function glowTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.75)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Network() {
  const { viewport } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const texture = useMemo(glowTexture, []);
  const leanRef = useRef(0);
  const surgeRef = useRef(0);
  const scrollShiftRef = useRef(0);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const state = useMemo(() => {
    // `base` drifts on its own; `positions` (what's drawn) adds a temporary
    // lean towards the cursor and a scroll shift, so nodes never pile up.
    const base = new Float32Array(NODE_COUNT * 3);
    const positions = new Float32Array(NODE_COUNT * 3);
    const velocities = new Float32Array(NODE_COUNT * 3);
    const colors = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      base[i * 3] = (Math.random() - 0.5) * 14;
      base[i * 3 + 1] = (Math.random() - 0.5) * 9;
      base[i * 3 + 2] = (Math.random() - 0.5) * 2;
      velocities[i * 3] = (Math.random() - 0.5) * 0.12;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
      const c = TEAL.clone().lerp(CYAN, Math.random());
      colors.set([c.r, c.g, c.b], i * 3);
    }
    positions.set(base);
    const maxLinks = (NODE_COUNT * (NODE_COUNT - 1)) / 2;
    return {
      base,
      positions,
      velocities,
      colors,
      linePositions: new Float32Array(maxLinks * 6),
      lineColors: new Float32Array(maxLinks * 6),
      // Fixed bounds that cover the whole field, so frustum culling stays
      // correct even though vertices move every frame.
      bounds: new THREE.Sphere(new THREE.Vector3(0, 0, 0), 12),
    };
  }, []);

  useEffect(() => {
    if (pointsRef.current) pointsRef.current.geometry.boundingSphere = state.bounds;
    if (linesRef.current) linesRef.current.geometry.boundingSphere = state.bounds;
  }, [state]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const { base, positions, velocities, linePositions, lineColors } = state;
    const halfW = viewport.width / 2 + 0.5;
    const halfH = viewport.height / 2 + 0.5;
    const px = input.x * (viewport.width / 2);
    const py = input.y * (viewport.height / 2);

    // Cursor lean and scroll surge both ease in and out.
    leanRef.current += ((input.active ? 1 : 0) - leanRef.current) * Math.min(1, delta * 4);
    const targetSurge = Math.min(1, Math.abs(input.scrollVelocity) / 2500);
    surgeRef.current += (targetSurge - surgeRef.current) * Math.min(1, delta * 6);
    input.scrollVelocity *= Math.pow(0.02, delta); // decays within ~1s
    scrollShiftRef.current += (Math.sign(input.scrollVelocity) * surgeRef.current * 0.6 - scrollShiftRef.current) * Math.min(1, delta * 5);
    const lean = leanRef.current;
    const speed = 1 + surgeRef.current * 5;
    const shift = scrollShiftRef.current;

    for (let i = 0; i < NODE_COUNT; i++) {
      const ix = i * 3;
      base[ix] += velocities[ix] * delta * speed;
      base[ix + 1] += velocities[ix + 1] * delta * speed;
      if (base[ix] > halfW) base[ix] = -halfW;
      if (base[ix] < -halfW) base[ix] = halfW;
      if (base[ix + 1] > halfH) base[ix + 1] = -halfH;
      if (base[ix + 1] < -halfH) base[ix + 1] = halfH;

      let ox = 0;
      let oy = 0;
      if (lean > 0.001) {
        const dx = px - base[ix];
        const dy = py - base[ix + 1];
        const falloff = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 2.5);
        const pull = falloff * falloff * 0.25 * lean;
        ox = dx * pull;
        oy = dy * pull;
      }
      // Scrolling nudges the field upward/downward, deeper nodes more (parallax).
      positions[ix] = base[ix] + ox;
      positions[ix + 1] = base[ix + 1] + oy + shift * (1 + base[ix + 2] * 0.4);
      positions[ix + 2] = base[ix + 2];
    }

    let link = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const ax = positions[i * 3], ay = positions[i * 3 + 1], az = positions[i * 3 + 2];
        const bx = positions[j * 3], by = positions[j * 3 + 1], bz = positions[j * 3 + 2];
        const dx = ax - bx, dy = ay - by;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > LINK_DISTANCE) continue;
        let strength = (1 - dist / LINK_DISTANCE) * (1 + surgeRef.current * 0.6);
        if (input.active) {
          const mx = (ax + bx) / 2 - px, my = (ay + by) / 2 - py;
          strength *= 1 + Math.max(0, 1.6 - Math.sqrt(mx * mx + my * my)) * 1.2;
        }
        tmpColor.copy(TEAL).multiplyScalar(Math.min(1, strength * 0.55));
        linePositions.set([ax, ay, az, bx, by, bz], link * 6);
        lineColors.set([tmpColor.r, tmpColor.g, tmpColor.b, tmpColor.r, tmpColor.g, tmpColor.b], link * 6);
        link++;
      }
    }

    const points = pointsRef.current;
    if (points) (points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    const lines = linesRef.current;
    if (lines) {
      (lines.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (lines.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      lines.geometry.setDrawRange(0, link * 2);
    }
  });

  return (
    <>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[state.linePositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[state.lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[state.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[state.colors, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.16} map={texture} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </>
  );
}


export default function NetworkScene() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 7], fov: 60 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Network />
    </Canvas>
  );
}

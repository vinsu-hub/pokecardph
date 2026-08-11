"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { usePrefersReducedMotion } from "@/lib/use-is-client";

/**
 * The condition viewer, per POKECARD_PH_PHASE7_SCAN_3D.md §4.3.
 *
 * The mechanic is deliberately NOT a rotating object. It is a **flat plane with
 * a moving virtual light**: the card stays put and the light travels, so
 * surface detail catches and releases exactly the way it does when you tilt a
 * real card under a lamp. A spinning card shows you its shape, which you
 * already know; a moving light shows you its *surface*, which is the thing a
 * buyer is actually trying to judge.
 *
 * The normal map carries that surface. Nothing here computes one — it renders
 * whatever map it's handed.
 *
 * §8's motion note is the reason for the damping: the light's target follows
 * the cursor instantly, but the rendered position eases toward it every frame,
 * so the highlight has a little weight instead of snapping around like a
 * cursor readout. This is the one place in the product where a continuous,
 * non-discrete animation is correct.
 */

export type SurfaceLighting = {
  /** Ambient fill. Low values make the normal map's relief read strongly. */
  ambient: number;
  /** Moving light intensity. */
  intensity: number;
  color: string;
  background: string;
};

function Plane({
  albedo,
  normal,
  tiltX,
  tiltY,
  zoom,
  lighting,
  reducedMotion,
}: {
  albedo: string;
  normal: string | null;
  tiltX: number;
  tiltY: number;
  zoom: number;
  lighting: SurfaceLighting;
  reducedMotion: boolean;
}) {
  // useLoader suspends until the textures are decoded, so the parent's
  // <Suspense> fallback covers the gap rather than flashing an untextured
  // white rectangle.
  const maps = useLoader(THREE.TextureLoader, normal ? [albedo, normal] : [albedo]);
  const [rawAlbedo, rawNormal] = maps;

  // Cloned rather than mutated in place: `maps` is the loader's cache, shared
  // across every component using the same URL, so writing `.colorSpace` onto
  // it directly would leak into whichever other mount reads it next. Cloning
  // gives each viewer instance its own texture object to configure.
  const albedoMap = useMemo(() => {
    const t = rawAlbedo.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [rawAlbedo]);

  // A normal map is direction data, not colour — decoding it through sRGB
  // would bend every vector it encodes.
  const normalMap = useMemo(() => {
    if (!rawNormal) return null;
    const t = rawNormal.clone();
    t.colorSpace = THREE.LinearSRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [rawNormal]);

  const light = useRef<THREE.PointLight>(null);
  const group = useRef<THREE.Group>(null);
  const target = useRef({ x: 1.2, y: 1.2 });

  useFrame(({ pointer }, delta) => {
    if (!light.current || !group.current) return;

    if (!reducedMotion) {
      // Pointer is -1..1 across the canvas. Scaled out so the light travels
      // beyond the card's edges and the highlight can leave the surface
      // entirely — that exit is most of what sells the effect.
      target.current.x = pointer.x * 3.2;
      target.current.y = pointer.y * 3.2;
    }

    // Frame-rate independent damping. Higher = snappier; this is tuned to
    // feel like the card has a little mass.
    const k = 1 - Math.exp(-7 * delta);
    light.current.position.x += (target.current.x - light.current.position.x) * k;
    light.current.position.y += (target.current.y - light.current.position.y) * k;

    const tx = THREE.MathUtils.degToRad(tiltX);
    const ty = THREE.MathUtils.degToRad(tiltY);
    group.current.rotation.x += (tx - group.current.rotation.x) * k;
    group.current.rotation.y += (ty - group.current.rotation.y) * k;
    group.current.scale.setScalar(
      group.current.scale.x + (zoom - group.current.scale.x) * k,
    );
  });

  return (
    <>
      <ambientLight intensity={lighting.ambient} />
      <pointLight
        ref={light}
        position={[1.2, 1.2, 2.4]}
        intensity={lighting.intensity}
        color={lighting.color}
        distance={12}
        decay={1.4}
      />
      <group ref={group}>
        {/* Thin backing box, not a second plane: the point is that the card
           has a visible edge as it tilts, which a plane-behind-a-plane
           wouldn't show from the side. This is what keeps a Flat Scan
           reading as an object instead of a photo pasted onto nothing —
           per the pasted conversation's "beveled-edge card mesh" idea. */}
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[2.5, 3.5, 0.06]} />
          <meshStandardMaterial color="#f2f2f0" roughness={0.7} metalness={0.05} />
        </mesh>

        {/* 5:7 — the real card aspect. */}
        <mesh>
          <planeGeometry args={[2.5, 3.5]} />
          <meshStandardMaterial
            map={albedoMap}
            normalMap={normalMap ?? null}
            normalScale={new THREE.Vector2(1.1, 1.1)}
            roughness={0.42}
            metalness={0.16}
          />
        </mesh>
      </group>
    </>
  );
}

export default function CardSurface({
  albedo,
  normal,
  tiltX = 0,
  tiltY = 0,
  zoom = 1,
  lighting,
  className,
}: {
  albedo: string;
  normal: string | null;
  tiltX?: number;
  tiltY?: number;
  zoom?: number;
  lighting: SurfaceLighting;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const key = useMemo(() => `${albedo}|${normal}`, [albedo, normal]);

  return (
    <Canvas
      className={className}
      camera={{ position: [0, 0, 5], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      style={{ background: lighting.background }}
    >
      <Plane
        key={key}
        albedo={albedo}
        normal={normal}
        tiltX={tiltX}
        tiltY={tiltY}
        zoom={zoom}
        lighting={lighting}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

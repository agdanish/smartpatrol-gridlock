import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildCity } from "./cityData";
import { VERT, FRAG } from "./shaders";
import type { FilmState } from "./useFilm";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* The single protagonist: one BufferGeometry, one ShaderMaterial, one draw call.
 * Camera + uniforms are applied from the shared film ref every frame, never via
 * setState in useFrame, never by tweening the camera object. */
export default function CityField({
  film,
  reduced,
  fine,
  pointCount,
}: {
  film: React.MutableRefObject<FilmState>;
  reduced: boolean;
  fine: boolean;
  pointCount: number;
}) {
  const { camera, gl, invalidate } = useThree();
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const c = buildCity(pointCount);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(c.position, 3));
    g.setAttribute("aScatter", new THREE.BufferAttribute(c.scatter, 3));
    g.setAttribute("aHot", new THREE.BufferAttribute(c.hot, 1));
    g.setAttribute("aKeep", new THREE.BufferAttribute(c.keep, 1));
    g.setAttribute("aRand", new THREE.BufferAttribute(c.rand, 1));
    return g;
  }, [pointCount]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uIgnite: { value: reduced ? 1 : 0 }, uProgress: { value: reduced ? 1 : 0.4 },
        uDark: { value: 0 }, uWipe: { value: 0 }, uSettle: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) }, uSearch: { value: 0 },
        uSize: { value: 3.0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [reduced]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // patrol searchlight, pointer drives LIGHT, never the camera (gated to fine pointers)
  useEffect(() => {
    if (!fine || reduced) return;
    const onMove = (e: PointerEvent) => {
      film.current.ptx = (e.clientX / window.innerWidth) * 2 - 1;
      film.current.pty = -((e.clientY / window.innerHeight) * 2 - 1);
      film.current.search = 1;
      document.documentElement.style.setProperty("--mx", e.clientX + "px");
      document.documentElement.style.setProperty("--my", e.clientY + "px");
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [fine, reduced, film]);

  // H8: under prefers-reduced-motion the Canvas runs frameloop="demand" and
  // useFrame never fires, so the scene would sit at mount defaults. Write the
  // fully-ignited end-state into the film ref + material + camera ourselves
  // (effects run child-before-parent, so we cannot rely on useFilm's effect
  // having run yet), then force a SINGLE render via invalidate() so a
  // reduced-motion visitor sees the lit 142-corner cloud, drawn edges and hub.
  useEffect(() => {
    if (!reduced) return;
    const f = film.current;
    f.ignite = 1; f.uProgress = 1; f.uDark = 0; f.uWipe = 0; f.uSettle = 0;
    f.cx = 0; f.cy = 2.4; f.cz = 11; f.lx = 0; f.ly = 0; f.lz = 0;
    const u = material.uniforms;
    camera.position.set(f.cx, f.cy, f.cz);
    camera.lookAt(f.lx, f.ly, f.lz);
    u.uIgnite.value = f.ignite;
    u.uProgress.value = f.uProgress;
    u.uDark.value = f.uDark;
    u.uWipe.value = f.uWipe;
    u.uSettle.value = f.uSettle;
    (u.uPointer.value as THREE.Vector2).set(0, 0);
    u.uSearch.value = 0;
    u.uTime.value = 0;
    invalidate();
  }, [reduced, camera, material, film, invalidate]);

  useFrame((_, dt) => {
    const f = film.current;
    const u = material.uniforms;
    camera.position.set(f.cx, f.cy, f.cz);
    camera.lookAt(f.lx, f.ly, f.lz);
    f.px = lerp(f.px, f.ptx, 0.08);
    f.py = lerp(f.py, f.pty, 0.08);
    (u.uPointer.value as THREE.Vector2).set(f.px, f.py);
    u.uSearch.value = f.search;
    u.uIgnite.value = f.ignite;
    u.uProgress.value = f.uProgress;
    u.uDark.value = f.uDark;
    u.uWipe.value = f.uWipe;
    u.uSettle.value = f.uSettle;
    u.uTime.value += Math.min(dt, 0.05);
    if (pointsRef.current) {
      // whole-field parallax toward pointer, transform only, capped hard
      pointsRef.current.rotation.y = lerp(pointsRef.current.rotation.y, f.px * 0.06, 0.05);
      pointsRef.current.rotation.x = lerp(pointsRef.current.rotation.x, -f.py * 0.05, 0.05);
    }
  });

  // selective bloom expects high-DPR amber; keep clear color matte navy
  useEffect(() => { gl.setClearColor(0x0b0d12, 1); }, [gl]);

  return (
    <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
  );
}

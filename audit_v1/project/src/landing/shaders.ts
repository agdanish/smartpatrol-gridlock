/* GLSL for the single THREE.Points protagonist. Two colours only, navy + brass , 
 * amber gated to the 142 hot corners. uIgnite (load), uProgress (scatter→cluster),
 * uDark (Act 3), uWipe (out-of-time backtest), uSettle (handoff), uSearch/uPointer
 * (patrol searchlight). Additive blending keeps navy matte and amber glowing. */

export const VERT = /* glsl */ `
  uniform float uTime, uProgress, uSize, uSettle;
  attribute vec3 aScatter;
  attribute float aHot, aKeep, aRand;
  varying float vHot, vKeep, vRand;
  varying vec2 vNdc;
  void main() {
    vec3 P = mix(aScatter, position, uProgress);
    vec3 grid = vec3(floor(position.x * 2.0 + 0.5) / 2.0, position.y * 0.4, floor(position.z * 2.0 + 0.5) / 2.0);
    P = mix(P, grid, uSettle * 0.35);
    P.y += sin(uTime * 0.5 + aRand * 6.2831) * 0.02 * (1.0 - aHot * 0.4);
    vec4 mv = modelViewMatrix * vec4(P, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.1);
    // dpr is owned by R3F (setPixelRatio); never multiply gl_PointSize by it here
    // or point size + bloom get double-counted by devicePixelRatio.
    float sz = uSize * (aHot > 0.5 ? 2.1 : 1.0) * (1.0 - uSettle * 0.25);
    gl_PointSize = sz * (9.0 / dist);
    vHot = aHot; vKeep = aKeep; vRand = aRand;
    vNdc = gl_Position.xy / gl_Position.w;
  }
`;

export const FRAG = /* glsl */ `
  precision highp float;
  uniform float uIgnite, uDark, uWipe, uTime, uSearch;
  uniform vec2 uPointer;
  varying float vHot, vKeep, vRand;
  varying vec2 vNdc;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    float glow = exp(-d * 4.5);
    vec3 navy = vec3(0.16, 0.22, 0.40);
    vec3 amber = vec3(0.96, 0.62, 0.16);
    vec3 amberHi = vec3(1.0, 0.80, 0.40);
    float lost = (1.0 - vKeep) * smoothstep(0.0, 1.0, uWipe);
    float hotOn = vHot * uIgnite * (1.0 - uDark) * (1.0 - lost);
    float sl = uSearch * smoothstep(0.42, 0.0, distance(vNdc, uPointer));
    vec3 col = mix(navy, mix(amber, amberHi, core), hotOn);
    // EMISSIVE: drive ignited hot amber > 1.0 so it (and only it) crosses the
    // bloom luminanceThreshold. Concentrated in the core -> corner centres glow
    // hardest. Navy is untouched (hotOn==0), so it stays matte under the bloom.
    col += amberHi * hotOn * (0.55 + 1.6 * core);
    col += amberHi * sl * 0.5 * (0.4 + core);
    float a = mix(0.30, 1.0, hotOn) * (core + glow * hotOn * 0.6);
    a += sl * 0.35 * core;
    a *= (0.85 + 0.15 * sin(uTime * 2.0 + vRand * 28.0));
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

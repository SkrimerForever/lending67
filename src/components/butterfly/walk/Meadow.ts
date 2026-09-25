import * as THREE from "three";
import { MEADOW_FAR_Z, MEADOW_NEAR_Z, type MeadowPassState } from "./walkFlightState";

export type Meadow = {
  points: THREE.Points;
  update(state: MeadowPassState, time: number): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

// Points per grass blade. On the bare road only the root point of each blade
// shows; as grass grows the others rise above it into a short stem.
const BLADE = 3;
// Half width of the road; it stays one continuous strip as it turns to grass.
const ROAD_HALF_WIDTH = 1.5;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform float uFront;
  uniform float uAll;
  uniform float uCenter;
  uniform float uHalfWidth;
  attribute vec3 aRoot;
  attribute float aHeight;
  attribute float aStem;
  attribute float aSeed;
  varying float vAlpha;
  varying float vGrow;
  varying float vStem;

  void main() {
    // Grass has grown behind the front, which sweeps along the road ahead of
    // the camera; the soft edge keeps it one continuous change.
    float wake = smoothstep(uFront - 2.0, uFront + 4.0, aRoot.z);
    float grow = max(wake, uAll);
    grow = grow * grow * (3.0 - 2.0 * grow);

    // The road keeps its shape: grass grows up out of it, it never scatters.
    vec3 point = aRoot;
    point.y += aStem * aHeight * grow;
    // Stems lean and sway, more towards the tip.
    float sway = sin(uTime * 1.3 + aSeed * 6.2831 + aRoot.z * 0.35) * 0.06 + (aSeed - 0.5) * 0.08;
    point.x += sway * aStem * aStem * grow;
    point.z += cos(uTime * 0.9 + aSeed * 11.0) * 0.03 * aStem * grow;

    vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float distanceToCamera = -viewPosition.z;
    // Near points stay small so the road reads as one dense surface.
    gl_PointSize = mix(1.1, 2.0, aSeed) * uPixelRatio * clamp(5.0 / max(distanceToCamera, 0.4), 0.45, 1.7);
    // On the road only the root point of each blade shows; the stem appears with growth.
    float stemVisible = aStem < 0.01 ? 1.0 : grow;
    // The road is brighter along its centre, bare or grassed, and its edges
    // melt into the dark, so it reads as one road rather than loose points.
    float fromCentre = abs(aRoot.x - uCenter);
    float path = (1.0 + 1.0 * (1.0 - smoothstep(0.15, 0.9, fromCentre)))
      * (1.0 - smoothstep(uHalfWidth - 0.6, uHalfWidth, fromCentre));
    vAlpha = uReveal * stemVisible * mix(0.55, 1.0, aSeed) * path
      * smoothstep(0.3, 1.2, distanceToCamera) * (1.0 - smoothstep(22.0, 46.0, distanceToCamera));
    vGrow = grow;
    vStem = aStem;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vGrow;
  varying float vStem;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float dotAlpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
    // Silver road → muted night green; tips catch a little more light.
    vec3 silver = vec3(0.84, 0.88, 0.9);
    vec3 root = vec3(0.34, 0.58, 0.36);
    vec3 tip = vec3(0.64, 0.86, 0.52);
    vec3 green = mix(root, tip, vStem);
    gl_FragColor = vec4(mix(silver, green, vGrow), dotAlpha * vAlpha);
  }
`;

function smoothstep(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

// Roots fill one continuous road that winds gently along the flight, densest
// along its centre line, with no gaps or bands.
function sampleBlades(blades: number, center: number) {
  const root = new Float32Array(blades * BLADE * 3);
  const height = new Float32Array(blades * BLADE);
  const stem = new Float32Array(blades * BLADE);
  const seed = new Float32Array(blades * BLADE);
  let written = 0;
  let attempts = 0;
  while (written < blades && attempts < blades * 6) {
    attempts += 1;
    const across = (Math.random() * 2 - 1) * ROAD_HALF_WIDTH;
    if (Math.random() > 1 - 0.55 * smoothstep(Math.abs(across), 0.3, ROAD_HALF_WIDTH)) continue;
    const z = MEADOW_NEAR_Z - Math.random() * (MEADOW_NEAR_Z - MEADOW_FAR_Z);
    const x = center + across + Math.sin(z * 0.08) * 0.45;
    const y = 0.03 * Math.sin(across * 1.3 + z * 0.21) - 0.01;
    // A low, even carpet: short stems, a few a little taller.
    const bladeHeight = 0.05 + Math.pow(Math.random(), 2.2) * 0.2;
    const bladeSeed = Math.random();
    for (let k = 0; k < BLADE; k += 1) {
      const i = written * BLADE + k;
      root.set([x, y, z], i * 3);
      height[i] = bladeHeight;
      stem[i] = k / (BLADE - 1);
      seed[i] = bladeSeed;
    }
    written += 1;
  }
  const used = written * BLADE;
  return {
    root: root.subarray(0, used * 3),
    height: height.subarray(0, used),
    stem: stem.subarray(0, used),
    seed: seed.subarray(0, used),
  };
}

export function createMeadow(count: number, center: number, pixelRatio: number): Meadow {
  const blades = sampleBlades(Math.floor(count / BLADE), center);
  const geometry = new THREE.BufferGeometry();
  // Positions are computed in the shader; this attribute only sizes the draw.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(blades.stem.length * 3), 3));
  geometry.setAttribute("aRoot", new THREE.BufferAttribute(blades.root, 3));
  geometry.setAttribute("aHeight", new THREE.BufferAttribute(blades.height, 1));
  geometry.setAttribute("aStem", new THREE.BufferAttribute(blades.stem, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(blades.seed, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uReveal: { value: 0 },
    uFront: { value: 0 },
    uAll: { value: 0 },
    uCenter: { value: center },
    uHalfWidth: { value: ROAD_HALF_WIDTH },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;

  return {
    points,
    update(state, time) {
      points.visible = state.active && state.roadReveal > 0;
      if (!points.visible) return;
      uniforms.uTime.value = time;
      uniforms.uReveal.value = state.roadReveal;
      uniforms.uFront.value = state.grassFront;
      uniforms.uAll.value = state.grassAll;
    },
    setPixelRatio(value) {
      uniforms.uPixelRatio.value = value;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

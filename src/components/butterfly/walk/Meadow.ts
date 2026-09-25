import * as THREE from "three";
import { MEADOW_FAR_Z, MEADOW_NEAR_Z, type MeadowPassState } from "./walkFlightState";

export type Meadow = {
  points: THREE.Points;
  update(state: MeadowPassState, time: number): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

// Half width of the road. It stays one tight strip as it turns to grass.
const ROAD_HALF_WIDTH = 1.0;
// Points per grass blade: close together, so each blade reads as a short stroke.
const BLADE = 5;
// A flower: a stem of STEM points and a head of PETALS points around its tip.
const STEM = 4;
const PETALS = 5;
const FLOWER_SHARE = 0.1;
// Share of all points spent on a low ground cover under the stems: tiny points
// on an even grid, so the road reads as one continuous grass floor.
const GROUND_SHARE = 0.55;

// Muted night colours: grass greens, and a few flower tones — silver-white,
// the butterfly's peach, pale yellow, lilac.
const GRASS: Array<[number, number, number]> = [
  [0.3, 0.52, 0.32],
  [0.36, 0.6, 0.36],
  [0.42, 0.66, 0.4],
  [0.33, 0.56, 0.44],
];
const FLOWERS: Array<[number, number, number]> = [
  [0.92, 0.93, 0.9],
  [0.91, 0.63, 0.52],
  [0.93, 0.86, 0.55],
  [0.72, 0.62, 0.85],
];

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uReveal;
  uniform float uFront;
  uniform float uAll;
  uniform float uCenter;
  uniform float uHalfWidth;
  uniform vec3 uButterfly;
  attribute vec3 aRoot;
  attribute float aHeight;
  attribute float aStem;
  attribute vec3 aPetal;
  attribute vec3 aColor;
  attribute float aSeed;
  varying float vAlpha;
  varying float vGrow;
  varying vec3 vColor;

  void main() {
    // Grass grows behind a front that sweeps along the road ahead of the
    // camera; the soft edge keeps it one continuous change.
    float wake = smoothstep(uFront - 2.0, uFront + 4.0, aRoot.z);
    float grow = max(wake, uAll);
    grow = grow * grow * (3.0 - 2.0 * grow);

    // The road keeps its shape: plants grow up out of it, it never scatters.
    vec3 point = aRoot;
    point.y += aStem * aHeight * grow;
    float isPetal = step(0.001, length(aPetal));
    point += aPetal * grow;
    // Stems lean and sway, more towards the tip; flower heads ride along.
    float bend = isPetal > 0.5 ? 1.0 : aStem * aStem;
    float sway = sin(uTime * 1.3 + aSeed * 6.2831 + aRoot.z * 0.35) * 0.035 + (aSeed - 0.5) * 0.05;
    point.x += sway * bend * grow;
    point.z += cos(uTime * 0.9 + aSeed * 11.0) * 0.02 * bend * grow;

    // The butterfly's wind: stems under it bend away in a ripple, and pollen
    // lifts off the flowers, glinting, before it settles again.
    vec2 away = aRoot.xz - uButterfly.xz;
    float reach = length(away);
    float low = 1.0 - smoothstep(0.6, 2.2, uButterfly.y);
    float wind = (1.0 - smoothstep(0.2, 1.9, reach)) * low * grow;
    float ripple = 0.75 + 0.25 * sin(reach * 7.0 - uTime * 9.0);
    point.xz += normalize(away + 1e-4) * wind * ripple * 0.13 * bend;
    point.y -= wind * 0.03 * bend;
    float pollen = wind * isPetal;
    point.y += pollen * (0.12 + aSeed * 0.4);
    point.x += sin(uTime * 3.0 + aSeed * 20.0) * pollen * 0.12;

    vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float distanceToCamera = -viewPosition.z;
    // Small points, many of them: the road reads as one dense surface. The
    // ground cover (no height) is finer still.
    float isGround = 1.0 - step(0.001, aHeight);
    float size = mix(0.9, 1.5, aSeed) * mix(1.0, 1.5, isPetal) * mix(1.0, 0.85, isGround);
    gl_PointSize = size * uPixelRatio * clamp(5.0 / max(distanceToCamera, 0.4), 0.5, 1.6);

    // On the bare road only the root of each plant shows; stems and flowers
    // appear as it grows.
    float visible = aStem < 0.01 && isPetal < 0.5 ? 1.0 : grow;
    // Brighter along the centre, with firm edges that fall off quickly.
    float fromCentre = abs(aRoot.x - uCenter - sin(aRoot.z * 0.08) * 0.45);
    float edge = 1.0 - smoothstep(uHalfWidth - 0.25, uHalfWidth, fromCentre);
    float centre = 1.0 + 0.5 * (1.0 - smoothstep(0.1, 0.7, fromCentre));
    vAlpha = uReveal * visible * mix(0.6, 1.0, aSeed) * mix(1.0, 1.15, isGround) * edge * centre * (1.0 + pollen * 1.6)
      * smoothstep(0.3, 1.0, distanceToCamera) * (1.0 - smoothstep(20.0, 40.0, distanceToCamera));
    vGrow = grow;
    // Tips of blades catch a little more light than their roots.
    vColor = aColor * mix(0.8, 1.2, isPetal > 0.5 ? 1.0 : aStem);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vGrow;
  varying vec3 vColor;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float dotAlpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
    // Silver road → grass and flowers in their own muted colours.
    vec3 silver = vec3(0.84, 0.88, 0.9);
    gl_FragColor = vec4(mix(silver, vColor, vGrow), dotAlpha * vAlpha);
  }
`;

function smoothstep(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

type PlantBuffers = {
  root: number[];
  height: number[];
  stem: number[];
  petal: number[];
  color: number[];
  seed: number[];
};

// Visits an even, jittered grid over the road — no clumps and no gaps, unlike
// plain random sampling — with roughly `count` cells.
function jitteredGrid(count: number, visit: (across: number, z: number) => void) {
  const length = MEADOW_NEAR_Z - MEADOW_FAR_Z;
  const step = Math.sqrt((2 * ROAD_HALF_WIDTH * length) / Math.max(1, count));
  for (let z = MEADOW_NEAR_Z; z > MEADOW_FAR_Z; z -= step) {
    for (let across = -ROAD_HALF_WIDTH; across < ROAD_HALF_WIDTH; across += step) {
      visit(across + Math.random() * step, z - Math.random() * step);
    }
  }
}

// One continuous road that winds gently along the flight: an even ground
// cover, dense grass blades on it, and flowers a little above them.
function samplePlants(count: number, center: number): PlantBuffers {
  const buffers: PlantBuffers = { root: [], height: [], stem: [], petal: [], color: [], seed: [] };
  const push = (root: number[], height: number, stem: number, petal: number[], color: number[], seed: number) => {
    buffers.root.push(...root);
    buffers.height.push(height);
    buffers.stem.push(stem);
    buffers.petal.push(...petal);
    buffers.color.push(...color);
    buffers.seed.push(seed);
  };
  const rootAt = (across: number, z: number) =>
    [center + across + Math.sin(z * 0.08) * 0.45, 0.02 * Math.sin(across * 1.3 + z * 0.21) - 0.01, z];

  jitteredGrid(count * GROUND_SHARE, (across, z) => {
    push(rootAt(across, z), 0, 0, [0, 0, 0], GRASS[Math.floor(Math.random() * GRASS.length)], Math.random());
  });

  // Blades take 5 points and flowers 9, so about 5.4 points per plant.
  jitteredGrid((count * (1 - GROUND_SHARE)) / 5.4, (across, z) => {
    const root = rootAt(across, z);
    const seed = Math.random();
    // Flowers keep to the verges a little more than the middle of the road.
    if (Math.random() < FLOWER_SHARE * (0.5 + smoothstep(Math.abs(across), 0.2, ROAD_HALF_WIDTH))) {
      const height = 0.16 + Math.random() * 0.14;
      const tone = FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
      for (let k = 0; k < STEM; k += 1) push(root, height, k / (STEM - 1), [0, 0, 0], GRASS[0], seed);
      const radius = 0.018 + Math.random() * 0.012;
      for (let p = 0; p < PETALS; p += 1) {
        const angle = (p / PETALS) * Math.PI * 2 + seed * 6;
        push(root, height, 1, [Math.cos(angle) * radius, 0.01, Math.sin(angle) * radius], tone, seed);
      }
    } else {
      const height = 0.05 + Math.pow(Math.random(), 1.8) * 0.13;
      const tone = GRASS[Math.floor(Math.random() * GRASS.length)];
      for (let k = 0; k < BLADE; k += 1) push(root, height, k / (BLADE - 1), [0, 0, 0], tone, seed);
    }
  });
  return buffers;
}

export function createMeadow(count: number, center: number, pixelRatio: number): Meadow {
  const plants = samplePlants(count, center);
  const total = plants.stem.length;
  const geometry = new THREE.BufferGeometry();
  // Positions are computed in the shader; this attribute only sizes the draw.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geometry.setAttribute("aRoot", new THREE.Float32BufferAttribute(plants.root, 3));
  geometry.setAttribute("aHeight", new THREE.Float32BufferAttribute(plants.height, 1));
  geometry.setAttribute("aStem", new THREE.Float32BufferAttribute(plants.stem, 1));
  geometry.setAttribute("aPetal", new THREE.Float32BufferAttribute(plants.petal, 3));
  geometry.setAttribute("aColor", new THREE.Float32BufferAttribute(plants.color, 3));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(plants.seed, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uReveal: { value: 0 },
    uFront: { value: 0 },
    uAll: { value: 0 },
    uCenter: { value: center },
    uHalfWidth: { value: ROAD_HALF_WIDTH },
    uButterfly: { value: new THREE.Vector3(0, -100, 0) },
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
      uniforms.uButterfly.value.set(...state.butterflyPosition);
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

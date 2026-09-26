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
// Flowers begin with five anchor dots; finer petal samples emerge during flight.
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
  uniform float uRealism;
  uniform float uSolid;
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
  attribute float aBlade;
  attribute float aDetail;
  varying float vFlower;
  varying float vAcross;
  varying float vStem;
  varying float vLight;
  varying float vAlpha;
  varying float vGrow;
  varying vec3 vColor;

  void main() {
    float maturity = smoothstep(0.0, 1.0, uRealism);
    float settled = smoothstep(uFront + 1.0, uFront + 8.0, aRoot.z);
    float realism = maturity * settled;
    vAcross = position.x;
    vStem = aStem;
    vLight = 0.72 + 0.28 * sin(aSeed * 6.2831 + 0.8);
    // Grass grows behind a front that sweeps along the road ahead of the
    // camera; the soft edge keeps it one continuous change.
    float wake = smoothstep(uFront - 2.0, uFront + 4.0, aRoot.z);
    float grow = max(wake, uAll);
    grow = grow * grow * (3.0 - 2.0 * grow);

    // The road keeps its shape: plants grow up out of it, it never scatters.
    vec3 point = aRoot;
    point.y += aStem * aHeight * grow;
    float isPetal = step(0.001, length(aPetal));
    vFlower = isPetal * realism;
    // Each dotted head opens gently without changing its attachment to the stem.
    point += aPetal * grow * mix(1.0, 1.28, realism);
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
    float pollen = wind * isPetal * mix(1.0, 0.12, realism);
    point.y += pollen * (0.12 + aSeed * 0.4);
    point.x += sin(uTime * 3.0 + aSeed * 20.0) * pollen * 0.12;

    // Materialisation keeps every root and its wind phase in place.
    float bladeBend = aStem * aStem * realism * aBlade;
    float direction = aSeed * 6.2831;
    point.xz += vec2(cos(direction), sin(direction)) * aHeight * 0.52 * bladeBend;
    point.y -= aHeight * 0.16 * bladeBend;
    if (uSolid > 0.5) {
      float width = (0.005 + aSeed * 0.006) * pow(max(0.0, 1.0 - aStem), 0.7);
      point.xz += vec2(cos(direction), sin(direction)) * position.x * width;
      // Raised central fold gives the blade two differently lit faces.
      point.y += (1.0 - abs(position.x)) * width * 0.28;
    }
    vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float distanceToCamera = -viewPosition.z;
    // Small points, many of them: the road reads as one dense surface. The
    // ground cover (no height) is finer still.
    float isGround = 1.0 - step(0.001, aHeight);
    float size = mix(0.9, 1.5, aSeed) * mix(1.0, 1.5, isPetal) * mix(1.0, 0.85, isGround);
    size *= mix(1.0, 0.78, isPetal * realism);
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
    vAlpha *= uSolid > 0.5 ? realism : (1.0 - realism * aBlade);
    vAlpha *= 1.0 - isGround * realism * 0.72;
    float detailReveal = smoothstep(aDetail * 0.2, 0.82 + aDetail * 0.15, realism);
    vAlpha *= aDetail > 0.0 ? detailReveal * 0.7 : 1.0;
    // Dense petals retain their pigment instead of burning out into white dots.
    vAlpha *= mix(1.0, 0.7, isPetal * realism);
    vGrow = grow;
    // Tips of blades catch a little more light than their roots.
    vColor = aColor * mix(0.8, 1.2, isPetal > 0.5 ? 1.0 : aStem);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vFlower;
  varying float vAlpha;
  varying float vGrow;
  varying vec3 vColor;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float dotAlpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
    // Silver road → grass and flowers in their own muted colours.
    vec3 silver = vec3(0.84, 0.88, 0.9);
    float roundness = sqrt(max(0.0, 1.0 - distanceToCenter * distanceToCenter * 4.0));
    float lighting = 0.68 + roundness * 0.32 + (0.5 - gl_PointCoord.y) * 0.12;
    vec3 color = mix(silver, vColor, vGrow) * mix(1.0, lighting, vFlower);
    gl_FragColor = vec4(color, dotAlpha * vAlpha);
  }
`;

function smoothstep(value: number, start: number, end: number) {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

type PlantBuffers = {
  detail: number[];
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
  const buffers: PlantBuffers = { root: [], height: [], stem: [], petal: [], color: [], seed: [], detail: [] };
  const push = (root: number[], height: number, stem: number, petal: number[], color: number[], seed: number, detail = 0) => {
    buffers.detail.push(detail);
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

  // Keep the original plant density; extra flower samples share the same draw.
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
        for (let sample = 0; sample < 8; sample += 1) {
          const along = 0.35 + (sample % 4) * 0.3;
          const across = (sample < 4 ? -1 : 1) * Math.sin((along / 1.3) * Math.PI) * radius * 0.3;
          const radial = radius * along;
          const cup = 0.006 + Math.pow(along - 0.55, 2) * 0.017;
          const shade = 0.72 + along * 0.17;
          push(root, height, 1, [
            Math.cos(angle) * radial - Math.sin(angle) * across,
            cup + Math.sin(angle + seed * 9) * radial * 0.22,
            Math.sin(angle) * radial + Math.cos(angle) * across,
          ], tone.map(channel => channel * shade), seed, 0.35 + sample * 0.07);
        }
      }
      for (let sample = 0; sample < 7; sample += 1) {
        const angle = sample * 2.39996;
        const distance = Math.sqrt(sample / 6) * radius * 0.32;
        push(root, height, 1, [Math.cos(angle) * distance, 0.013, Math.sin(angle) * distance],
          [0.78, 0.59 + sample * 0.018, 0.24], seed, 0.25);
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
  const blades: number[] = [];
  const bladeMask = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    if (plants.height[i] > 0 && plants.stem[i] === 0 && plants.stem[i + 1] === 1 / (BLADE - 1)) {
      blades.push(i);
      bladeMask.fill(1, i, i + BLADE);
    }
  }
  const geometry = new THREE.BufferGeometry();
  // Positions are computed in the shader; this attribute only sizes the draw.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(total * 3), 3));
  geometry.setAttribute("aRoot", new THREE.Float32BufferAttribute(plants.root, 3));
  geometry.setAttribute("aHeight", new THREE.Float32BufferAttribute(plants.height, 1));
  geometry.setAttribute("aStem", new THREE.Float32BufferAttribute(plants.stem, 1));
  geometry.setAttribute("aPetal", new THREE.Float32BufferAttribute(plants.petal, 3));
  geometry.setAttribute("aColor", new THREE.Float32BufferAttribute(plants.color, 3));
  geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(plants.seed, 1));
  geometry.setAttribute("aBlade", new THREE.BufferAttribute(bladeMask, 1));
  geometry.setAttribute("aDetail", new THREE.Float32BufferAttribute(plants.detail, 1));

  // Static index ranges let us omit fully invisible samples without rebuilding
  // buffers or changing the density of anything still on screen.
  const bladePoints: number[] = [];
  const basePoints: number[] = [];
  const detailPoints: number[] = [];
  let firstDetailThreshold = 1;
  for (let i = 0; i < total; i += 1) {
    if (bladeMask[i]) bladePoints.push(i);
    else if (plants.detail[i] > 0) {
      detailPoints.push(i);
      firstDetailThreshold = Math.min(firstDetailThreshold, plants.detail[i] * 0.2);
    } else basePoints.push(i);
  }
  bladePoints.sort((a, b) => plants.root[b * 3 + 2] - plants.root[a * 3 + 2]);
  const bladeDepths = Float32Array.from(bladePoints, index => plants.root[index * 3 + 2]);
  const baseEnd = bladePoints.length + basePoints.length;
  geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from([...bladePoints, ...basePoints, ...detailPoints]), 1));

  const uniforms = {
    uRealism: { value: 0 },
    uSolid: { value: 0 },
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

  // One instanced draw: seven curved sections and a folded cross-section.
  const bladeGeometry = new THREE.InstancedBufferGeometry();
  const vertices: number[] = [];
  const stems: number[] = [];
  const indices: number[] = [];
  const sections = 7;
  for (let row = 0; row <= sections; row += 1) {
    for (let side = -1; side <= 1; side += 1) {
      vertices.push(side, row / sections, 0);
      stems.push(row / sections);
    }
    if (row < sections) {
      for (let side = 0; side < 2; side += 1) {
        const a = row * 3 + side;
        indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      }
    }
  }
  bladeGeometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  bladeGeometry.setAttribute("aStem", new THREE.Float32BufferAttribute(stems, 1));
  bladeGeometry.setIndex(indices);
  for (const [name, source, size] of [
    ["aRoot", plants.root, 3], ["aHeight", plants.height, 1],
    ["aColor", plants.color, 3], ["aSeed", plants.seed, 1],
  ] as const) {
    const values = new Float32Array(blades.length * size);
    blades.forEach((index, instance) => {
      for (let axis = 0; axis < size; axis += 1) values[instance * size + axis] = source[index * size + axis];
    });
    bladeGeometry.setAttribute(name, new THREE.InstancedBufferAttribute(values, size));
  }
  bladeGeometry.setAttribute("aPetal", new THREE.InstancedBufferAttribute(new Float32Array(blades.length * 3), 3));
  bladeGeometry.setAttribute("aBlade", new THREE.InstancedBufferAttribute(new Float32Array(blades.length).fill(1), 1));
  bladeGeometry.setAttribute("aDetail", new THREE.InstancedBufferAttribute(new Float32Array(blades.length), 1));
  bladeGeometry.instanceCount = blades.length;
  const bladeMaterial = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uSolid: { value: 1 } },
    vertexShader,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vStem;
      varying float vAcross;
      varying float vLight;
      varying vec3 vColor;
      void main() {
        float edge = 1.0 - smoothstep(0.72, 1.0, abs(vAcross));
        float alpha = min(1.0, vAlpha) * edge;
        if (alpha < 0.005) discard;
        float fold = mix(0.68, 1.12, smoothstep(-0.1, 0.15, vAcross));
        float vein = 1.0 - smoothstep(0.0, 0.12, abs(vAcross));
        vec3 color = vColor * mix(0.42, 0.98, vStem) * fold * vLight;
        color += vec3(0.09, 0.13, 0.045) * vein * vStem;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const surfaces = new THREE.Mesh(bladeGeometry, bladeMaterial);
  surfaces.frustumCulled = false;
  surfaces.renderOrder = 1;
  points.add(surfaces);

  return {
    points,
    update(state, time) {
      points.visible = state.active && state.roadReveal > 0;
      if (!points.visible) return;
      uniforms.uTime.value = time;
      // Long, reversible progression through the flight, independent of FPS.
      uniforms.uRealism.value = smoothstep(-state.cameraPosition[2], 31, 50);
      surfaces.visible = uniforms.uRealism.value > 0.001;
      const maturity = smoothstep(uniforms.uRealism.value, 0, 1);
      const end = maturity <= firstDetailThreshold ? baseEnd : total;
      let start = 0;
      if (maturity === 1) {
        // Only blades whose point alpha is exactly zero are removed. A binary
        // search over roots also restores them immediately on reverse scroll.
        let high = bladeDepths.length;
        const settledDepth = state.grassFront + 8;
        while (start < high) {
          const middle = (start + high) >>> 1;
          if (bladeDepths[middle] >= settledDepth) start = middle + 1;
          else high = middle;
        }
      }
      geometry.setDrawRange(start, end - start);
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
      bladeGeometry.dispose();
      bladeMaterial.dispose();
    },
  };
}

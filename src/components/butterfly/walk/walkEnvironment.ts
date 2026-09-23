import * as THREE from "three";
import { LIGHT_Y, LIGHT_Z, type WalkFlightState } from "./walkFlightState";

export type WalkEnvironment = {
  group: THREE.Group;
  update(state: WalkFlightState, time: number): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

const DUST_TRAIL = 4;
const smoothstep = (value: number, start: number, end: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

function sampleGround(count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  let written = 0;
  let attempts = 0;
  while (written < count && attempts < count * 12) {
    attempts += 1;
    const x = (Math.random() * 2 - 1) * 2.8;
    const z = 14 - Math.random() * 62;
    const band = Math.pow(0.5 + 0.5 * Math.sin((x * 1.25 + Math.sin(z * 0.17) * 2.4 + z * 0.05) * 2.1), 3);
    const edge = 1 - smoothstep(Math.abs(x), 1.6, 2.8);
    if (Math.random() > (0.18 + 0.82 * band) * edge) continue;
    // A flat, narrow path; the ground rises gently into low banks at the sides.
    const hill = 0.12 * Math.sin(x * 0.9 + z * 0.13) + 0.07 * Math.sin(z * 0.31 - x * 1.2);
    const sides = smoothstep(Math.abs(x), 0.5, 2.2);
    positions[written * 3] = x;
    positions[written * 3 + 1] = hill * sides + 0.15 * smoothstep(Math.abs(x), 1.0, 2.8) - 0.01
      + (Math.random() - 0.5) * 0.03;
    positions[written * 3 + 2] = z;
    seeds[written] = Math.random();
    written += 1;
  }
  return { positions: positions.subarray(0, written * 3), seeds: seeds.subarray(0, written) };
}

function sampleDust(count: number) {
  const positions = new Float32Array(count * DUST_TRAIL * 3);
  const seeds = new Float32Array(count * DUST_TRAIL);
  const trail = new Float32Array(count * DUST_TRAIL);
  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() * 2 - 1) * 8;
    const y = Math.random() * 6;
    const z = 16 - Math.random() * 60;
    const seed = Math.random();
    for (let k = 0; k < DUST_TRAIL; k += 1) {
      const index = i * DUST_TRAIL + k;
      positions.set([x, y, z], index * 3);
      seeds[index] = seed;
      trail[index] = k;
    }
  }
  return { positions, seeds, trail };
}

const pointFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(0.84, 0.88, 0.9), (1.0 - smoothstep(0.2, 0.5, distanceToCenter)) * vAlpha);
  }
`;

export function createWalkEnvironment(
  counts: { ground: number; dust: number },
  pixelRatio: number,
): WalkEnvironment {
  const group = new THREE.Group();

  const ground = sampleGround(counts.ground);
  const groundGeometry = new THREE.BufferGeometry();
  groundGeometry.setAttribute("position", new THREE.BufferAttribute(ground.positions, 3));
  groundGeometry.setAttribute("aSeed", new THREE.BufferAttribute(ground.seeds, 1));
  const groundUniforms = { uReveal: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } };
  const groundMaterial = new THREE.ShaderMaterial({
    uniforms: groundUniforms,
    vertexShader: /* glsl */ `
      uniform float uReveal;
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        float distanceToCamera = -viewPosition.z;
        gl_PointSize = mix(0.8, 1.7, aSeed) * uPixelRatio * clamp(6.0 / max(distanceToCamera, 0.5), 0.35, 2.4);
        float shimmer = 0.82 + 0.18 * sin(uTime * 0.9 + aSeed * 31.0);
        // The walking path itself reads slightly brighter than the verges.
        float path = 1.0 + 0.6 * (1.0 - smoothstep(0.15, 0.45, abs(position.x)));
        vAlpha = uReveal * mix(0.3, 0.78, aSeed) * shimmer * path
          * (1.0 - smoothstep(18.0, 48.0, distanceToCamera));
      }
    `,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const groundPoints = new THREE.Points(groundGeometry, groundMaterial);
  groundPoints.frustumCulled = false;
  group.add(groundPoints);

  const dust = sampleDust(counts.dust);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust.positions, 3));
  dustGeometry.setAttribute("aSeed", new THREE.BufferAttribute(dust.seeds, 1));
  dustGeometry.setAttribute("aTrail", new THREE.BufferAttribute(dust.trail, 1));
  const dustUniforms = {
    uReveal: { value: 0 },
    uStreak: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
  };
  const dustMaterial = new THREE.ShaderMaterial({
    uniforms: dustUniforms,
    vertexShader: /* glsl */ `
      uniform float uReveal;
      uniform float uStreak;
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSeed;
      attribute float aTrail;
      varying float vAlpha;
      void main() {
        vec3 point = position;
        point.y += sin(uTime * 0.35 + aSeed * 20.0) * 0.06;
        // Trail copies stretch backward along the motion axis into short streaks.
        point.z += aTrail * uStreak * 0.45;
        vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        float distanceToCamera = -viewPosition.z;
        gl_PointSize = mix(0.8, 1.6, aSeed) * uPixelRatio * clamp(5.0 / max(distanceToCamera, 0.4), 0.35, 2.6);
        float trailAlpha = aTrail < 0.5 ? 1.0 : uStreak * (1.0 - aTrail * 0.24);
        vAlpha = uReveal * mix(0.18, 0.55, aSeed) * trailAlpha
          * smoothstep(0.3, 1.2, distanceToCamera) * (1.0 - smoothstep(20.0, 50.0, distanceToCamera));
      }
    `,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
  dustPoints.frustumCulled = false;
  group.add(dustPoints);

  const lightUniforms = { uReveal: { value: 0 } };
  const panelGeometry = new THREE.PlaneGeometry(3.2, 1.8);
  const panelMaterial = new THREE.ShaderMaterial({
    uniforms: lightUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      varying vec2 vUv;
      void main() {
        vec2 q = abs(vUv - 0.5) * vec2(3.2, 1.8);
        vec2 d = q - vec2(1.52, 0.82);
        float edge = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        float body = 1.0 - smoothstep(-0.06, 0.08, edge);
        gl_FragColor = vec4(vec3(0.804, 0.855, 0.886), body * uReveal);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.set(0, LIGHT_Y, LIGHT_Z);
  group.add(panel);

  const haloGeometry = new THREE.PlaneGeometry(12, 7);
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms: lightUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      varying vec2 vUv;
      void main() {
        vec2 q = (vUv - 0.5) * vec2(2.4, 1.4);
        vec2 edge = abs(vUv - 0.5);
        float fade = (1.0 - smoothstep(0.32, 0.5, edge.x)) * (1.0 - smoothstep(0.28, 0.5, edge.y));
        float glow = exp(-dot(q, q) * 3.2) * 0.35 * fade;
        gl_FragColor = vec4(vec3(0.804, 0.855, 0.886), glow * uReveal);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.position.set(0, LIGHT_Y, LIGHT_Z - 0.2);
  group.add(halo);

  return {
    group,
    update(state, time) {
      groundUniforms.uReveal.value = state.groundReveal;
      groundUniforms.uTime.value = time;
      dustUniforms.uReveal.value = state.dustReveal;
      dustUniforms.uStreak.value = state.dustStreak;
      dustUniforms.uTime.value = time;
      lightUniforms.uReveal.value = state.lightReveal;
    },
    setPixelRatio(value) {
      groundUniforms.uPixelRatio.value = value;
      dustUniforms.uPixelRatio.value = value;
    },
    dispose() {
      groundGeometry.dispose(); groundMaterial.dispose();
      dustGeometry.dispose(); dustMaterial.dispose();
      panelGeometry.dispose(); panelMaterial.dispose();
      haloGeometry.dispose(); haloMaterial.dispose();
    },
  };
}

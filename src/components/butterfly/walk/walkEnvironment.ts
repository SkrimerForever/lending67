import * as THREE from "three";
import { CASE_THREE_SCREEN, LIGHT_Y, LIGHT_Z, PORTAL_HEIGHT, type WalkFlightState } from "./walkFlightState";

export type WalkEnvironment = {
  group: THREE.Group;
  // screens: glow of the case 02 and case 03 screens in the dark (0..1 each).
  // eye: where the camera is, so the sky dome can travel with it.
  update(state: WalkFlightState, time: number, screens: { caseTwo: number; caseThree: number }, eye: THREE.Vector3): void;
  setPixelRatio(value: number): void;
  setAspect(aspect: number): void;
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
    const z = 12 - Math.random() * 28;
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
    const z = 16 - Math.random() * 34;
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

const STAR_COUNT = 1_600;
const STAR_RADIUS = 60;

function sampleStars(count: number) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const azimuth = Math.random() * Math.PI * 2;
    // Keep stars above the horizon, denser toward it like a real sky.
    const elevation = THREE.MathUtils.degToRad(3 + Math.pow(Math.random(), 1.6) * 72);
    positions[i * 3] = Math.cos(elevation) * Math.sin(azimuth) * STAR_RADIUS;
    positions[i * 3 + 1] = Math.sin(elevation) * STAR_RADIUS;
    positions[i * 3 + 2] = -Math.cos(elevation) * Math.cos(azimuth) * STAR_RADIUS;
    seeds[i] = Math.random();
  }
  return { positions, seeds };
}

const pointFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(vec3(0.84, 0.88, 0.9), (1.0 - smoothstep(0.2, 0.5, distanceToCenter)) * vAlpha);
  }
`;

type ScreenLight = {
  meshes: THREE.Mesh[];
  uniforms: { uReveal: { value: number } };
  setAspect(aspect: number): void;
  dispose(): void;
};

// A case screen in the dark: a lit panel that takes the viewport's aspect, so
// the DOM case can be projected onto it and land full-screen, plus a soft halo
// that fades to nothing before its quad edges.
function createScreenLight(center: THREE.Vector3, tint: THREE.Color): ScreenLight {
  const uniforms = { uReveal: { value: 0 }, uTint: { value: tint } };
  const panelUniforms = { ...uniforms, uSize: { value: new THREE.Vector2(3.2, PORTAL_HEIGHT) } };
  const quad = /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `;
  const panelGeometry = new THREE.PlaneGeometry(1, 1);
  const panelMaterial = new THREE.ShaderMaterial({
    uniforms: panelUniforms,
    vertexShader: quad,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform vec3 uTint;
      uniform vec2 uSize;
      varying vec2 vUv;
      void main() {
        vec2 q = abs(vUv - 0.5) * uSize;
        vec2 d = q - (uSize * 0.5 - 0.08);
        float edge = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        float body = 1.0 - smoothstep(-0.06, 0.08, edge);
        gl_FragColor = vec4(uTint, body * uReveal);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const panel = new THREE.Mesh(panelGeometry, panelMaterial);
  panel.position.copy(center);
  panel.scale.set(3.2, PORTAL_HEIGHT, 1);

  const haloGeometry = new THREE.PlaneGeometry(12, 7);
  const haloMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: quad,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        vec2 q = (vUv - 0.5) * vec2(2.4, 1.4);
        vec2 edge = abs(vUv - 0.5);
        float fade = (1.0 - smoothstep(0.32, 0.5, edge.x)) * (1.0 - smoothstep(0.28, 0.5, edge.y));
        float glow = exp(-dot(q, q) * 3.2) * 0.35 * fade;
        gl_FragColor = vec4(uTint, glow * uReveal);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Mesh(haloGeometry, haloMaterial);
  halo.position.copy(center).add(new THREE.Vector3(0, 0, -0.2));

  return {
    meshes: [panel, halo],
    uniforms,
    setAspect(aspect) {
      const width = PORTAL_HEIGHT * aspect;
      panel.scale.x = width;
      panelUniforms.uSize.value.x = width;
      halo.scale.x = width / 3.2;
    },
    dispose() {
      panelGeometry.dispose(); panelMaterial.dispose();
      haloGeometry.dispose(); haloMaterial.dispose();
    },
  };
}

export function createWalkEnvironment(
  counts: { ground: number; dust: number },
  pixelRatio: number,
): WalkEnvironment {
  const group = new THREE.Group();

  const ground = sampleGround(counts.ground);
  const groundGeometry = new THREE.BufferGeometry();
  groundGeometry.setAttribute("position", new THREE.BufferAttribute(ground.positions, 3));
  groundGeometry.setAttribute("aSeed", new THREE.BufferAttribute(ground.seeds, 1));
  const groundUniforms = {
    uReveal: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
  };
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
        gl_PointSize = mix(1.0, 2.0, aSeed) * uPixelRatio * clamp(6.0 / max(distanceToCamera, 0.5), 0.35, 2.4);
        float shimmer = 0.82 + 0.18 * sin(uTime * 0.9 + aSeed * 31.0);
        // The walking path itself reads slightly brighter than the verges.
        float path = 1.0 + 1.4 * (1.0 - smoothstep(0.2, 0.7, abs(position.x)));
        vAlpha = uReveal * mix(0.45, 0.95, aSeed) * shimmer * path
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
        vAlpha = uReveal * mix(0.3, 0.75, aSeed) * trailAlpha
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

  const stars = sampleStars(STAR_COUNT);
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(stars.positions, 3));
  starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(stars.seeds, 1));
  const starUniforms = { uReveal: { value: 0 }, uTime: { value: 0 }, uPixelRatio: { value: pixelRatio } };
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: starUniforms,
    vertexShader: /* glsl */ `
      uniform float uReveal;
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSeed;
      varying float vAlpha;
      varying float vCore;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // A few large, bright stars among many small ones.
        float magnitude = pow(aSeed, 6.0);
        gl_PointSize = mix(1.4, 4.2, magnitude) * uPixelRatio;
        float twinkle = 0.8 + 0.2 * sin(uTime * (0.6 + aSeed * 1.8) + aSeed * 60.0);
        vAlpha = uReveal * mix(0.55, 1.0, magnitude) * twinkle;
        vCore = magnitude;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying float vCore;
      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        float dotAlpha = 1.0 - smoothstep(0.12, 0.5, distanceToCenter);
        float core = (1.0 - smoothstep(0.0, 0.18, distanceToCenter)) * vCore;
        gl_FragColor = vec4(vec3(0.9, 0.93, 0.96) + core * 0.1, (dotAlpha + core) * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const starPoints = new THREE.Points(starGeometry, starMaterial);
  starPoints.frustumCulled = false;
  group.add(starPoints);

  // Case 02's screen is cool silver; case 03's carries the butterfly's first
  // warmth, very faintly.
  const caseTwoLight = createScreenLight(new THREE.Vector3(0, LIGHT_Y, LIGHT_Z), new THREE.Color(0.804, 0.855, 0.886));
  const caseThreeLight = createScreenLight(new THREE.Vector3(...CASE_THREE_SCREEN), new THREE.Color(0.9, 0.86, 0.84));
  group.add(...caseTwoLight.meshes, ...caseThreeLight.meshes);

  return {
    group,
    update(state, time, screens, eye) {
      groundUniforms.uReveal.value = state.groundReveal;
      groundUniforms.uTime.value = time;
      dustUniforms.uReveal.value = state.dustReveal;
      dustUniforms.uStreak.value = state.dustStreak;
      dustUniforms.uTime.value = time;
      // The sky travels with the camera (eye is local to this group), so
      // stars read as infinitely far away.
      starPoints.position.copy(eye);
      starUniforms.uReveal.value = state.dustReveal;
      starUniforms.uTime.value = time;
      caseTwoLight.uniforms.uReveal.value = screens.caseTwo;
      caseThreeLight.uniforms.uReveal.value = screens.caseThree;
    },
    setPixelRatio(value) {
      groundUniforms.uPixelRatio.value = value;
      dustUniforms.uPixelRatio.value = value;
      starUniforms.uPixelRatio.value = value;
    },
    setAspect(aspect) {
      caseTwoLight.setAspect(aspect);
      caseThreeLight.setAspect(aspect);
    },
    dispose() {
      groundGeometry.dispose(); groundMaterial.dispose();
      dustGeometry.dispose(); dustMaterial.dispose();
      starGeometry.dispose(); starMaterial.dispose();
      caseTwoLight.dispose();
      caseThreeLight.dispose();
    },
  };
}

import * as THREE from "three";
import { MEADOW_FAR_Z, type Vec3 } from "./walkFlightState";

// The night the butterfly flies through: a Milky Way and a crescent moon on the
// sky, forest and hills along the sides and the horizon, fireflies that flare
// up around the butterfly and low mist over the ground. All of it is points, and all of it only appears once the butterfly is
// out (life), so the story before case 03 stays black and white.

export type NightLifeCounts = {
  milkyWay: number;
  forest: number;
  fireflies: number;
  mist: number;
};

export type NightLifeUpdate = {
  life: number;
  time: number;
  // The camera, local to the walk scene: the sky travels with it.
  eye: THREE.Vector3;
  // Where the butterfly is (walk space), and whether it is flying.
  butterfly: Vec3;
  butterflyOn: number;
};

export type NightLife = {
  group: THREE.Group;
  update(state: NightLifeUpdate): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

// The moon stands ahead and a little to the right, as in the final shot.
export const MOON_DIRECTION = new THREE.Vector3(0.36, 0.13, -1).normalize();
const SKY_RADIUS = 58;

type Layer = {
  points: THREE.Points;
  uniforms: Record<string, THREE.IUniform>;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
};

// Every layer draws soft round points with a colour and brightness per point.
const softFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float dotAlpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
    gl_FragColor = vec4(vColor, dotAlpha * vAlpha);
  }
`;

function makeLayer(
  attributes: Record<string, { data: Float32Array | number[]; size: number }>,
  vertexShader: string,
  extraUniforms: Record<string, THREE.IUniform>,
  pixelRatio: number,
  fragmentShader = softFragment,
): Layer {
  const geometry = new THREE.BufferGeometry();
  for (const [name, { data, size }] of Object.entries(attributes)) {
    geometry.setAttribute(name, new THREE.Float32BufferAttribute(data, size));
  }
  const uniforms = {
    uTime: { value: 0 },
    uLife: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    ...extraUniforms,
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
  return { points, uniforms, geometry, material };
}

const gaussian = () => {
  const u = Math.max(1e-6, Math.random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

// A band of dense, faint stars across the sky, brightest along its spine.
function createMilkyWay(count: number, pixelRatio: number): Layer {
  const position: number[] = [];
  const brightness: number[] = [];
  const seed: number[] = [];
  // The band arcs across the sky ahead, rising from low on the left.
  const normal = new THREE.Vector3().crossVectors(
    new THREE.Vector3(0.2, 0.3, -0.93),
    new THREE.Vector3(1, 0.35, 0.1),
  ).normalize();
  const axisA = new THREE.Vector3(1, 0, 0).cross(normal).normalize();
  const axisB = normal.clone().cross(axisA).normalize();
  const point = new THREE.Vector3();
  while (position.length / 3 < count) {
    const angle = Math.random() * Math.PI * 2;
    const spread = gaussian() * 0.2;
    point.copy(axisA).multiplyScalar(Math.cos(angle)).addScaledVector(axisB, Math.sin(angle))
      .addScaledVector(normal, spread).normalize();
    if (point.y < 0.02) continue;
    position.push(point.x * SKY_RADIUS, point.y * SKY_RADIUS, point.z * SKY_RADIUS);
    brightness.push(Math.exp(-(spread * spread) / 0.012) * 0.6 + Math.random() * 0.3);
    seed.push(Math.random());
  }
  return makeLayer(
    { position: { data: position, size: 3 }, aBrightness: { data: brightness, size: 1 }, aSeed: { data: seed, size: 1 } },
    /* glsl */ `
      uniform float uTime;
      uniform float uLife;
      uniform float uPixelRatio;
      attribute float aBrightness;
      attribute float aSeed;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = mix(0.9, 1.8, aSeed * aBrightness) * uPixelRatio;
        float twinkle = 0.8 + 0.2 * sin(uTime * (0.5 + aSeed) + aSeed * 40.0);
        vColor = vec3(0.78, 0.84, 1.0);
        vAlpha = uLife * (0.25 + 0.7 * aBrightness) * twinkle;
      }
    `,
    {},
    pixelRatio,
  );
}

// A thin crescent of points with a faint halo, far away on the sky.
function createMoon(count: number, pixelRatio: number): Layer {
  const position: number[] = [];
  const brightness: number[] = [];
  const radius = 2.1;
  const center = MOON_DIRECTION.clone().multiplyScalar(SKY_RADIUS * 0.95);
  const right = new THREE.Vector3(0, 1, 0).cross(MOON_DIRECTION).normalize();
  const up = MOON_DIRECTION.clone().cross(right).normalize();
  // The lit side faces down and to the right, towards where the sun has set.
  const shadow = right.clone().multiplyScalar(-0.62 * radius).addScaledVector(up, 0.38 * radius);
  const point = new THREE.Vector3();
  let crescent = 0;
  while (crescent < count) {
    const a = (Math.random() * 2 - 1) * radius;
    const b = (Math.random() * 2 - 1) * radius;
    const offset = right.clone().multiplyScalar(a).addScaledVector(up, b);
    if (offset.length() > radius || offset.distanceTo(shadow) < radius * 0.94) continue;
    point.copy(center).add(offset);
    position.push(point.x, point.y, point.z);
    brightness.push(1);
    crescent += 1;
  }
  // Halo: sparse, dim points around the moon.
  for (let i = 0; i < count * 0.5; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = radius * (1.1 + Math.pow(Math.random(), 1.8) * 2.4);
    point.copy(center).addScaledVector(right, Math.cos(angle) * distance).addScaledVector(up, Math.sin(angle) * distance);
    position.push(point.x, point.y, point.z);
    brightness.push(0.12 * (1 - (distance - radius) / (radius * 3.5)));
  }
  return makeLayer(
    { position: { data: position, size: 3 }, aBrightness: { data: brightness, size: 1 } },
    /* glsl */ `
      uniform float uLife;
      uniform float uPixelRatio;
      attribute float aBrightness;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = mix(1.2, 1.8, aBrightness) * uPixelRatio;
        vColor = vec3(0.98, 0.95, 0.86);
        vAlpha = uLife * aBrightness * 0.9;
      }
    `,
    {},
    pixelRatio,
  );
}

// Trees along both sides of the flight and a tree line with hills on the
// horizon: dark green crowns, lit a little from above by the moon.
function createForest(count: number, pixelRatio: number): Layer {
  const position: number[] = [];
  const shade: number[] = [];
  const seed: number[] = [];
  const addTree = (x: number, z: number, height: number) => {
    const conifer = Math.random() < 0.55;
    const points = Math.round(90 + height * 36);
    const crownBase = height * (conifer ? 0.18 : 0.35);
    const crownRadius = height * (conifer ? 0.24 : 0.3);
    for (let i = 0; i < points; i += 1) {
      let px: number;
      let py: number;
      let pz: number;
      if (i < points * 0.08) {
        // The trunk.
        py = Math.random() * crownBase;
        px = x + (Math.random() - 0.5) * 0.08;
        pz = z + (Math.random() - 0.5) * 0.08;
      } else if (conifer) {
        const t = Math.pow(Math.random(), 0.8);
        py = crownBase + t * (height - crownBase);
        const r = crownRadius * (1 - t) * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        px = x + Math.cos(a) * r;
        pz = z + Math.sin(a) * r;
      } else {
        const a = Math.random() * Math.PI * 2;
        const e = Math.acos(Math.random() * 2 - 1);
        const r = crownRadius * Math.cbrt(Math.random());
        px = x + Math.sin(e) * Math.cos(a) * r * 1.1;
        py = crownBase + crownRadius + Math.cos(e) * r * 0.9;
        pz = z + Math.sin(e) * Math.sin(a) * r;
      }
      position.push(px, py, pz);
      // Moonlight catches the tops of the crowns.
      shade.push(0.35 + 0.65 * Math.pow(Math.min(1, py / height), 2));
      seed.push(Math.random());
    }
    return points;
  };
  let used = 0;
  // Two edges of forest along the flight; denser further on, towards the end
  // of the site, where the night becomes a forest.
  // The flight runs from x = 0 (case 02) to x = 6 (case 03 and the road), so
  // the edges follow it: close enough to stand clearly in frame.
  while (used < count * 0.72) {
    const z = 4 - Math.pow(Math.random(), 0.7) * 110;
    const axis = z > -20 ? 3 * (4 - z) / 24 : 6;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = axis + side * (3.8 + Math.pow(Math.random(), 1.5) * 10);
    used += addTree(x, z, 3.5 + Math.random() * 5);
  }
  // A tree line on the horizon.
  while (used < count * 0.9) {
    used += addTree(-40 + Math.random() * 100, -112 - Math.random() * 14, 4 + Math.random() * 4);
  }
  // Preserve the forest budget; a little more dust defines the distant ridges.
  const hillMask: number[] = new Array(position.length / 3).fill(0);
  const hillCount = Math.max(0, Math.round((count - used) * 1.6));
  for (let i = 0; i < hillCount; i += 1) {
    const x = -70 + Math.random() * 150;
    const ridge = 3 + 2.4 * Math.sin(x * 0.05) + 1.3 * Math.sin(x * 0.13 + 1.7);
    // Concentrate some samples near the crest, keeping its edge soft.
    const elevation = Math.random() < 0.45 ? Math.pow(Math.random(), 0.28) : Math.random();
    const y = elevation * ridge;
    const depth = Math.random();
    position.push(x, y, -135 - depth * 10);
    shade.push(0.18 + 0.72 * Math.pow(elevation, 2));
    seed.push(Math.random());
    hillMask.push(1 + depth);
  }
  return makeLayer(
    { position: { data: position, size: 3 }, aShade: { data: shade, size: 1 }, aSeed: { data: seed, size: 1 }, aHill: { data: hillMask, size: 1 } },
    /* glsl */ `
      uniform float uTime;
      uniform float uLife;
      uniform float uPixelRatio;
      attribute float aShade;
      attribute float aSeed;
      attribute float aHill;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 point = position;
        float hill = step(0.5, aHill);
        // Crowns stir in a light wind.
        point.x += sin(uTime * 0.6 + position.z * 0.2 + aSeed * 3.0) * 0.04 * aShade * (1.0 - hill);
        vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        float distanceToCamera = -viewPosition.z;
        gl_PointSize = mix(1.2, 2.2, aSeed) * uPixelRatio * clamp(12.0 / max(distanceToCamera, 1.0), 0.7, 2.4);
        vColor = mix(vec3(0.22, 0.4, 0.3), vec3(0.72, 0.84, 0.78), aShade * aShade);
        // Distance and mist soften the far trees.
        float haze = exp(-distanceToCamera * 0.01);
        vAlpha = uLife * (0.45 + 0.55 * aShade) * mix(0.5, 1.0, haze);
        if (hill > 0.5) {
          float depth = aHill - 1.0;
          vec3 slope = mix(vec3(0.24, 0.39, 0.36), vec3(0.27, 0.36, 0.44), depth);
          vec3 crest = vec3(0.57, 0.7, 0.65);
          vColor = mix(slope, crest, aShade * aShade);
          vAlpha *= mix(1.35, 0.9, depth);
          gl_PointSize *= 1.08;
        }
      }
    `,
    {},
    pixelRatio,
  );
}

// Fireflies drifting over the field; they blink, and flare up and gather
// around the butterfly when it passes.
function createFireflies(count: number, pixelRatio: number): Layer {
  const position: number[] = [];
  const seed: number[] = [];
  for (let i = 0; i < count; i += 1) {
    position.push(-6 + Math.random() * 20, 0.25 + Math.pow(Math.random(), 1.4) * 2.4, -8 - Math.random() * 58);
    seed.push(Math.random());
  }
  return makeLayer(
    { position: { data: position, size: 3 }, aSeed: { data: seed, size: 1 } },
    /* glsl */ `
      uniform float uTime;
      uniform float uLife;
      uniform float uPixelRatio;
      uniform vec3 uButterfly;
      uniform float uButterflyOn;
      attribute float aSeed;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float t = uTime * (0.25 + aSeed * 0.3);
        vec3 point = position + vec3(sin(t + aSeed * 20.0), sin(t * 1.7 + aSeed * 9.0) * 0.35, cos(t * 0.8 + aSeed * 13.0)) * 0.7;
        // Near the butterfly they flare up and are drawn after it.
        float near = (1.0 - smoothstep(0.4, 3.2, distance(point, uButterfly))) * uButterflyOn;
        point = mix(point, uButterfly + (point - uButterfly) * 0.55, near * 0.6);
        float blink = pow(max(0.0, sin(uTime * (0.7 + aSeed * 1.3) + aSeed * 30.0)), 5.0);
        vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        float distanceToCamera = -viewPosition.z;
        float glow = 0.45 + 0.8 * blink + near * 1.4;
        gl_PointSize = (2.2 + 2.6 * glow) * uPixelRatio * clamp(6.0 / max(distanceToCamera, 0.5), 0.35, 2.0);
        vColor = mix(vec3(0.82, 0.95, 0.42), vec3(1.0, 0.92, 0.6), near);
        vAlpha = uLife * min(1.0, glow) * smoothstep(0.3, 1.2, distanceToCamera);
      }
    `,
    { uButterfly: { value: new THREE.Vector3() }, uButterflyOn: { value: 0 } },
    pixelRatio,
    /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        // A bright core in a soft glow.
        float core = 1.0 - smoothstep(0.0, 0.16, distanceToCenter);
        float glow = 1.0 - smoothstep(0.08, 0.5, distanceToCenter);
        gl_FragColor = vec4(vColor, (core + glow * 0.45) * vAlpha);
      }
    `,
  );
}

// Low mist over the ground: very fine, faint points hugging the earth and
// drifting slowly, so near things stand out of it and far things sink into it.
function createMist(count: number, pixelRatio: number): Layer {
  const position: number[] = [];
  const seed: number[] = [];
  for (let i = 0; i < count; i += 1) {
    position.push(-12 + Math.random() * 34, Math.pow(Math.random(), 2.2) * 0.9, 4 - Math.random() * (4 - MEADOW_FAR_Z + 20));
    seed.push(Math.random());
  }
  return makeLayer(
    { position: { data: position, size: 3 }, aSeed: { data: seed, size: 1 } },
    /* glsl */ `
      uniform float uTime;
      uniform float uLife;
      uniform float uPixelRatio;
      attribute float aSeed;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 point = position;
        point.x += sin(uTime * 0.08 + aSeed * 40.0) * 1.2 + uTime * 0.05;
        point.x = mod(point.x + 12.0, 34.0) - 12.0;
        point.y += sin(uTime * 0.2 + aSeed * 17.0) * 0.05;
        vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        float distanceToCamera = -viewPosition.z;
        gl_PointSize = mix(1.4, 3.0, aSeed) * uPixelRatio * clamp(5.0 / max(distanceToCamera, 0.5), 0.5, 2.4);
        vColor = vec3(0.62, 0.7, 0.82);
        // Thicker near the ground, thinning upwards; faint everywhere.
        vAlpha = uLife * 0.09 * (1.0 - smoothstep(0.0, 0.9, point.y)) * smoothstep(0.6, 2.5, distanceToCamera);
      }
    `,
    {},
    pixelRatio,
  );
}

export function createNightLife(counts: NightLifeCounts, pixelRatio: number): NightLife {
  const group = new THREE.Group();
  // The sky layers sit at infinity: they travel with the camera.
  const sky = new THREE.Group();
  const milkyWay = createMilkyWay(counts.milkyWay, pixelRatio);
  const moon = createMoon(Math.round(counts.milkyWay * 0.3), pixelRatio);
  sky.add(milkyWay.points, moon.points);
  const forest = createForest(counts.forest, pixelRatio);
  const fireflies = createFireflies(counts.fireflies, pixelRatio);
  const mist = createMist(counts.mist, pixelRatio);
  group.add(sky, forest.points, mist.points, fireflies.points);
  const layers = [milkyWay, moon, forest, fireflies, mist];

  return {
    group,
    update({ life, time, eye, butterfly, butterflyOn }) {
      group.visible = life > 0.001;
      if (!group.visible) return;
      sky.position.copy(eye);
      for (const layer of layers) {
        layer.uniforms.uLife.value = life;
        layer.uniforms.uTime.value = time;
      }
      (fireflies.uniforms.uButterfly.value as THREE.Vector3).set(...butterfly);
      fireflies.uniforms.uButterflyOn.value = butterflyOn;
    },
    setPixelRatio(value) {
      for (const layer of layers) layer.uniforms.uPixelRatio.value = value;
    },
    dispose() {
      for (const layer of layers) {
        layer.geometry.dispose();
        layer.material.dispose();
      }
    },
  };
}

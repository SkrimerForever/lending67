import * as THREE from "three";

export type WalkerFigure = {
  points: THREE.Points;
  update(stride: number, time: number, reveal: number): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

// Baked by scripts/bake-walker.mjs from a real character model, posed mid-stride:
// Float32 records [x, y, z, nx, ny, nz, tone, seed], metres, facing -Z, left = -X.
const WALKER_POINTS_URL = "/walker-points.bin";
const RECORD = 8;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uPixelRatio;
  attribute vec3 aNormal;
  attribute float aTone;
  attribute float aSeed;
  varying float vAlpha;
  varying float vLight;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec3 worldNormal = normalize(mat3(modelMatrix) * aNormal);
    // Hide points on the far side of the body so the figure reads as a solid
    // silhouette instead of front and back surfaces adding up.
    float facing = dot(normalize(cameraPosition - worldPosition.xyz), worldNormal);

    vec4 viewPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * viewPosition;
    float distanceToCamera = -viewPosition.z;
    gl_PointSize = mix(1.0, 1.9, aSeed) * uPixelRatio
      * clamp(4.5 / max(distanceToCamera, 0.3), 0.6, 3.2);
    float shimmer = 0.88 + 0.12 * sin(uTime * 1.7 + aSeed * 40.0);
    vLight = aTone * mix(0.8, 1.0, smoothstep(0.4, 1.7, position.y)) * shimmer;
    vAlpha = uReveal * smoothstep(-0.15, 0.2, facing)
      * smoothstep(0.18, 0.55, distanceToCamera) * mix(0.6, 0.95, aSeed);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vLight;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float dotAlpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
    gl_FragColor = vec4(vec3(0.93, 0.95, 0.96) * vLight, dotAlpha * vAlpha);
  }
`;

export function createWalkerFigure(count: number, pixelRatio: number): WalkerFigure {
  const geometry = new THREE.BufferGeometry();
  const uniforms = {
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uPixelRatio: { value: pixelRatio },
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
  let disposed = false;

  // The records are shuffled at bake time, so any prefix is a uniform subset.
  fetch(WALKER_POINTS_URL)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      if (disposed) return;
      const records = new Float32Array(buffer);
      const total = Math.min(count, Math.floor(records.length / RECORD));
      const position = new Float32Array(total * 3);
      const normal = new Float32Array(total * 3);
      const tone = new Float32Array(total);
      const seed = new Float32Array(total);
      for (let i = 0; i < total; i += 1) {
        const o = i * RECORD;
        position.set(records.subarray(o, o + 3), i * 3);
        normal.set(records.subarray(o + 3, o + 6), i * 3);
        tone[i] = records[o + 6];
        seed[i] = records[o + 7];
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(position, 3));
      geometry.setAttribute("aNormal", new THREE.BufferAttribute(normal, 3));
      geometry.setAttribute("aTone", new THREE.BufferAttribute(tone, 1));
      geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    })
    .catch(() => {
      // Without the baked cloud the scene simply shows no walker.
    });

  return {
    points,
    update(_stride, time, reveal) {
      uniforms.uTime.value = time;
      uniforms.uReveal.value = reveal;
    },
    setPixelRatio(value) {
      uniforms.uPixelRatio.value = value;
    },
    dispose() {
      disposed = true;
      geometry.dispose();
      material.dispose();
    },
  };
}

import * as THREE from "three";
import { sampleWalkerBody, WALKER_LENGTHS, WALKER_REST_JOINTS } from "./walkerBody";

export type WalkerFigure = {
  points: THREE.Points;
  update(stride: number, time: number, reveal: number): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

const f = (value: number) => value.toFixed(4);
const vec = ([x, y, z]: readonly number[]) => `vec3(${f(x)}, ${f(y)}, ${f(z)})`;
const JOINTS = `vec3[16](${WALKER_REST_JOINTS.map(vec).join(", ")})`;

// Each point is skinned to two bones posed from one walk phase (uStride,
// 1.0 = one full cycle of two steps). Positive rotX swings a hanging limb
// forward (toward -Z); the walker's left side is -X.
const vertexShader = /* glsl */ `
  uniform float uStride;
  uniform float uTime;
  uniform float uReveal;
  uniform float uPixelRatio;
  attribute vec2 aBones;
  attribute float aWeight;
  attribute float aSeed;
  attribute float aShell;
  attribute float aMaterial;
  varying float vAlpha;
  varying float vLight;

  const float TAU = 6.28318530718;
  const float THIGH = ${f(WALKER_LENGTHS.thigh)};
  const float SHIN = ${f(WALKER_LENGTHS.shin)};
  const float PELVIS_Y = ${f(WALKER_LENGTHS.pelvisY)};
  const vec3 JOINTS[16] = ${JOINTS};

  mat3 rotX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotY(float a) { float c = cos(a); float s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }

  float bump(float phase, float centre, float width) {
    float d = phase - centre;
    d -= floor(d + 0.5);
    return exp(-(d * d) / (width * width));
  }
  float hipAngle(float phase) { return 0.1 + 0.32 * cos(TAU * phase); }
  float kneeAngle(float phase) { return 0.12 * bump(phase, 0.14, 0.09) + 1.05 * bump(phase, 0.72, 0.13); }
  float ankleAngle(float phase) { return 0.18 * bump(phase, 0.02, 0.07) - 0.32 * bump(phase, 0.6, 0.07); }
  float legHeight(float phase) {
    float hip = hipAngle(phase);
    return THIGH * cos(hip) + SHIN * cos(hip - kneeAngle(phase));
  }

  // World pose of a bone: worldPoint = R * (restPoint - JOINTS[bone]) + T.
  void bonePose(int bone, out mat3 R, out vec3 T) {
    float cycle = TAU * uStride;
    // The longer leg sets pelvis height: natural bob, stance foot on the ground.
    float reach = max(legHeight(fract(uStride)), legHeight(fract(uStride + 0.5)));
    mat3 R0 = rotY(0.08 * cos(cycle));
    vec3 T0 = vec3(-0.018 * sin(cycle), PELVIS_Y - (THIGH + SHIN - reach), 0.0);
    if (bone == 0) { R = R0; T = T0; return; }

    if (bone >= 10) {
      bool left = bone < 13;
      int first = left ? 10 : 13;
      int segment = bone - first;
      float phase = fract(uStride + (left ? 0.0 : 0.5));
      mat3 Rh = R0 * rotX(hipAngle(phase));
      vec3 Th = T0 + R0 * (JOINTS[first] - JOINTS[0]);
      if (segment == 0) { R = Rh; T = Th; return; }
      mat3 Rk = Rh * rotX(-kneeAngle(phase));
      vec3 Tk = Th + Rh * (JOINTS[first + 1] - JOINTS[first]);
      if (segment == 1) { R = Rk; T = Tk; return; }
      R = Rk * rotX(ankleAngle(phase));
      T = Tk + Rk * (JOINTS[first + 2] - JOINTS[first + 1]);
      return;
    }

    mat3 R1 = R0 * rotY(-0.1 * cos(cycle)) * rotX(-0.06);
    vec3 T1 = T0 + R0 * (JOINTS[1] - JOINTS[0]);
    if (bone == 1) { R = R1; T = T1; return; }

    if (bone >= 4) {
      bool left = bone < 7;
      int first = left ? 4 : 7;
      int segment = bone - first;
      float swing = (left ? -0.3 : 0.3) * cos(cycle) + 0.04;
      float elbow = 0.22 + 0.22 * max(0.0, swing);
      mat3 Rs = R1 * rotX(swing);
      vec3 Ts = T1 + R1 * (JOINTS[first] - JOINTS[1]);
      if (segment == 0) { R = Rs; T = Ts; return; }
      mat3 Re = Rs * rotX(elbow);
      vec3 Te = Ts + Rs * (JOINTS[first + 1] - JOINTS[first]);
      if (segment == 1) { R = Re; T = Te; return; }
      R = Re;
      T = Te + Re * (JOINTS[first + 2] - JOINTS[first + 1]);
      return;
    }

    vec3 Tn = T1 + R1 * (JOINTS[2] - JOINTS[1]);
    if (bone == 2) { R = R1; T = Tn; return; }
    R = R1 * rotX(0.05);
    T = Tn + R1 * (JOINTS[3] - JOINTS[2]);
  }

  void main() {
    int first = int(aBones.x + 0.5);
    int second = int(aBones.y + 0.5);
    mat3 Ra; vec3 Ta; mat3 Rb; vec3 Tb;
    bonePose(first, Ra, Ta);
    bonePose(second, Rb, Tb);
    vec3 posedA = Ra * (position - JOINTS[first]) + Ta;
    vec3 posedB = Rb * (position - JOINTS[second]) + Tb;
    vec3 p = mix(posedA, posedB, aWeight);

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float distanceToCamera = -viewPosition.z;
    gl_PointSize = mix(1.0, 1.9, aSeed) * uPixelRatio
      * clamp(4.5 / max(distanceToCamera, 0.3), 0.6, 3.2);
    float shimmer = 0.88 + 0.12 * sin(uTime * 1.7 + aSeed * 40.0);
    // Tone per material (skin, hair, jacket, trousers, shoes) so clothing
    // edges read: bright skin and jacket, clearly darker trousers, dark hair and shoes.
    float tone = aMaterial < 0.5 ? 1.0
      : aMaterial < 1.5 ? 0.35
      : aMaterial < 2.5 ? 0.95
      : aMaterial < 3.5 ? 0.42
      : 0.25;
    vLight = tone * mix(0.5, 1.0, aShell) * mix(0.8, 1.0, smoothstep(0.4, 1.7, p.y)) * shimmer;
    vAlpha = uReveal * smoothstep(0.18, 0.55, distanceToCamera)
      * mix(0.35, 1.0, aShell) * mix(0.6, 0.95, aSeed);
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
  const body = sampleWalkerBody(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(body.rest, 3));
  geometry.setAttribute("aBones", new THREE.BufferAttribute(body.bones, 2));
  geometry.setAttribute("aWeight", new THREE.BufferAttribute(body.weight, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(body.seed, 1));
  geometry.setAttribute("aShell", new THREE.BufferAttribute(body.shell, 1));
  geometry.setAttribute("aMaterial", new THREE.BufferAttribute(body.material, 1));
  const uniforms = {
    uStride: { value: 0 },
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
  return {
    points,
    update(stride, time, reveal) {
      uniforms.uStride.value = stride;
      uniforms.uTime.value = time;
      uniforms.uReveal.value = reveal;
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

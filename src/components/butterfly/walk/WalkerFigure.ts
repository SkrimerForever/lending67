import * as THREE from "three";
import { sampleWalkerBody, WALKER_JOINTS as J } from "./walkerBody";

export type WalkerFigure = {
  points: THREE.Points;
  update(stride: number, time: number, reveal: number): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

const f = (value: number) => value.toFixed(4);

// Forward kinematics runs on the GPU from a single walk phase (uStride,
// 1.0 = one full cycle of two steps). Positive rotX swings a hanging limb
// forward (toward -Z); the walker's left side is -X.
const vertexShader = /* glsl */ `
  uniform float uStride;
  uniform float uTime;
  uniform float uReveal;
  uniform float uPixelRatio;
  attribute vec3 aLocal;
  attribute float aBone;
  attribute float aSeed;
  varying float vAlpha;
  varying float vLight;

  const float TAU = 6.28318530718;
  const float HIP_Y = ${f(J.hipY)};
  const float SPINE_Y = ${f(J.spineY)};
  const float NECK_Y = ${f(J.neckY)};
  const float NECK_LENGTH = ${f(J.neckLength)};
  const float SHOULDER_X = ${f(J.shoulderX)};
  const float SHOULDER_Y = ${f(J.shoulderY)};
  const float HIP_X = ${f(J.hipX)};
  const float HIP_DROP = ${f(J.hipDrop)};
  const float THIGH = ${f(J.thigh)};
  const float SHIN = ${f(J.shin)};
  const float UPPER_ARM = ${f(J.upperArm)};
  const float FOREARM = ${f(J.forearm)};
  const float ANKLE_HEIGHT = ${f(J.ankleHeight)};

  mat3 rotX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotY(float a) { float c = cos(a); float s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  mat3 rotZ(float a) { float c = cos(a); float s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

  float bump(float phase, float centre, float width) {
    float d = phase - centre;
    d -= floor(d + 0.5);
    return exp(-(d * d) / (width * width));
  }
  // Gait curves: hip flexed at heel strike (phase 0), extended at toe-off,
  // small knee flex in stance, large knee flex in swing.
  float hipAngle(float phase) { return 0.1 + 0.32 * cos(TAU * phase); }
  float kneeAngle(float phase) { return 0.12 * bump(phase, 0.14, 0.09) + 1.05 * bump(phase, 0.72, 0.13); }
  float ankleAngle(float phase) { return 0.18 * bump(phase, 0.02, 0.07) - 0.32 * bump(phase, 0.6, 0.07); }
  float legHeight(float phase) {
    float hip = hipAngle(phase);
    return THIGH * cos(hip) + SHIN * cos(hip - kneeAngle(phase));
  }

  void main() {
    float cycle = TAU * uStride;
    mat3 pelvisRot = rotY(0.08 * cos(cycle));
    mat3 ribRot = rotY(-0.1 * cos(cycle)) * rotX(-0.06);
    int bone = int(aBone + 0.5);
    vec3 p = aLocal;

    if (bone >= 10) {
      bool left = bone < 13;
      int segment = left ? bone - 10 : bone - 13;
      float phase = fract(uStride + (left ? 0.0 : 0.5));
      if (segment == 2) p = rotX(ankleAngle(phase)) * p + vec3(0.0, -SHIN, 0.0);
      if (segment >= 1) p = rotX(-kneeAngle(phase)) * p + vec3(0.0, -THIGH, 0.0);
      p = rotX(hipAngle(phase)) * p + vec3(left ? -HIP_X : HIP_X, HIP_DROP, 0.0);
      p = pelvisRot * p;
    } else if (bone >= 4) {
      bool left = bone < 7;
      int segment = left ? bone - 4 : bone - 7;
      float swing = (left ? -0.3 : 0.3) * cos(cycle) + 0.04;
      float elbow = 0.22 + 0.22 * max(0.0, swing);
      if (segment == 2) p = p + vec3(0.0, -FOREARM, 0.0);
      if (segment >= 1) p = rotX(elbow) * p + vec3(0.0, -UPPER_ARM, 0.0);
      p = rotZ(left ? -0.07 : 0.07) * rotX(swing) * p
        + vec3(left ? -SHOULDER_X : SHOULDER_X, SHOULDER_Y, 0.0);
      p = pelvisRot * (ribRot * p + vec3(0.0, SPINE_Y, 0.0));
    } else if (bone >= 2) {
      if (bone == 3) p = rotX(0.05) * p + vec3(0.0, NECK_LENGTH, 0.0);
      p = p + vec3(0.0, NECK_Y, 0.0);
      p = pelvisRot * (ribRot * p + vec3(0.0, SPINE_Y, 0.0));
    } else if (bone == 1) {
      p = pelvisRot * (ribRot * p + vec3(0.0, SPINE_Y, 0.0));
    } else {
      p = pelvisRot * p;
    }

    // The longer leg defines pelvis height, which produces the natural bob
    // and keeps the stance foot on the ground.
    float pelvisY = max(legHeight(fract(uStride)), legHeight(fract(uStride + 0.5)))
      + ANKLE_HEIGHT - HIP_DROP;
    p += vec3(-0.018 * sin(cycle), pelvisY, 0.0);

    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float distanceToCamera = -viewPosition.z;
    gl_PointSize = mix(1.1, 2.1, aSeed) * uPixelRatio
      * clamp(4.5 / max(distanceToCamera, 0.3), 0.6, 3.2);
    float shimmer = 0.86 + 0.14 * sin(uTime * 1.7 + aSeed * 40.0);
    vLight = mix(0.72, 1.0, smoothstep(0.4, 1.7, p.y)) * shimmer;
    vAlpha = uReveal * smoothstep(0.18, 0.55, distanceToCamera) * mix(0.55, 0.95, aSeed);
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
  // "position" is required by three; the shader reads aLocal instead.
  geometry.setAttribute("position", new THREE.BufferAttribute(body.local, 3));
  geometry.setAttribute("aLocal", new THREE.BufferAttribute(body.local, 3));
  geometry.setAttribute("aBone", new THREE.BufferAttribute(body.bone, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(body.seed, 1));
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

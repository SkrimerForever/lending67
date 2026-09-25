import * as THREE from "three";
import { CASE_THREE_SCREEN, LIGHT_Y, LIGHT_Z, PORTAL_HEIGHT, type ButterflyPassState } from "./walkFlightState";

export type PassButterfly = {
  points: THREE.Points;
  update(state: ButterflyPassState, time: number): void;
  setAspect(aspect: number): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

// The same source as the opening butterfly, so the one that carries the story
// from case 02 to case 03 is recognisably the same creature.
const BUTTERFLY_URL = "/butterfly-reference.webp";
const WINGSPAN = 0.95;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uGather;
  uniform float uLand;
  uniform float uFlap;
  uniform float uAppear;
  uniform vec2 uPanelSize;
  uniform vec2 uCollapse;
  uniform vec3 uFrom;
  uniform vec3 uTo;
  uniform mat4 uButterfly;
  uniform vec3 uHeading;
  uniform float uSpeed;
  attribute vec2 aRect;
  attribute vec2 aWing;
  attribute float aSeed;
  varying float vAlpha;
  varying float vTip;

  float ease(float x) {
    x = clamp(x, 0.0, 1.0);
    return x * x * (3.0 - 2.0 * x);
  }

  void main() {
    // Each point leaves a little earlier or later than its neighbours, so the
    // screen streams into the butterfly instead of jumping as one sheet.
    float gather = ease(uGather * 1.4 - aSeed * 0.4);
    float land = ease(uLand * 1.4 - aSeed * 0.4);

    // Points hold the folding case 02 screen: a line, then a point.
    vec3 onCaseTwo = uFrom + vec3(aRect * uPanelSize * uCollapse, 0.03);
    vec3 onCaseThree = uTo + vec3(aRect * uPanelSize, 0.03);

    // Top view butterfly: x across the wings, z along the body (head at -z).
    // The wings rise and fall about the body axis, and the body flies pitched
    // up like a real butterfly, so the wings read from behind.
    float span = abs(aWing.x);
    float lift = uFlap * smoothstep(0.02, 0.16, span);
    vec3 body = vec3(sign(aWing.x) * span * cos(lift), span * sin(lift), aWing.y);
    const float pitch = 0.95;
    vec3 local = vec3(
      body.x,
      body.y * cos(pitch) - body.z * sin(pitch),
      body.y * sin(pitch) + body.z * cos(pitch)
    );
    vec3 onButterfly = (uButterfly * vec4(local, 1.0)).xyz;

    // At speed a few points fall behind the wings as a short glittering trail.
    float trail = smoothstep(0.82, 1.0, aSeed);
    onButterfly -= uHeading * trail * uSpeed * (0.4 + 1.6 * fract(aSeed * 37.0));
    onButterfly.y -= trail * uSpeed * 0.12;

    vec3 point = mix(onCaseTwo, onButterfly, gather);
    point = mix(point, onCaseThree, land);
    // Streams arc slightly on the way, like the opening flight.
    point.y += (sin(gather * 3.14159) + sin(land * 3.14159)) * (0.12 + aSeed * 0.22);
    point.x += sin(gather * 3.14159) * (aSeed - 0.5) * 0.5;

    vec4 viewPosition = viewMatrix * modelMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    float distanceToCamera = -viewPosition.z;
    gl_PointSize = mix(1.1, 2.2, aSeed) * uPixelRatio * clamp(5.0 / max(distanceToCamera, 0.3), 0.5, 3.0);
    float shimmer = 0.85 + 0.15 * sin(uTime * 1.9 + aSeed * 50.0);
    vAlpha = uAppear * mix(0.55, 1.0, aSeed) * shimmer * smoothstep(0.15, 0.5, distanceToCamera);
    // Only the butterfly carries warmth, strongest at the wing tips.
    vTip = smoothstep(0.35, 1.0, span / ${(WINGSPAN / 2).toFixed(3)}) * gather * (1.0 - land * 0.6);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uWarmth;
  varying float vAlpha;
  varying float vTip;

  void main() {
    float distanceToCenter = length(gl_PointCoord - 0.5);
    float dotAlpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
    vec3 silver = vec3(0.9, 0.93, 0.96);
    vec3 warm = vec3(1.0, 0.76, 0.56);
    gl_FragColor = vec4(mix(silver, warm, vTip * uWarmth * 0.95), dotAlpha * vAlpha);
  }
`;

// Dark pixels of the reference image, as local wing coordinates.
function sampleButterfly(image: HTMLImageElement, count: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const wing = new Float32Array(count * 2);
  if (!context) return wing;
  const height = Math.min(246, image.naturalHeight);
  canvas.width = image.naturalWidth;
  canvas.height = height;
  context.drawImage(image, 0, 0, image.naturalWidth, height, 0, 0, canvas.width, height);
  const pixels = context.getImageData(0, 0, canvas.width, height).data;
  const candidates: Array<[number, number]> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const i = (y * canvas.width + x) * 4;
      const ink = Math.hypot(255 - pixels[i], 255 - pixels[i + 1], 255 - pixels[i + 2]);
      if (ink > 48) candidates.push([x, y]);
    }
  }
  if (!candidates.length) return wing;
  const scale = WINGSPAN / canvas.width;
  for (let i = 0; i < count; i += 1) {
    const [x, y] = candidates[Math.floor(Math.random() * candidates.length)];
    wing[i * 2] = (x + Math.random() - 0.5 - canvas.width / 2) * scale;
    wing[i * 2 + 1] = (y + Math.random() - 0.5 - height / 2) * scale;
  }
  return wing;
}

export function createPassButterfly(count: number, pixelRatio: number): PassButterfly {
  const geometry = new THREE.BufferGeometry();
  const rect = new Float32Array(count * 2);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    rect[i * 2] = Math.random() - 0.5;
    rect[i * 2 + 1] = Math.random() - 0.5;
    seed[i] = Math.random();
  }
  // Positions are computed in the shader; this attribute only sizes the draw.
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aRect", new THREE.BufferAttribute(rect, 2));
  geometry.setAttribute("aWing", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
    uGather: { value: 0 },
    uLand: { value: 0 },
    uFlap: { value: 0 },
    uAppear: { value: 0 },
    uWarmth: { value: 0 },
    uPanelSize: { value: new THREE.Vector2(3.2, PORTAL_HEIGHT) },
    uCollapse: { value: new THREE.Vector2(1, 1) },
    uFrom: { value: new THREE.Vector3(0, LIGHT_Y, LIGHT_Z) },
    uTo: { value: new THREE.Vector3(...CASE_THREE_SCREEN) },
    uButterfly: { value: new THREE.Matrix4() },
    uHeading: { value: new THREE.Vector3(0, 0, -1) },
    uSpeed: { value: 0 },
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

  let disposed = false;
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    if (disposed) return;
    geometry.setAttribute("aWing", new THREE.BufferAttribute(sampleButterfly(image, count), 2));
  };
  image.src = BUTTERFLY_URL;

  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const bank = new THREE.Matrix4();
  let wingPhase = 0;
  let lastTime = 0;

  return {
    points,
    update(state, time) {
      const fade = 1 - state.caseThreeReveal;
      // The points light up as the screen folds, so the line and the point
      // it folds into glow before they burst into the butterfly.
      const appear = 1 - state.collapse[1];
      points.visible = state.active && appear > 0.01 && fade > 0;
      if (!points.visible) return;
      uniforms.uTime.value = time;
      uniforms.uGather.value = state.gather;
      uniforms.uLand.value = state.land;
      uniforms.uAppear.value = Math.min(1, appear * 1.2) * fade;
      uniforms.uCollapse.value.set(...state.collapse);
      uniforms.uWarmth.value = state.warmth;
      // Wing beats and a gentle bob run on time, like the opening butterfly,
      // and quicken with speed; where it is along the way comes from scroll.
      const delta = Math.min(0.05, Math.max(0, time - lastTime));
      lastTime = time;
      wingPhase += delta * (6.5 + state.butterflySpeed * 9);
      uniforms.uFlap.value = 0.25 + Math.sin(wingPhase) * (0.7 + state.butterflySpeed * 0.15);
      uniforms.uSpeed.value = state.butterflySpeed;
      uniforms.uHeading.value.set(...state.butterflyHeading);
      position.set(...state.butterflyPosition);
      position.y += Math.sin(time * 2.1) * 0.03;
      target.copy(position).add(uniforms.uHeading.value);
      // Matrix4.lookAt points local -Z along the heading, so the head leads;
      // the body then rolls into the turn.
      uniforms.uButterfly.value.lookAt(position, target, up).setPosition(position);
      uniforms.uButterfly.value.multiply(bank.makeRotationZ(-state.butterflyBank + Math.sin(time * 1.3) * 0.08));
    },
    setAspect(aspect) {
      uniforms.uPanelSize.value.x = PORTAL_HEIGHT * aspect;
    },
    setPixelRatio(value) {
      uniforms.uPixelRatio.value = value;
    },
    dispose() {
      disposed = true;
      image.onload = null;
      geometry.dispose();
      material.dispose();
    },
  };
}

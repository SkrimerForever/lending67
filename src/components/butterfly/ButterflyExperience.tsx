"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { ApproachScene } from "./ApproachScene";
import { FlowArchitectCase } from "./FlowArchitectCase";
import { HeroStory } from "./HeroStory";
import { LoadingLine } from "./LoadingLine";
import { getPerformanceProfile, type PerformanceProfile } from "./performance-profile";
import { SecondCaseStub } from "./SecondCaseStub";
import { ThirdCase } from "./ThirdCase";
import { createWalkScene } from "./walk/createWalkScene";
import { getDawnState, getWalkFlightState } from "./walk/walkFlightState";

const FLOW_PROMPT = "Получить сообщение → обработать AI → отправить в Telegram";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uPixelRatio;
  uniform float uPointSize;
  uniform float uBodyDepthEffect;
  uniform float uFlapEnergy;
  uniform float uFlightBlend;
  uniform float uDissolve;
  uniform float uSceneTime;
  uniform vec3 uVortexCenter;
  uniform vec3 uScatterWorldOffset;
  uniform vec3 uFlightVelocity;
  attribute vec3 aScatter;
  attribute vec3 aHeroTarget;
  attribute float aHeroBrightness;
  attribute float aSeed;
  attribute float aWing;
  varying float vAlpha;
  varying float vWingVisibility;
  varying float vSeed;
  varying float vBodyDepth;
  varying float vWingDepth;
  varying float vBreakup;
  varying float vFlowSpeed;
  varying float vHeroBrightness;

  float ease(float x) {
    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
  }

  float smoother(float x) {
    x = clamp(x, 0.0, 1.0);
    return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
  }

  void main() {
    float stagger = clamp((uProgress * 1.22) - (aSeed * 0.22), 0.0, 1.0);
    float p = ease(stagger);
    vec3 positionNow = mix(aScatter, position, p);
    float restless = 1.0 - p;
    positionNow.x += sin(uTime * 0.36 + aSeed * 31.0) * 0.08 * restless;
    positionNow.y += cos(uTime * 0.28 + aSeed * 19.0) * 0.06 * restless;
    positionNow.z += sin(uTime * 0.55 + aSeed * 47.0) * 0.12 * restless;

    // Rotate each wing around its own hinge at the body. The opposing signs
    // make both wings travel through depth together instead of bending a plane.
    if (abs(aWing) > 0.5) {
      float hingeX = aWing * 0.16;
      float wingDistance = abs(positionNow.x - hingeX);
      float span = smoothstep(0.08, 2.45, wingDistance);
      float fore = smoothstep(-0.55, 1.35, positionNow.y);
      float rear = 1.0 - fore;

      // The leading section enters each stroke first. The rear section follows
      // with the same frequency, so the wing stays connected instead of tearing.
      float localPhase = uTime + fore * 0.24 - rear * 0.2 - span * 0.08;
      float strokeWave = sin(localPhase);
      float strokeVelocity = cos(localPhase);
      float cinematicTurn = (sin(localPhase * 3.0) + strokeWave) * 0.055;
      float primaryFlap = (strokeWave + sin(localPhase * 2.0 - 0.35) * 0.075 + cinematicTurn)
        * uFlapEnergy;
      primaryFlap -= max(-strokeWave, 0.0) * 0.045;
      float flapStrength = mix(0.82, 1.0, fore);
      float elasticTwist = sin(localPhase - 0.52) * span * mix(0.035, 0.105, fore);
      float outerFlex = smoothstep(0.16, 1.0, span);
      float rearFlex = mix(0.34, 1.0, rear);
      float downstroke = smoothstep(-0.08, 0.82, -strokeVelocity);
      float sideBase = aWing > 0.5 ? 0.38 : 0.44;
      float sideStrength = aWing > 0.5 ? 1.28 : 1.0;
      float flapDrive = primaryFlap * flapStrength * sideStrength + elasticTwist;
      float softLimit = 1.65;
      float limitRatio = flapDrive / softLimit;
      float softenedDrive = flapDrive / sqrt(1.0 + limitRatio * limitRatio);
      float flexibleLag = strokeVelocity * outerFlex * outerFlex
        * mix(0.035, 0.18, downstroke) * mix(0.7, 1.0, rearFlex);
      float flapAngle = (sideBase + softenedDrive - flexibleLag) * aWing * p;
      float localX = positionNow.x - hingeX;
      float localZ = positionNow.z;

      // The rear wing sits a little closer to the body, as in a real side view.
      if (aWing > 0.5) localX *= 0.94;
      // The source is a top view; mirror its wing span so the wings trail
      // behind the head in the three-quarter flight pose.
      localX *= -1.0;

      positionNow.x = hingeX + localX * cos(flapAngle) + localZ * sin(flapAngle);
      positionNow.z = -localX * sin(flapAngle) + localZ * cos(flapAngle);

      // A butterfly wing is comparatively rigid at its root and leading area.
      // Its outer and rear sections twist later, while the upstroke cups the
      // membrane before it opens out again for the downstroke.
      float strokeAcceleration = -sin(localPhase);
      float upstroke = smoothstep(-0.28, 0.68, strokeVelocity);
      float twistPhase = localPhase - outerFlex * 0.7 - rear * 0.3;
      float twist = sin(twistPhase) * outerFlex * outerFlex * rearFlex;
      float camberStrength = mix(0.09, 0.19, upstroke);
      float cup = upstroke * outerFlex * outerFlex * mix(0.035, 0.11, rear);
      float downstrokeBend = downstroke * outerFlex * outerFlex
        * mix(0.045, 0.14, rearFlex);
      float inertialOvershoot = (strokeAcceleration * 0.065 - strokeVelocity * 0.036)
        * outerFlex * outerFlex * rearFlex;

      positionNow.z += (twist * camberStrength + cup + downstrokeBend + inertialOvershoot) * p;
      positionNow.y += (sin(twistPhase - 0.34) * outerFlex * mix(0.012, 0.058, rear)
        - strokeVelocity * outerFlex * outerFlex * rearFlex * 0.024) * p;
    }

    // The abdomen counters the wing stroke. This shifts mass around the
    // thorax instead of making the complete butterfly behave like a rigid card.
    if (abs(aWing) < 0.5 && positionNow.y < -0.18) {
      float abdomen = smoothstep(0.18, 1.38, -positionNow.y);
      positionNow.z += sin(uTime + 3.14159) * abdomen * 0.065 * p * uFlightBlend;
      positionNow.x += cos(uTime + 3.14159) * abdomen * 0.018 * p * uFlightBlend;
    }
    vBodyDepth = smoothstep(-0.19, 0.19, position.x * 0.84 - position.z * 0.55);
    // Break the silhouette apart while it is still travelling right. Outer
    // wing particles leave first; the denser body is pulled into the gust last.
    float wingSpan = smoothstep(0.16, 2.45, abs(position.x));
    float breakStart = abs(aWing) > 0.5
      ? mix(0.43, 0.0, pow(wingSpan, 1.28)) + aSeed * 0.045
      : 0.4 + aSeed * 0.05;
    float flowClass = fract(aSeed * 13.37);
    float fastLayer = smoothstep(0.72, 1.0, flowClass);
    float slowLayer = 1.0 - smoothstep(0.0, 0.3, flowClass);
    float bodyWeight = abs(aWing) < 0.5
      ? 1.0 - smoothstep(-0.08, 0.3, position.y)
      : 0.0;
    float particleMass = mix(0.58, 1.48, fract(aSeed * 8.71 + 0.19)) + bodyWeight * 0.68;
    float massRatio = clamp((particleMass - 0.58) / 1.58, 0.0, 1.0);
    float wingMomentum = abs(aWing) > 0.5 ? wingSpan * -cos(uTime) : 0.0;
    float wingMomentumStrength = abs(wingMomentum);
    breakStart += slowLayer * 0.025 - fastLayer * 0.035;
    float breakup = smoother((uDissolve - breakStart) / (1.0 - breakStart));
    // Heavier particles resist the wind longer and accelerate into the turn
    // later. They still reach the same final state when breakup reaches one.
    float flowExponent = abs(aWing) > 0.5
      ? mix(0.72, 0.94, massRatio)
      : mix(0.78, 0.98, massRatio);
    float flowProgress = pow(breakup, flowExponent);
    vec4 worldPosition = modelMatrix * vec4(positionNow, 1.0);
    // The loose cloud begins in the screen centre. Its offset fades per
    // particle as the form travels into the butterfly waiting on the left.
    worldPosition.xyz += uScatterWorldOffset * (1.0 - p);
    // The intact remainder never parks at the group's endpoint. It keeps the
    // incoming velocity and is only gradually bent back by the magnetic flow.
    float residualInertia = uDissolve * (1.0 - breakup);
    worldPosition.x += residualInertia * (0.26 + massRatio * 0.18 + bodyWeight * 0.18);
    worldPosition.y -= residualInertia * bodyWeight * 0.06;
    vec3 streamStart = worldPosition.xyz;
    float route = smoother(flowProgress);
    float side = aSeed > 0.5 ? 1.0 : -1.0;
    vec3 inheritedMotion = uFlightVelocity * sin(route * 3.14159) * 0.16;
    vec3 controlPoint = mix(streamStart, aHeroTarget, 0.46) + vec3(
      0.5 + fastLayer * 0.52 + wingMomentumStrength * 0.18,
      side * (0.18 + aSeed * 0.52) + wingMomentum * 0.16,
      sin(aSeed * 31.0) * (0.3 + fastLayer * 0.42)
    ) + inheritedMotion;
    vec3 firstLeg = mix(streamStart, controlPoint, route);
    vec3 secondLeg = mix(controlPoint, aHeroTarget, route);
    worldPosition.xyz = mix(firstLeg, secondLeg, route);

    vec4 mvPosition = viewMatrix * worldPosition;
    vBreakup = breakup;
    vFlowSpeed = fastLayer;
    vWingDepth = abs(aWing) > 0.5 ? smoothstep(-9.45, -6.55, mvPosition.z) : 1.0;
    gl_Position = projectionMatrix * mvPosition;
    float depthSize = mix(1.0, mix(0.62, 1.2, vBodyDepth), uBodyDepthEffect);
    float wingDepthSize = abs(aWing) > 0.5 ? mix(0.68, 1.18, vWingDepth) : 1.0;
    float streakSize = 1.0 + breakup * (1.0 - breakup) * fastLayer * 0.62;
    float heroSize = mix(0.42, 0.7, aHeroBrightness);
    gl_PointSize = uPointSize * depthSize * wingDepthSize * streakSize
      * mix(1.0, heroSize, breakup) * uPixelRatio * (8.0 / -mvPosition.z);
    float butterflyAlpha = mix(0.46, 0.96, p) * (0.78 + aSeed * 0.22);
    vAlpha = mix(butterflyAlpha, mix(0.48, 0.96, aHeroBrightness), breakup);
    vWingVisibility = aWing > 0.5 ? 0.78 : 1.0;
    vSeed = aSeed;
    vHeroBrightness = aHeroBrightness;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vWingVisibility;
  varying float vSeed;
  varying float vWingDepth;
  varying float vBreakup;
  varying float vFlowSpeed;
  varying float vHeroBrightness;
  void main() {
    vec2 center = gl_PointCoord - 0.5;
    float circle = 1.0 - smoothstep(0.24, 0.5, length(center));
    float streak = 1.0 - smoothstep(0.2, 0.5, length(vec2(center.x * 0.28, center.y)));
    float softCircle = mix(circle, streak, vBreakup * (1.0 - vBreakup) * vFlowSpeed * 0.42);
    if (softCircle < 0.01) discard;

    float shapedDepth = pow(vWingDepth, 0.72);
    float density = mix(0.36, 0.98, shapedDepth);
    float densityMask = mix(smoothstep(vSeed - 0.09, vSeed + 0.065, density), 1.0, vBreakup);
    if (densityMask < 0.01) discard;

    float highlight = exp(-pow((vWingDepth - 0.8) / 0.17, 2.0));
    float butterflyLuminance = min(1.0, mix(0.46, 0.98, shapedDepth) + highlight * 0.16);
    float luminance = mix(butterflyLuminance, mix(0.46, 1.0, vHeroBrightness), vBreakup);
    float depthAlpha = mix(0.72, 1.16, shapedDepth);
    gl_FragColor = vec4(
      vec3(luminance),
      softCircle * vAlpha * vWingVisibility * densityMask * depthAlpha
    );
  }
`;

const bodyFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vWingVisibility;
  varying float vSeed;
  varying float vBodyDepth;
  varying float vWingDepth;
  varying float vBreakup;
  varying float vHeroBrightness;
  void main() {
    float shapedDepth = pow(vBodyDepth, 0.72);
    float density = mix(0.19, 0.99, shapedDepth);
    if (vSeed > mix(density, 1.0, vBreakup)) discard;

    vec2 center = abs(gl_PointCoord - 0.5);
    float pixelDash = 1.0 - smoothstep(0.39, 0.5, max(center.x * 0.58, center.y));
    float circle = 1.0 - smoothstep(0.24, 0.5, length(center));
    float pointShape = mix(pixelDash, circle, vBreakup);
    if (pointShape < 0.01) discard;

    float bodyShadow = exp(-pow((vBodyDepth - 0.3) / 0.24, 2.0));
    float highlight = exp(-pow((vBodyDepth - 0.78) / 0.14, 2.0));
    float luminance = mix(0.055, 0.5, shapedDepth) - bodyShadow * 0.045 + highlight * 0.14;
    luminance = mix(clamp(luminance, 0.035, 0.64), mix(0.32, 0.98, vHeroBrightness), vBreakup);
    float solidAlpha = min(0.9, vAlpha * mix(0.38, 0.94, shapedDepth)) * pointShape;
    gl_FragColor = vec4(vec3(luminance), solidAlpha);
  }
`;

type Uniforms = {
  uTime: { value: number };
  uProgress: { value: number };
  uPixelRatio: { value: number };
  uPointSize: { value: number };
  uBodyDepthEffect: { value: number };
  uFlapEnergy: { value: number };
  uFlightBlend: { value: number };
  uDissolve: { value: number };
  uSceneTime: { value: number };
  uVortexCenter: { value: THREE.Vector3 };
  uScatterWorldOffset: { value: THREE.Vector3 };
  uFlightVelocity: { value: THREE.Vector3 };
};

function createParticleData(image: HTMLImageElement, profile: PerformanceProfile) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");
  const cropHeight = Math.min(246, image.naturalHeight);
  canvas.width = image.naturalWidth;
  canvas.height = cropHeight;
  context.drawImage(image, 0, 0, image.naturalWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates: Array<[number, number, number]> = [];

  for (let y = 2; y < canvas.height - 2; y += 1) {
    for (let x = 2; x < canvas.width - 2; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const distanceFromWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
      const distanceFromCenter = Math.abs(x - canvas.width * 0.5);
      const isOriginalBody = y > 96 && distanceFromCenter < 19;
      const isOriginalAntenna = y <= 125 && distanceFromCenter < 42;
      if (distanceFromWhite > 48 && !isOriginalBody && !isOriginalAntenna) {
        candidates.push([x, y, Math.min(1, distanceFromWhite / 270)]);
      }
    }
  }

  const { particleCount, bodyParticleCount, antennaParticleCount } = profile;
  const target = new Float32Array(particleCount * 3);
  const scatter = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  const wings = new Float32Array(particleCount);
  const height = 4.5;
  const width = height * (canvas.width / canvas.height);

  for (let i = 0; i < particleCount; i += 1) {
    const offset = i * 3;

    if (i < bodyParticleCount) {
      const alongBody = Math.random();
      const angleAroundBody = Math.random() * Math.PI * 2;
      const filledRadius = 0.34 + Math.pow(Math.random(), 0.34) * 0.66;
      const abdomen = Math.pow(Math.sin(alongBody * Math.PI), 0.72) * 0.12;
      const thorax = Math.exp(-Math.pow((alongBody - 0.7) / 0.13, 2)) * 0.13;
      const head = Math.exp(-Math.pow((alongBody - 0.94) / 0.065, 2)) * 0.105;
      const bodyRadius = (0.045 + abdomen + thorax + head) * filledRadius;
      target[offset] = Math.cos(angleAroundBody) * bodyRadius;
      target[offset + 1] = -1.42 + alongBody * 1.78;
      target[offset + 2] = Math.sin(angleAroundBody) * bodyRadius * 1.28;
      wings[i] = 0;
    } else if (i < bodyParticleCount + antennaParticleCount) {
      const antennaIndex = i - bodyParticleCount;
      const side = antennaIndex % 2 === 0 ? -1 : 1;
      const progressAlongAntenna = Math.floor(antennaIndex / 2) / (antennaParticleCount / 2 - 1);
      const jitter = (Math.random() - 0.5) * 0.014;
      target[offset] = side * (0.025 + progressAlongAntenna * 0.035) + jitter;
      target[offset + 1] = 0.31 + progressAlongAntenna * 0.78 + jitter;
      target[offset + 2] = -Math.sin(progressAlongAntenna * Math.PI) * 0.2
        - progressAlongAntenna * 0.09 + side * 0.018 + jitter;
      wings[i] = 0;
    } else {
      const [pixelX, pixelY, ink] = candidates[Math.floor(Math.random() * candidates.length)];
      target[offset] = ((pixelX + Math.random() - 0.5) / canvas.width - 0.5) * width;
      target[offset + 1] = (0.5 - (pixelY + Math.random() - 0.5) / canvas.height) * height;
      target[offset + 2] = (Math.random() - 0.5) * (0.025 + (1 - ink) * 0.055);
      wings[i] = Math.abs(target[offset]) < 0.16 ? 0 : Math.sign(target[offset]);
    }

    const angle = Math.random() * Math.PI * 2;
    const radius = 2.2 + Math.pow(Math.random(), 0.48) * 5.8;
    scatter[offset] = Math.cos(angle) * radius;
    scatter[offset + 1] = Math.sin(angle) * radius * 0.62;
    scatter[offset + 2] = (Math.random() - 0.5) * 4.0;
    seeds[i] = Math.random();
  }
  return { target, scatter, seeds, wings };
}

function createHeroTargets(image: HTMLImageElement, count: number) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates: Array<[number, number, number]> = [];

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      const luminance = (pixels[offset] * 0.2126 + pixels[offset + 1] * 0.7152
        + pixels[offset + 2] * 0.0722) / 255;
      if (luminance > 0.09 && Math.random() < Math.pow(luminance, 0.7) * 0.5) {
        candidates.push([x, y, luminance]);
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const swapIndex = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[swapIndex]] = [candidates[swapIndex], candidates[i]];
  }

  const targets = new Float32Array(count * 3);
  const targetBrightness = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const [x, y, luminance] = candidates[i % candidates.length];
    const nx = x / canvas.width;
    const ny = y / canvas.height;
    const foreground = THREE.MathUtils.smoothstep(ny, 0.48, 1);
    const farField = 1 - THREE.MathUtils.smoothstep(ny, 0.22, 0.72);
    const offset = i * 3;
    targets[offset] = (nx - 0.5) * 10.82 + (Math.random() - 0.5) * 0.012;
    targets[offset + 1] = (0.5 - ny) * 6.18 + (Math.random() - 0.5) * 0.012;
    targets[offset + 2] = foreground * 0.42 - farField * 0.64
      + (Math.random() - 0.5) * THREE.MathUtils.lerp(0.2, 0.045, luminance);
    targetBrightness[i] = luminance;
  }
  return { targets, targetBrightness };
}

export function ButterflyExperience() {
  const shellRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const principleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const calloutRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const resolutionRef = useRef<HTMLDivElement>(null);
  const approachRef = useRef<HTMLElement>(null);
  const caseGlowRef = useRef<HTMLDivElement>(null);
  const caseWorldRef = useRef<HTMLDivElement>(null);
  const caseSurfaceRef = useRef<HTMLDivElement>(null);
  const caseCopyPlaneRef = useRef<HTMLElement>(null);
  const caseScreenRef = useRef<HTMLDivElement>(null);
  const flowGridRef = useRef<HTMLDivElement>(null);
  const flowPromptRef = useRef<HTMLDivElement>(null);
  const flowPromptTextRef = useRef<HTMLSpanElement>(null);
  const flowNodeRefs = useRef<Array<HTMLDivElement | null>>([]);
  const flowEdgeRefs = useRef<Array<SVGPathElement | null>>([]);
  const flowPulseRefs = useRef<Array<SVGCircleElement | null>>([]);
  const flowToolbarRef = useRef<HTMLDivElement>(null);
  const flowRunRef = useRef<HTMLButtonElement>(null);
  const flowResultRef = useRef<HTMLDivElement>(null);
  const caseIndexRef = useRef<HTMLSpanElement>(null);
  const caseTitleRef = useRef<HTMLHeadingElement>(null);
  const caseDescriptionRef = useRef<HTMLParagraphElement>(null);
  const caseMetaRef = useRef<HTMLSpanElement>(null);
  const walkVeilRef = useRef<HTMLDivElement>(null);
  const caseTwoRef = useRef<HTMLElement>(null);
  const caseThreeRef = useRef<HTMLElement>(null);
  const dawnSkyRef = useRef<HTMLDivElement>(null);
  const dawnRef = useRef({ value: 0 });
  const uniformsRef = useRef<Uniforms | null>(null);
  const progressRef = useRef({ value: 0 });
  const flightRef = useRef({ value: 0 });
  const dissolveRef = useRef({ value: 0 });
  const scrollRef = useRef({ value: 0 });
  const sequenceRef = useRef<gsap.core.Timeline | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const playSequence = useCallback((delay = 0) => {
    sequenceRef.current?.kill();
    progressRef.current.value = 0;
    flightRef.current.value = 0;
    dissolveRef.current.value = 0;
    setProgress(0);

    const timeline = gsap.timeline({
      delay,
      onUpdate: () => setProgress(timeline.progress()),
    });

    sequenceRef.current = timeline
      .to(progressRef.current, {
        value: 1, duration: 4.8, ease: "power3.inOut",
      })
      .to(flightRef.current, {
        value: 0.22, duration: 0.65, ease: "none",
      }, 2.58)
      .to(flightRef.current, {
        value: 1, duration: 2.3, ease: "none",
      }, 3.23)
      .to(dissolveRef.current, {
        value: 1, duration: 2.95, ease: "none",
      }, 4.2);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    const stage = stageRef.current;
    if (!shell || !stage) return;

    gsap.registerPlugin(ScrollTrigger);
    const storyScrollDistance = () => Math.max(
      window.innerHeight,
      Math.min(shell.offsetHeight, window.innerHeight * 21.95) - window.innerHeight * 2.1,
    );
    const animationEnd = () => `+=${storyScrollDistance()}`;
    const select = gsap.utils.selector(stage);
    const timelineClock = { value: 0 };
    const scrollTween = gsap.to(scrollRef.current, {
      value: 2.22,
      ease: "none",
      scrollTrigger: {
        trigger: shell,
        start: "top top",
        end: animationEnd,
        scrub: 1.1,
      },
    });

    const moexActionPoint = () => {
      const terminal = stage.querySelector<HTMLElement>(".moex-terminal");
      const action = stage.querySelector<HTMLElement>(".moex-sidebar__action");
      if (!terminal || !action) return { x: 80, y: 170, width: 900, height: 600 };
      const terminalBounds = terminal.getBoundingClientRect();
      const actionBounds = action.getBoundingClientRect();
      return {
        x: actionBounds.left - terminalBounds.left + actionBounds.width * 0.58,
        y: actionBounds.top - terminalBounds.top + actionBounds.height * 0.52,
        width: terminalBounds.width,
        height: terminalBounds.height,
      };
    };
    const moexTracePoint = () => {
      const dashboard = stage.querySelector<HTMLElement>(".moex-dashboard");
      const trades = stage.querySelector<HTMLElement>(".moex-trades-view");
      const trade = stage.querySelector<HTMLElement>(".moex-trades-view__selected");
      if (!dashboard || !trades || !trade) return { x: 450, y: 190 };
      return {
        x: dashboard.offsetLeft + trades.offsetLeft + trade.offsetLeft + trade.offsetWidth * 0.33,
        y: dashboard.offsetTop + trades.offsetTop + trade.offsetTop + trade.offsetHeight * 0.5,
      };
    };
    const canTurnMoex = () => window.innerWidth > 760
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const moexTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: shell,
        start: () => `top+=${storyScrollDistance()} top`,
        end: () => `top+=${storyScrollDistance() + window.innerHeight * 5.8} top`,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });
    moexTimeline
      .fromTo(select(".moex-demo-cursor"),
        { opacity: 0, x: () => moexActionPoint().x + moexActionPoint().width * 0.46, y: () => moexActionPoint().y - moexActionPoint().height * 0.18 },
        { opacity: 1, x: () => moexActionPoint().x - 2.5, y: () => moexActionPoint().y - 2, duration: 1.1, ease: "power2.inOut" }, 0.1)
      .set(select(".moex-demo-click"), { x: () => moexActionPoint().x - 11, y: () => moexActionPoint().y - 11 }, 0)
      .to(select(".moex-sidebar nav > div.is-active"), { backgroundColor: "transparent", borderColor: "transparent", duration: 0.18 }, 1.18)
      .to(select(".moex-sidebar__action"), { backgroundColor: "#2d493b", borderColor: "#8acbab", color: "#f0fff5", duration: 0.16 }, 1.18)
      .to(select(".moex-sidebar__action"), { backgroundColor: "#222c26", borderColor: "#4a755b", color: "#e4f7e9", duration: 0.32 }, 1.37)
      .fromTo(select(".moex-demo-click"), { opacity: 0, scale: 0.55 }, { opacity: 0.9, scale: 1.15, duration: 0.19 }, 1.18)
      .to(select(".moex-demo-click"), { opacity: 0, scale: 2.2, duration: 0.35 }, 1.37)
      .fromTo(select(".moex-demo-flash"), { opacity: 0 }, { opacity: 0.24, duration: 0.13 }, 1.36)
      .to(select(".moex-demo-flash"), { opacity: 0, duration: 0.42 }, 1.49)
      .fromTo(select(".moex-terminal"),
        { transformPerspective: 1600, rotationY: () => canTurnMoex() ? -2.6 : 0, rotationX: () => canTurnMoex() ? 0.7 : 0, rotation: 0, x: 0, y: 0 },
        { rotationY: () => canTurnMoex() ? 3.1 : 0, rotationX: () => canTurnMoex() ? -0.6 : 0, rotation: () => canTurnMoex() ? -0.35 : 0, x: () => canTurnMoex() ? 8 : 0, y: () => canTurnMoex() ? -4 : 0, duration: 1.05, ease: "power2.inOut" }, 1.28)
      .to(select(".moex-terminal"), { rotationY: () => canTurnMoex() ? 2.1 : 0, rotationX: () => canTurnMoex() ? -0.35 : 0, rotation: () => canTurnMoex() ? -0.15 : 0, duration: 0.45, ease: "power2.out" }, 2.33)
      .to(select(".moex-heartbeats"), { opacity: 0, y: -10, duration: 0.26, ease: "power2.in" }, 1.38)
      .to(select(".moex-dashboard__summary"), { opacity: 0, y: -20, scale: 0.97, duration: 0.45, ease: "power2.inOut" }, 1.4)
      .to(select(".moex-dashboard__main"), { opacity: 0, y: -24, scale: 0.98, duration: 0.48, ease: "power2.inOut" }, 1.48)
      .to(select(".moex-dashboard__bottom"), { opacity: 0, y: -20, scale: 0.98, duration: 0.46, ease: "power2.inOut" }, 1.56)
      .to(select(".moex-crumb-overview"), { opacity: 0, y: -7, duration: 0.23 }, 1.5)
      .fromTo(select(".moex-crumb-trades"), { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }, 1.68)
      .to(select(".moex-trades-view"), { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" }, 1.6)
      .fromTo(select(".moex-trades-view__toolbar, .moex-trades-view__columns"), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.48, stagger: 0.13, ease: "power2.out" }, 1.74)
      .fromTo(select(".moex-trades-view__row"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.52, stagger: 0.13, ease: "power2.out" }, 2.06)
      .to(select(".moex-demo-cursor"), { x: () => moexTracePoint().x - 2.5, y: () => moexTracePoint().y - 2, duration: 0.88, ease: "power2.inOut" }, 3.33)
      .to(select(".moex-trades-view__selected"), { backgroundColor: "#1c3026", duration: 0.23 }, 4.12)
      .set(select(".moex-demo-click"), { x: () => moexTracePoint().x - 11, y: () => moexTracePoint().y - 11 }, 4.1)
      .fromTo(select(".moex-demo-click"), { opacity: 0, scale: 0.55 }, { opacity: 0.9, scale: 1.15, duration: 0.18 }, 4.18)
      .to(select(".moex-demo-click"), { opacity: 0, scale: 2.2, duration: 0.35 }, 4.36)
      .to(select(".moex-sidebar__action"), { backgroundColor: "transparent", borderColor: "transparent", color: "#a5aaaa", duration: 0.22 }, 4.42)
      .to(select(".moex-sidebar__reasoning"), { backgroundColor: "#222c26", borderColor: "#4a755b", color: "#e4f7e9", duration: 0.3 }, 4.46)
      .to(select(".moex-crumb-trades"), { opacity: 0, y: -7, duration: 0.2 }, 4.4)
      .fromTo(select(".moex-crumb-trace"), { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, 4.55)
      .to(select(".moex-trades-view"), { autoAlpha: 0, y: -12, duration: 0.34, ease: "power2.inOut" }, 4.4)
      .fromTo(select(".moex-trace-view"), { autoAlpha: 0, y: 13 }, { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out" }, 4.57)
      .fromTo(select(".moex-trace-view__hero"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" }, 4.67)
      .fromTo(select(".moex-trace-step"), { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.34, stagger: 0.17, ease: "power2.out" }, 4.91)
      .fromTo(select(".moex-trace-card"), { opacity: 0, x: 13 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.16, ease: "power2.out" }, 5.03)
      .to(select(".moex-demo-cursor"), { opacity: 0, duration: 0.3 }, 5.45);

    // Dawn: from case 02 to case 03. The render loop reads this progress and
    // drives the camera, the sky and both case screens from it.
    const thirdCaseTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: shell,
        start: () => `top+=${storyScrollDistance() + window.innerHeight * 6.0} top`,
        end: () => `top+=${storyScrollDistance() + window.innerHeight * 11.4} top`,
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });
    thirdCaseTimeline.to(dawnRef.current, { value: 1, duration: 1, ease: "none" });

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        scrollTrigger: {
          trigger: shell,
          start: "top top",
          end: animationEnd,
          scrub: 1.1,
        },
      });

      timeline
        .to(select(".hero-plane"), { scale: 6.2, xPercent: 8, yPercent: -3, duration: 28, ease: "power2.in" }, 7)
        .to(select(".hero-plane"), { opacity: 0, duration: 7, ease: "power3.in" }, 30);

      const frictionWords = select(".problem-word");
      const wordOpacity = [0.94, 0.76, 0.56, 0.76, 0.56, 0.94, 0.76, 0.56, 0.76, 0.94];
      frictionWords.forEach((word, index) => {
        const at = 45 + index * 3.6;
        const exitsLeft = index % 2 === 0;
        timeline
          .fromTo(
            word,
            { opacity: 0, z: -1120, scale: 0.6 },
            { opacity: wordOpacity[index], z: -330, scale: 0.96, duration: 6.5, ease: "power2.out" },
            at,
          )
          .to(
            word,
            {
              z: 620,
              scale: index % 5 === 0 ? 2.65 : 2.1,
              xPercent: exitsLeft ? -48 : 48,
              yPercent: index % 2 ? -18 : 18,
              opacity: 0,
              duration: 8.5,
              ease: "power2.in",
            },
            at + 6.2,
          );
      });

      timeline
        .to(select(".architecture-map"), { opacity: 1, scale: 1, duration: 10 }, 91)
        .to(select(".architecture-map path"), { strokeDashoffset: 0, stagger: 0.7, duration: 8, ease: "power2.out" }, 93)
        .to(select(".architecture-label"), { opacity: 1, scale: 1, stagger: 0.55, duration: 5 }, 96);

      const doctrine = select(".approach-beat");
      doctrine.forEach((item, index) => {
        const at = 105 + index * 8;
        timeline
          .fromTo(item, { opacity: 0, yPercent: 22 }, { opacity: 1, yPercent: 0, duration: 4 }, at)
          .to(item, { opacity: 0, yPercent: -22, duration: 4 }, at + 4.5);
      });

      timeline
        .to(select(".architecture-map"), { opacity: 0, scale: 1.08, duration: 9 }, 122)
        .fromTo(
          select(".approach-index"),
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 7 },
          137,
        )
        .to(
          select(".approach-index, .architecture-map"),
          { opacity: 0, yPercent: -8, duration: 9, ease: "power2.inOut" },
          160,
        )
        // Keep the original scene timings aligned while scrollRef grows:
        // the timeline total (169 + duration) scales with the scroll range
        // (334.6 at 1.98 → 375.2 at 2.22 for the walker flight).
        .to(timelineClock, { value: 1, duration: 206.2, ease: "none" }, 169);
    }, stage);

    return () => {
      context.revert();
      scrollTween.kill();
      moexTimeline.scrollTrigger?.kill();
      moexTimeline.kill();
      thirdCaseTimeline.scrollTrigger?.kill();
      thirdCaseTimeline.kill();
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const performanceProfile = getPerformanceProfile();
    const {
      particleCount,
      bodyParticleCount,
      antennaParticleCount,
      trailParticleCount,
      tunnelParticleCount,
      pixelRatioCap,
      columnSampleWidth,
    } = performanceProfile;
    const pixelRatio = () => Math.min(window.devicePixelRatio, pixelRatioCap);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.z = 8;
    scene.add(camera);
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(pixelRatio());
    mount.appendChild(renderer.domElement);
    const group = new THREE.Group();
    scene.add(group);

    const tunnelCount = tunnelParticleCount;
    const tunnelPositions = new Float32Array(tunnelCount * 3);
    const tunnelSeeds = new Float32Array(tunnelCount);
    for (let i = 0; i < tunnelCount; i += 1) {
      const offset = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.45 + Math.pow(Math.random(), 0.72) * 8.4;
      tunnelPositions[offset] = Math.cos(angle) * radius * 1.42;
      tunnelPositions[offset + 1] = Math.sin(angle) * radius * 0.78;
      tunnelPositions[offset + 2] = -(Math.random() * 34);
      tunnelSeeds[i] = Math.random();
    }
    const tunnelGeometry = new THREE.BufferGeometry();
    tunnelGeometry.setAttribute("position", new THREE.BufferAttribute(tunnelPositions, 3));
    tunnelGeometry.setAttribute("aSeed", new THREE.BufferAttribute(tunnelSeeds, 1));
    const tunnelUniforms = {
      uTravel: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: pixelRatio() },
    };
    const tunnelMaterial = new THREE.ShaderMaterial({
      uniforms: tunnelUniforms,
      vertexShader: /* glsl */ `
        uniform float uTravel;
        uniform float uPixelRatio;
        attribute float aSeed;
        varying float vAlpha;

        void main() {
          vec3 point = position;
          float depth = mod((-position.z) - uTravel * 48.0 + 34.0, 34.0);
          point.z = -4.0 - depth;
          vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          float proximity = clamp(7.0 / max(1.0, -viewPosition.z), 0.34, 2.5);
          gl_PointSize = mix(0.72, 1.72, aSeed) * uPixelRatio * proximity;
          vAlpha = mix(0.24, 0.78, aSeed) * smoothstep(34.0, 3.0, depth);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vAlpha;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float distanceToCenter = length(center);
          float dotAlpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
          gl_FragColor = vec4(vec3(0.84, 0.88, 0.9), dotAlpha * vAlpha * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });
    const tunnelPoints = new THREE.Points(tunnelGeometry, tunnelMaterial);
    tunnelPoints.frustumCulled = false;
    tunnelPoints.renderOrder = 0;
    scene.add(tunnelPoints);

    const walkScene = createWalkScene(performanceProfile, pixelRatio());
    scene.add(walkScene.group);

    // Invisible body volume: it writes only to the depth buffer, so wing
    // particles disappear naturally when they pass behind the thorax.
    const occluderMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      depthTest: true,
    });
    const torsoOccluderGeometry = new THREE.CapsuleGeometry(0.088, 1.39, 6, 12);
    const torsoOccluder = new THREE.Mesh(torsoOccluderGeometry, occluderMaterial);
    torsoOccluder.position.y = -0.52;
    torsoOccluder.renderOrder = -1;
    group.add(torsoOccluder);

    const headOccluderGeometry = new THREE.SphereGeometry(0.09, 16, 12);
    const headOccluder = new THREE.Mesh(headOccluderGeometry, occluderMaterial);
    headOccluder.position.y = 0.265;
    headOccluder.renderOrder = -1;
    group.add(headOccluder);
    const profileMatrix = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(-0.341, 0.429, 0.836),
      new THREE.Vector3(0.783, 0.622, 0),
      new THREE.Vector3(-0.52, 0.655, -0.548),
    );
    const profileOrientation = new THREE.Quaternion().setFromRotationMatrix(profileMatrix);
    const clock = new THREE.Clock();
    const flightRotation = new THREE.Quaternion();
    const targetOrientation = new THREE.Quaternion();
    const flightEuler = new THREE.Euler();
    const cameraTarget = new THREE.Vector3();
    const previousPosition = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const smoothedFlightVelocity = new THREE.Vector3();
    const capturedDissolveVelocity = new THREE.Vector3();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let bodyGeometry: THREE.BufferGeometry | null = null;
    let bodyMaterial: THREE.ShaderMaterial | null = null;
    let antennaGeometry: THREE.BufferGeometry | null = null;
    let antennaMaterial: THREE.ShaderMaterial | null = null;
    let trailGeometry: THREE.BufferGeometry | null = null;
    let trailMaterial: THREE.PointsMaterial | null = null;
    let trailPoints: THREE.Points | null = null;
    let columnGeometry: THREE.BufferGeometry | null = null;
    let columnMaterial: THREE.ShaderMaterial | null = null;
    let columnPoints: THREE.Points | null = null;
    let butterflyParticleData: ReturnType<typeof createParticleData> | null = null;
    const columnUniforms = {
      uOpacity: { value: 0 },
      uLeftBuild: { value: 0 },
      uCenterBuild: { value: 0 },
      uRightBuild: { value: 0 },
      uMorph: { value: 0 },
      uTime: { value: 0 },
      uFinalFlight: { value: 0 },
      uButterflyCenter: { value: new THREE.Vector2(1.2, 0.18) },
      uPixelRatio: { value: pixelRatio() },
    };
    let trailPositions: Float32Array | null = null;
    let trailColors: Float32Array | null = null;
    let trailPositionAttribute: THREE.BufferAttribute | null = null;
    let trailColorAttribute: THREE.BufferAttribute | null = null;
    let trailSources: number[] = [];
    let trailSourceData: Float32Array | null = null;
    const trailVelocity = new Float32Array(trailParticleCount * 3);
    const trailLife = new Float32Array(trailParticleCount);
    const trailSeed = new Float32Array(trailParticleCount);
    const trailSourcePosition = new THREE.Vector3();
    let trailCursor = 0;
    let trailAccumulator = 0;
    let previousFlight = 0;
    let hasCapturedDissolveVelocity = false;
    let frame = 0;
    let sceneTime = 0;
    let wingPhase = 0;
    let disposed = false;

    const syncColumnButterflyTargets = () => {
      if (!columnGeometry || !butterflyParticleData) return;
      const columnCount = columnGeometry.getAttribute("position").count;
      const targets = new Float32Array(columnCount * 3);
      const wings = new Float32Array(columnCount);
      for (let i = 0; i < columnCount; i += 1) {
        const sourceIndex = Math.min(
          particleCount - 1,
          Math.floor(i * particleCount / columnCount),
        );
        const sourceOffset = sourceIndex * 3;
        const targetOffset = i * 3;
        targets[targetOffset] = butterflyParticleData.target[sourceOffset];
        targets[targetOffset + 1] = butterflyParticleData.target[sourceOffset + 1];
        targets[targetOffset + 2] = butterflyParticleData.target[sourceOffset + 2];
        wings[i] = butterflyParticleData.wings[sourceIndex];
      }
      columnGeometry.setAttribute("aButterflyTarget", new THREE.BufferAttribute(targets, 3));
      columnGeometry.setAttribute("aButterflyWing", new THREE.BufferAttribute(wings, 1));
    };

    const layoutColumns = () => {
      if (!columnPoints) return;
      const distance = 4;
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance;
      const viewWidth = viewHeight * camera.aspect;
      columnPoints.scale.setScalar(viewHeight);
      columnPoints.position.set(-viewWidth * 0.465, 0, -distance);
      columnUniforms.uButterflyCenter.value.set(camera.aspect * 0.69, 0.18);
    };
    const stageSize = { width: 1, height: 1 };
    const resize = () => {
      stageSize.width = mount.clientWidth;
      stageSize.height = mount.clientHeight;
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      const nextPixelRatio = pixelRatio();
      renderer.setPixelRatio(nextPixelRatio);
      tunnelUniforms.uPixelRatio.value = nextPixelRatio;
      columnUniforms.uPixelRatio.value = nextPixelRatio;
      walkScene.setPixelRatio(nextPixelRatio);
      if (uniformsRef.current) uniformsRef.current.uPixelRatio.value = nextPixelRatio;
      layoutColumns();
    };
    const image = new Image();
    const heroImage = new Image();
    const columnsImage = new Image();
    image.decoding = "async";
    heroImage.decoding = "async";
    columnsImage.decoding = "async";
    let columnsLoadTimer = 0;
    columnsImage.onload = () => {
      if (disposed) return;
      const sampleCanvas = document.createElement("canvas");
      const sampleWidth = Math.min(columnSampleWidth, columnsImage.naturalWidth);
      const sampleHeight = Math.round(sampleWidth * columnsImage.naturalHeight / columnsImage.naturalWidth);
      sampleCanvas.width = sampleWidth;
      sampleCanvas.height = sampleHeight;
      const context = sampleCanvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(columnsImage, 0, 0, sampleWidth, sampleHeight);
      const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
      const positions: number[] = [];
      const brightness: number[] = [];
      const columnIds: number[] = [];
      const buildOrder: number[] = [];
      const columnSeeds: number[] = [];
      const imageAspect = sampleWidth / sampleHeight;

      for (let y = 0; y < sampleHeight; y += 1) {
        for (let x = 0; x < sampleWidth; x += 1) {
          const pixel = (y * sampleWidth + x) * 4;
          const luminance = (pixels[pixel] * 0.2126 + pixels[pixel + 1] * 0.7152
            + pixels[pixel + 2] * 0.0722) / 255;
          if (luminance < 0.19 || Math.random() > THREE.MathUtils.lerp(0.38, 0.94, luminance)) continue;
          const normalizedX = x / sampleWidth;
          const normalizedY = y / sampleHeight;
          positions.push(normalizedX * imageAspect, 0.5 - normalizedY, 0);
          brightness.push(THREE.MathUtils.smoothstep(luminance, 0.16, 0.78));
          columnIds.push(normalizedX < 0.36 ? 0 : normalizedX < 0.68 ? 1 : 2);
          buildOrder.push(1 - normalizedY);
          columnSeeds.push(Math.random());
        }
      }

      columnGeometry = new THREE.BufferGeometry();
      columnGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      columnGeometry.setAttribute("aBrightness", new THREE.Float32BufferAttribute(brightness, 1));
      columnGeometry.setAttribute("aColumnId", new THREE.Float32BufferAttribute(columnIds, 1));
      columnGeometry.setAttribute("aBuildOrder", new THREE.Float32BufferAttribute(buildOrder, 1));
      columnGeometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(columnSeeds, 1));
      columnGeometry.setAttribute("aButterflyTarget", new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
      columnGeometry.setAttribute("aButterflyWing", new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3), 1));
      syncColumnButterflyTargets();
      columnMaterial = new THREE.ShaderMaterial({
        uniforms: columnUniforms,
        vertexShader: /* glsl */ `
          uniform float uPixelRatio;
          uniform float uLeftBuild;
          uniform float uCenterBuild;
          uniform float uRightBuild;
          uniform float uMorph;
          uniform float uTime;
          uniform float uFinalFlight;
          uniform vec2 uButterflyCenter;
          attribute float aBrightness;
          attribute float aColumnId;
          attribute float aBuildOrder;
          attribute float aSeed;
          attribute vec3 aButterflyTarget;
          attribute float aButterflyWing;
          varying float vBrightness;
          varying float vAlpha;
          varying float vButterflyDepth;
          varying float vButterflyBody;
          varying float vWingOcclusion;
          varying float vFlightVisibility;

          void main() {
            float isLeftColumn = 1.0 - step(0.5, aColumnId);
            float isCenterColumn = 1.0 - step(0.5, abs(aColumnId - 1.0));
            float isRightColumn = step(1.5, aColumnId);
            float leftThreshold = aBuildOrder * 0.78 + aSeed * 0.08;
            float leftBuild = smoothstep(leftThreshold, leftThreshold + 0.14, uLeftBuild);
            float leftBand = exp(-abs(uLeftBuild - leftThreshold) * 22.0);

            vec3 foundation = vec3(
              position.x + (aSeed - 0.5) * 0.24,
              -0.53 - aSeed * 0.055,
              (aSeed - 0.5) * 0.34
            );
            vec3 leftPoint = mix(foundation, position, leftBuild);
            leftPoint.x += sin(aSeed * 47.0 + leftBuild * 3.14159) * (1.0 - leftBuild) * 0.025;
            leftPoint.y += sin(leftBuild * 3.14159) * leftBand * 0.016;
            leftPoint.z += leftBand * 0.055;

            float centerThreshold = aSeed * 0.34 + (1.0 - aBuildOrder) * 0.18;
            float centerBuild = smoothstep(centerThreshold, centerThreshold + 0.22, uCenterBuild);
            float centerEase = centerBuild * centerBuild * (3.0 - 2.0 * centerBuild);
            float centerBand = exp(-abs(uCenterBuild - centerThreshold) * 15.0);
            float axisX = 0.395;
            vec3 depthOrigin = vec3(
              axisX + (aSeed - 0.5) * 0.055,
              (aSeed - 0.5) * 1.28,
              -1.5 - aSeed * 2.6
            );
            vec3 centerPoint = mix(depthOrigin, position, centerEase);
            float orbitFade = sin(centerBuild * 3.14159) * (1.0 - centerBuild * 0.28);
            float orbitAngle = aSeed * 18.8496 + centerBuild * 8.6;
            float orbitRadius = mix(0.2, 0.055, centerBuild) * orbitFade;
            centerPoint.x += cos(orbitAngle) * orbitRadius;
            centerPoint.y += sin(orbitAngle) * orbitRadius * 0.58;
            centerPoint.z += sin(orbitAngle) * orbitRadius * 1.35 + centerBand * 0.08;

            float fragmentIndex = floor((position.y + 0.5) * 11.0);
            float fragmentSeed = fract(fragmentIndex * 0.6180339 + 0.17);
            float fragmentDirection = mod(fragmentIndex, 2.0) < 1.0 ? -1.0 : 1.0;
            float rightThreshold = fragmentSeed * 0.58 + aSeed * 0.08;
            float rightBuild = smoothstep(rightThreshold, rightThreshold + 0.2, uRightBuild);
            float rightEase = 1.0 - pow(1.0 - rightBuild, 3.0);
            float rightBand = exp(-abs(uRightBuild - rightThreshold) * 17.0);
            float rightAxis = 0.655;
            float entryAngle = fragmentDirection * mix(0.18, 0.52, fragmentSeed) * (1.0 - rightEase);
            vec3 fragmentOrigin = position;
            fragmentOrigin.x += fragmentDirection * mix(0.32, 0.72, fragmentSeed);
            fragmentOrigin.y += (fragmentSeed - 0.5) * 0.12;
            fragmentOrigin.z -= 0.75 + fragmentSeed * 2.1;
            vec3 rightPoint = mix(fragmentOrigin, position, rightEase);
            float localX = rightPoint.x - rightAxis;
            float localY = rightPoint.y - (floor((position.y + 0.5) * 11.0) / 11.0 - 0.5);
            rightPoint.x = rightAxis + localX * cos(entryAngle) - localY * sin(entryAngle);
            rightPoint.y += localX * sin(entryAngle) + rightBand * 0.012;
            rightPoint.z += sin(rightBuild * 3.14159) * fragmentDirection * 0.09;

            vec3 point = mix(leftPoint, centerPoint, isCenterColumn);
            point = mix(point, rightPoint, isRightColumn);

            // The columns release from both outer edges toward their middles.
            // Every released point keeps its identity and receives a stable
            // destination inside the new butterfly silhouette.
            float edgeDistance = clamp(abs(position.y) * 2.0, 0.0, 1.0);
            float morphThreshold = (1.0 - edgeDistance) * 0.38 + aSeed * 0.1;
            float localMorph = smoothstep(morphThreshold, morphThreshold + 0.34, uMorph);
            float morphEase = localMorph * localMorph * (3.0 - 2.0 * localMorph);

            vec3 animatedButterfly = aButterflyTarget;
            float launchForce = exp(-uFinalFlight * 8.5)
              * (1.0 - exp(-uFinalFlight * 42.0));
            if (abs(aButterflyWing) > 0.5) {
              float hingeX = aButterflyWing * 0.16;
              float wingDistance = abs(animatedButterfly.x - hingeX);
              float span = smoothstep(0.08, 2.45, wingDistance);
              float fore = smoothstep(-0.55, 1.35, animatedButterfly.y);
              float rear = 1.0 - fore;
              float localPhase = uTime + fore * 0.24 - rear * 0.2 - span * 0.08;
              float strokeWave = sin(localPhase);
              float strokeVelocity = cos(localPhase);
              float cinematicTurn = (sin(localPhase * 3.0) + strokeWave) * 0.055;
              float primaryFlap = (strokeWave + sin(localPhase * 2.0 - 0.35) * 0.075
                + cinematicTurn) * mix(0.72, 1.12, launchForce);
              primaryFlap -= max(-strokeWave, 0.0) * 0.045;
              float flapStrength = mix(0.82, 1.0, fore);
              float outerFlex = smoothstep(0.16, 1.0, span);
              float rearFlex = mix(0.34, 1.0, rear);
              float downstroke = smoothstep(-0.08, 0.82, -strokeVelocity);
              float elasticTwist = sin(localPhase - 0.52) * span * mix(0.035, 0.105, fore);
              float sideBase = aButterflyWing > 0.5 ? 0.38 : 0.44;
              float sideStrength = aButterflyWing > 0.5 ? 1.28 : 1.0;
              float flapDrive = primaryFlap * flapStrength * sideStrength + elasticTwist;
              float limitRatio = flapDrive / 1.65;
              float softenedDrive = flapDrive / sqrt(1.0 + limitRatio * limitRatio);
              float flexibleLag = strokeVelocity * outerFlex * outerFlex
                * mix(0.035, 0.18, downstroke) * mix(0.7, 1.0, rearFlex);
              float flapAngle = (sideBase + softenedDrive - flexibleLag) * aButterflyWing;
              float localX = animatedButterfly.x - hingeX;
              float localZ = animatedButterfly.z;
              if (aButterflyWing > 0.5) localX *= 0.94;
              localX *= -1.0;
              animatedButterfly.x = hingeX + localX * cos(flapAngle) + localZ * sin(flapAngle);
              animatedButterfly.z = -localX * sin(flapAngle) + localZ * cos(flapAngle);

              float upstroke = smoothstep(-0.28, 0.68, strokeVelocity);
              float twistPhase = localPhase - outerFlex * 0.7 - rear * 0.3;
              float twist = sin(twistPhase) * outerFlex * outerFlex * rearFlex;
              float cup = upstroke * outerFlex * outerFlex * mix(0.035, 0.11, rear);
              float bend = downstroke * outerFlex * outerFlex * mix(0.045, 0.14, rearFlex);
              animatedButterfly.z += twist * mix(0.09, 0.19, upstroke) + cup + bend;
              animatedButterfly.y += sin(twistPhase - 0.34) * outerFlex
                * mix(0.012, 0.058, rear);
            } else if (animatedButterfly.y < -0.18) {
              float abdomen = smoothstep(0.18, 1.38, -animatedButterfly.y);
              animatedButterfly.z += sin(uTime + 3.14159) * abdomen * 0.065;
              animatedButterfly.x += cos(uTime + 3.14159) * abdomen * 0.018;
            }

            // Match the loading butterfly's three-quarter profile orientation.
            // This is the same basis used by profileOrientation on its group.
            vec3 profileButterfly = vec3(
              dot(animatedButterfly, vec3(-0.341, 0.783, -0.52)),
              dot(animatedButterfly, vec3(0.429, 0.622, 0.655)),
              dot(animatedButterfly, vec3(0.836, 0.0, -0.548))
            );
            vec3 rearFlightButterfly = vec3(
              dot(animatedButterfly, vec3(0.992, 0.12, -0.001)),
              dot(animatedButterfly, vec3(-0.066, 0.55, 0.831)),
              dot(animatedButterfly, vec3(0.1, -0.826, 0.554))
            );
            float turnAway = smoothstep(0.04, 0.38, uFinalFlight);
            profileButterfly = mix(profileButterfly, rearFlightButterfly, turnAway);
            float launchLean = -launchForce * 0.095;
            profileButterfly.xy = mat2(
              cos(launchLean), -sin(launchLean),
              sin(launchLean), cos(launchLean)
            ) * profileButterfly.xy;
            float courseChange = smoothstep(0.1, 0.72, uFinalFlight);
            float steeringAngle = mix(0.06, -0.08, courseChange);
            profileButterfly.xy = mat2(
              cos(steeringAngle), -sin(steeringAngle),
              sin(steeringAngle), cos(steeringAngle)
            ) * profileButterfly.xy;
            float bankAngle = sin(courseChange * 3.14159) * -0.12;
            profileButterfly.xz = mat2(
              cos(bankAngle), -sin(bankAngle),
              sin(bankAngle), cos(bankAngle)
            ) * profileButterfly.xz;
            float flightPitch = sin(uTime - 1.08) * 0.042;
            float pitchCos = cos(flightPitch);
            float pitchSin = sin(flightPitch);
            profileButterfly.yz = mat2(pitchCos, -pitchSin, pitchSin, pitchCos)
              * profileButterfly.yz;

            vec2 bodyAxis = normalize(vec2(0.783, 0.622));
            float bodyAlong = dot(profileButterfly.xy, bodyAxis);
            float bodyAcross = abs(dot(profileButterfly.xy, vec2(-bodyAxis.y, bodyAxis.x)));
            float torsoShape = (1.0 - smoothstep(0.058, 0.102, bodyAcross))
              * smoothstep(-1.34, -1.24, bodyAlong)
              * (1.0 - smoothstep(0.24, 0.31, bodyAlong));
            vec2 headCenter = bodyAxis * 0.265;
            float headShape = 1.0 - smoothstep(0.072, 0.108, distance(profileButterfly.xy, headCenter));
            float behindBody = 1.0 - smoothstep(-0.015, 0.075, profileButterfly.z);
            vWingOcclusion = step(0.5, abs(aButterflyWing))
              * max(torsoShape, headShape) * behindBody * localMorph;

            vec2 hover = vec2(sin(uTime * 0.22) * 0.012, sin(uTime * 0.41) * 0.018);
            float impulseIntegral = uFinalFlight
              - (1.0 - exp(-7.0 * uFinalFlight)) / 7.0;
            float impulseDistance = impulseIntegral / 0.857273;
            float cameraCatch = smoothstep(0.12, 0.82, uFinalFlight);
            float leftArc = smoothstep(0.02, 0.34, uFinalFlight)
              * (1.0 - smoothstep(0.76, 1.0, uFinalFlight)) * 0.72;
            float screenDive = smoothstep(0.38, 1.0, uFinalFlight);
            vec3 flightOffset = vec3(
              -leftArc + screenDive * 0.055,
              impulseDistance * 0.018 - screenDive * 0.035,
              -impulseDistance * 0.72 - screenDive * screenDive * 0.92
            );
            vec3 butterflyTarget = vec3(
              uButterflyCenter + profileButterfly.xy * 0.105 + hover * localMorph,
              profileButterfly.z * 0.105
            ) + flightOffset;
            float flightArc = sin(localMorph * 3.14159);
            vec3 flightPoint = mix(point, butterflyTarget, morphEase);
            float streamSide = aColumnId - 1.0;
            flightPoint.x += flightArc * (0.1 + abs(streamSide) * 0.07);
            flightPoint.y += flightArc * (streamSide * 0.055 + (aSeed - 0.5) * 0.11);
            flightPoint.z += flightArc * (0.14 + aSeed * 0.16);
            point = flightPoint;

            vec4 viewPosition = modelViewMatrix * vec4(point, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            vButterflyDepth = smoothstep(-0.16, 0.16, butterflyTarget.z);
            vButterflyBody = (1.0 - step(0.5, abs(aButterflyWing)))
              * (1.0 - step(0.42, aButterflyTarget.y));
            vFlightVisibility = 1.0 - smoothstep(0.93, 1.0, uFinalFlight);
            float activeBand = max(max(leftBand * isLeftColumn, centerBand * isCenterColumn), rightBand * isRightColumn);
            gl_PointSize = mix(1.0, 1.78, aBrightness) * uPixelRatio
              * (1.0 + activeBand * 0.48 + flightArc * 0.28)
              * mix(1.0, mix(0.72, 1.24, vButterflyDepth) + vButterflyBody * 0.16, localMorph);
            vBrightness = min(1.0, aBrightness * 1.16 + 0.12 + activeBand * 0.34);
            float leftAlpha = isLeftColumn * smoothstep(0.0, 0.08, uLeftBuild) * mix(0.14, 1.0, leftBuild);
            float centerAlpha = isCenterColumn * smoothstep(0.0, 0.07, uCenterBuild) * mix(0.08, 1.0, centerBuild);
            float rightAlpha = isRightColumn * smoothstep(0.0, 0.07, uRightBuild) * mix(0.1, 1.0, rightBuild);
            vAlpha = leftAlpha + centerAlpha + rightAlpha;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uOpacity;
          varying float vBrightness;
          varying float vAlpha;
          varying float vButterflyDepth;
          varying float vButterflyBody;
          varying float vWingOcclusion;
          varying float vFlightVisibility;

          void main() {
            vec2 center = gl_PointCoord - 0.5;
            float shape = 1.0 - smoothstep(0.2, 0.5, length(center));
            float alpha = shape * mix(0.5, 1.0, vBrightness) * vAlpha * uOpacity
              * (1.0 - vWingOcclusion) * vFlightVisibility;
            float depthLight = mix(0.42, 1.0, vButterflyDepth) + vButterflyBody * 0.18;
            gl_FragColor = vec4(vec3(0.9, 0.92, 0.93) * depthLight, alpha);
          }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      columnPoints = new THREE.Points(columnGeometry, columnMaterial);
      columnPoints.frustumCulled = false;
      columnPoints.renderOrder = 4;
      camera.add(columnPoints);
      layoutColumns();
    };
    image.src = "/butterfly-reference.webp";
    image.onload = () => {
      butterflyParticleData = createParticleData(image, performanceProfile);
      syncColumnButterflyTargets();
      heroImage.src = "/hero-particle-reference.webp";
    };
    heroImage.onload = () => {
      if (disposed || !butterflyParticleData) return;
      const data = butterflyParticleData;
      const hero = createHeroTargets(heroImage, particleCount);
      trailSourceData = data.target;
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(data.target, 3));
      geometry.setAttribute("aScatter", new THREE.BufferAttribute(data.scatter, 3));
      geometry.setAttribute("aHeroTarget", new THREE.BufferAttribute(hero.targets, 3));
      geometry.setAttribute("aHeroBrightness", new THREE.BufferAttribute(hero.targetBrightness, 1));
      geometry.setAttribute("aSeed", new THREE.BufferAttribute(data.seeds, 1));
      geometry.setAttribute("aWing", new THREE.BufferAttribute(data.wings, 1));
      geometry.setDrawRange(
        bodyParticleCount + antennaParticleCount,
        particleCount - bodyParticleCount - antennaParticleCount,
      );
      const uniforms: Uniforms = {
        uTime: { value: 0 }, uProgress: { value: 0 },
        uPixelRatio: { value: pixelRatio() }, uPointSize: { value: 2.15 },
        uBodyDepthEffect: { value: 0 },
        uFlapEnergy: { value: 0.72 },
        uFlightBlend: { value: 0 },
        uDissolve: { value: 0 },
        uSceneTime: { value: 0 },
        uVortexCenter: { value: new THREE.Vector3(0, 0, 0) },
        uScatterWorldOffset: { value: new THREE.Vector3() },
        uFlightVelocity: { value: new THREE.Vector3() },
      };
      uniformsRef.current = uniforms;
      material = new THREE.ShaderMaterial({
        uniforms, vertexShader, fragmentShader, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      group.add(new THREE.Points(geometry, material));

      bodyGeometry = new THREE.BufferGeometry();
      bodyGeometry.setAttribute("position", new THREE.BufferAttribute(data.target.slice(0, bodyParticleCount * 3), 3));
      bodyGeometry.setAttribute("aScatter", new THREE.BufferAttribute(data.scatter.slice(0, bodyParticleCount * 3), 3));
      bodyGeometry.setAttribute("aHeroTarget", new THREE.BufferAttribute(hero.targets.slice(0, bodyParticleCount * 3), 3));
      bodyGeometry.setAttribute("aHeroBrightness", new THREE.BufferAttribute(hero.targetBrightness.slice(0, bodyParticleCount), 1));
      bodyGeometry.setAttribute("aSeed", new THREE.BufferAttribute(data.seeds.slice(0, bodyParticleCount), 1));
      bodyGeometry.setAttribute("aWing", new THREE.BufferAttribute(data.wings.slice(0, bodyParticleCount), 1));
      const bodyUniforms: Uniforms = {
        ...uniforms,
        uPointSize: { value: 2.2 },
        uBodyDepthEffect: { value: 1 },
      };
      bodyMaterial = new THREE.ShaderMaterial({
        uniforms: bodyUniforms,
        vertexShader,
        fragmentShader: bodyFragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
      });
      const bodyPoints = new THREE.Points(bodyGeometry, bodyMaterial);
      bodyPoints.renderOrder = 2;
      group.add(bodyPoints);

      const antennaStart = bodyParticleCount;
      const antennaEnd = bodyParticleCount + antennaParticleCount;
      antennaGeometry = new THREE.BufferGeometry();
      antennaGeometry.setAttribute("position", new THREE.BufferAttribute(data.target.slice(antennaStart * 3, antennaEnd * 3), 3));
      antennaGeometry.setAttribute("aScatter", new THREE.BufferAttribute(data.scatter.slice(antennaStart * 3, antennaEnd * 3), 3));
      antennaGeometry.setAttribute("aHeroTarget", new THREE.BufferAttribute(hero.targets.slice(antennaStart * 3, antennaEnd * 3), 3));
      antennaGeometry.setAttribute("aHeroBrightness", new THREE.BufferAttribute(hero.targetBrightness.slice(antennaStart, antennaEnd), 1));
      antennaGeometry.setAttribute("aSeed", new THREE.BufferAttribute(data.seeds.slice(antennaStart, antennaEnd), 1));
      antennaGeometry.setAttribute("aWing", new THREE.BufferAttribute(data.wings.slice(antennaStart, antennaEnd), 1));
      const antennaUniforms: Uniforms = {
        ...uniforms,
        uPointSize: { value: 1.55 },
        uBodyDepthEffect: { value: 0 },
      };
      antennaMaterial = new THREE.ShaderMaterial({
        uniforms: antennaUniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const antennaPoints = new THREE.Points(antennaGeometry, antennaMaterial);
      antennaPoints.renderOrder = 3;
      group.add(antennaPoints);

      trailSources = [];
      for (let i = bodyParticleCount + antennaParticleCount; i < particleCount; i += 1) {
        const offset = i * 3;
        const wingX = Math.abs(data.target[offset]);
        const wingY = data.target[offset + 1];
        if (wingX > 0.72 && (wingX > 1.55 || wingY < -0.12)) trailSources.push(i);
      }
      trailPositions = new Float32Array(trailParticleCount * 3);
      trailColors = new Float32Array(trailParticleCount * 3);
      trailPositions.fill(999);
      trailGeometry = new THREE.BufferGeometry();
      trailPositionAttribute = new THREE.BufferAttribute(trailPositions, 3);
      trailColorAttribute = new THREE.BufferAttribute(trailColors, 3);
      trailPositionAttribute.setUsage(THREE.DynamicDrawUsage);
      trailColorAttribute.setUsage(THREE.DynamicDrawUsage);
      trailGeometry.setAttribute("position", trailPositionAttribute);
      trailGeometry.setAttribute("color", trailColorAttribute);
      trailMaterial = new THREE.PointsMaterial({
        size: 0.035,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.72,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      trailPoints = new THREE.Points(trailGeometry, trailMaterial);
      trailPoints.frustumCulled = false;
      trailPoints.renderOrder = 1;
      scene.add(trailPoints);
      setReady(true);
      playSequence();
      columnsLoadTimer = window.setTimeout(() => {
        if (!disposed) columnsImage.src = "/particle-columns-reference.webp";
      }, particleCount < 64_000 ? 2_400 : 1_200);
    };
    const flowEdgeLengths = [0, 0];
    const render = () => {
      frame = requestAnimationFrame(render);
      if (document.hidden) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      sceneTime += delta;
      const flight = reduceMotion.matches ? 1 : flightRef.current.value;
      const assembly = progressRef.current.value;
      const dissolveProgress = dissolveRef.current.value;
      const scrollTravel = reduceMotion.matches ? 0 : scrollRef.current.value;
      // Reduced motion freezes the earlier world at 0, but the walk stage
      // still needs the raw scroll to step through its three stable states.
      const walkState = getWalkFlightState(scrollRef.current.value, {
        reducedMotion: reduceMotion.matches,
        narrow: camera.aspect < 0.9,
      });
      const renderParticleWorld = scrollTravel < 1.22;
      group.visible = renderParticleWorld;
      tunnelPoints.visible = renderParticleWorld;
      if (columnPoints) columnPoints.visible = renderParticleWorld;
      if (trailPoints) trailPoints.visible = renderParticleWorld;
      const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * camera.position.z;
      const viewWidth = viewHeight * camera.aspect;
      // GSAP already shapes acceleration. Applying smoothstep here as well
      // created an artificial pause even though flightProgress was advancing.
      const travel = flight;
      const arc = Math.sin(travel * Math.PI);
      const left = viewWidth < 5 ? -viewWidth * 0.24 : -viewWidth * 0.34;
      const right = viewWidth < 5 ? viewWidth * 0.26 : viewWidth * 0.34;
      const hoverBlend = THREE.MathUtils.smoothstep(flight, 0.86, 1);
      const hover = hoverBlend * Math.sin(sceneTime * 1.34) * 0.075;
      const wingPulse = Math.sin(wingPhase);
      const strokeVelocity = Math.cos(wingPhase);
      const downstrokeDrive = Math.pow(Math.max(0, -strokeVelocity), 2);
      const clapDrive = Math.pow(Math.max(0, wingPulse), 4);
      const gatheredWeight = THREE.MathUtils.smoothstep(assembly, 0.58, 0.76);
      const takeoffRelease = 1 - THREE.MathUtils.smoothstep(flight, 0, 0.18);
      const preload = gatheredWeight * takeoffRelease;
      const preflightLife = THREE.MathUtils.smoothstep(assembly, 0.34, 0.72) * takeoffRelease;
      const flightActivity = THREE.MathUtils.smoothstep(flight, 0, 0.075);
      const bodyPulse = Math.sin(wingPhase - 0.58);
      const beatLift = flightActivity * (1 - hoverBlend * 0.28) * bodyPulse * 0.026;
      const forwardPulse = flightActivity * clapDrive * 0.014;
      const tailElapsed = Math.max(0, (dissolveProgress - 0.44) * 2.95);
      const postFlightCarry = capturedDissolveVelocity.x * 0.28
        * (1 - Math.exp(-tailElapsed / 0.28));

      group.position.set(
        THREE.MathUtils.lerp(left, right, travel) - preload * 0.045
          + preflightLife * bodyPulse * 0.012 + forwardPulse + postFlightCarry,
        -0.12 + arc * 0.42 + beatLift
          + hover - preload * (0.055 + Math.max(0, wingPulse) * 0.012)
          + preflightLife * bodyPulse * 0.016,
        Math.sin(travel * Math.PI) * 0.28 - Math.sin(travel * Math.PI * 2.0) * 0.13
          + preflightLife * strokeVelocity * 0.014,
      );

      velocity.copy(group.position).sub(previousPosition).multiplyScalar(delta > 0 ? 1 / delta : 0);
      previousPosition.copy(group.position);
      smoothedFlightVelocity.lerp(velocity, 1 - Math.exp(-delta * 5.5));
      if (smoothedFlightVelocity.length() > 4) smoothedFlightVelocity.setLength(4);
      if (dissolveProgress <= 0.001) {
        hasCapturedDissolveVelocity = false;
      } else if (!hasCapturedDissolveVelocity) {
        capturedDissolveVelocity.copy(smoothedFlightVelocity);
        hasCapturedDissolveVelocity = true;
      }
      const speed = Math.min(1, Math.abs(velocity.x) / 2.0);
      const liftEffort = Math.min(1, Math.abs(velocity.y) * 0.55 + speed * 0.58);
      const flightFrequency = THREE.MathUtils.lerp(0.74, 1.31, Math.max(liftEffort, speed));
      const wingFrequency = THREE.MathUtils.lerp(0.74, flightFrequency, flightActivity);
      wingPhase += delta * wingFrequency * Math.PI * 2;

      if (uniformsRef.current) {
        uniformsRef.current.uTime.value = reduceMotion.matches ? 0.7 : wingPhase;
        uniformsRef.current.uProgress.value = progressRef.current.value;
        uniformsRef.current.uScatterWorldOffset.value.set(
          -group.position.x,
          -group.position.y,
          -group.position.z,
        );
        uniformsRef.current.uFlightVelocity.value.copy(
          hasCapturedDissolveVelocity ? capturedDissolveVelocity : smoothedFlightVelocity,
        );
        uniformsRef.current.uFlightBlend.value = Math.max(preflightLife * 0.45, flightActivity);
        uniformsRef.current.uDissolve.value = dissolveRef.current.value;
        uniformsRef.current.uSceneTime.value = sceneTime;
        uniformsRef.current.uFlapEnergy.value = THREE.MathUtils.lerp(
          0.7,
          1.08,
          Math.max(liftEffort, Math.max(preload * 0.34, downstrokeDrive * speed * 0.72)),
        );
      }

      const takeoffWeight = Math.sin(THREE.MathUtils.smoothstep(flight, 0, 0.16) * Math.PI) * 0.12;
      const pitch = THREE.MathUtils.clamp(-velocity.y * 0.055, -0.16, 0.16)
        + takeoffWeight - preload * 0.045
        + preflightLife * bodyPulse * 0.014
        + flightActivity * Math.sin(wingPhase - 1.08) * 0.042;
      const yaw = Math.sin(travel * Math.PI * 2.0) * arc * 0.075;
      const roll = THREE.MathUtils.clamp(-velocity.y * 0.085, -0.22, 0.22)
        + Math.sin(travel * Math.PI * 3.0) * arc * 0.035
        + preflightLife * strokeVelocity * 0.012
        + flightActivity * strokeVelocity * 0.022;
      flightEuler.set(pitch, yaw, roll);
      flightRotation.setFromEuler(flightEuler);
      targetOrientation.copy(profileOrientation).multiply(flightRotation);
      group.quaternion.slerp(targetOrientation, 1 - Math.exp(-delta * 5.5));

      const responsiveScale = THREE.MathUtils.clamp(viewWidth / 12, 0.46, 0.82);
      const breathing = assembly * (Math.max(0, -wingPulse) * 0.014
        + hoverBlend * Math.sin(sceneTime * 1.34) * 0.008)
        + preflightLife * bodyPulse * 0.004;
      group.scale.setScalar(responsiveScale + breathing);

      if (renderParticleWorld && trailPositions && trailColors && trailPositionAttribute && trailColorAttribute) {
        if (flight + 0.01 < previousFlight) {
          trailLife.fill(0);
          trailPositions.fill(999);
          trailColors.fill(0);
          trailAccumulator = 0;
        }
        previousFlight = flight;
        group.updateMatrixWorld(true);

        const dissolveAmount = dissolveRef.current.value;
        const canEmit = flight > 0.035 && flight < 0.94 && dissolveAmount < 0.015;
        if (canEmit && trailSources.length > 0 && trailSourceData) {
          trailAccumulator += delta * (420 + downstrokeDrive * 900);
          const spawnCount = Math.min(80, Math.floor(trailAccumulator));
          trailAccumulator -= spawnCount;
          for (let spawn = 0; spawn < spawnCount; spawn += 1) {
            const particle = trailCursor;
            trailCursor = (trailCursor + 1) % trailParticleCount;
            const sourceIndex = trailSources[Math.floor(Math.random() * trailSources.length)];
            const sourceOffset = sourceIndex * 3;
            trailSourcePosition.set(
              trailSourceData[sourceOffset],
              trailSourceData[sourceOffset + 1],
              trailSourceData[sourceOffset + 2],
            ).applyMatrix4(group.matrixWorld);
            const offset = particle * 3;
            trailPositions[offset] = trailSourcePosition.x;
            trailPositions[offset + 1] = trailSourcePosition.y;
            trailPositions[offset + 2] = trailSourcePosition.z;
            trailVelocity[offset] = velocity.x * 0.22 - 0.08 - Math.random() * 0.12;
            trailVelocity[offset + 1] = velocity.y * 0.12 + (Math.random() - 0.5) * 0.16;
            trailVelocity[offset + 2] = velocity.z * 0.1 + (Math.random() - 0.5) * 0.2;
            trailLife[particle] = 0.72 + Math.random() * 0.82;
            trailSeed[particle] = Math.random();
          }
        }

        for (let i = 0; i < trailParticleCount; i += 1) {
          if (trailLife[i] <= 0) continue;
          const offset = i * 3;
          trailLife[i] -= delta * (1 + dissolveAmount * 1.8);
          trailVelocity[offset + 1] -= delta * 0.075;

          const drag = Math.exp(-delta * (1.45 + dissolveAmount * 1.8));
          trailVelocity[offset] *= drag;
          trailVelocity[offset + 1] *= drag;
          trailVelocity[offset + 2] *= drag;
          trailPositions[offset] += trailVelocity[offset] * delta;
          trailPositions[offset + 1] += trailVelocity[offset + 1] * delta;
          trailPositions[offset + 2] += trailVelocity[offset + 2] * delta;

          const visibility = THREE.MathUtils.smoothstep(trailLife[i], 0, 0.38) * 0.58;
          trailColors[offset] = visibility;
          trailColors[offset + 1] = visibility;
          trailColors[offset + 2] = visibility;
          if (trailLife[i] <= 0) {
            trailPositions[offset] = 999;
            trailPositions[offset + 1] = 999;
            trailPositions[offset + 2] = 999;
          }
        }
        trailPositionAttribute.needsUpdate = true;
        trailColorAttribute.needsUpdate = true;
      }

      // A restrained camera drift adds parallax, then deliberately loses the
      // subject as the gust takes over. Keep these amplitudes small enough that
      // the movement reads subconsciously rather than as a camera pan.
      const dissolve = dissolveRef.current.value;
      const occluderRelease = 1 - THREE.MathUtils.smoothstep(dissolve, 0.04, 0.52);
      torsoOccluder.scale.set(occluderRelease, 1, occluderRelease);
      headOccluder.scale.setScalar(occluderRelease);
      torsoOccluder.visible = occluderRelease > 0.012;
      headOccluder.visible = occluderRelease > 0.012;
      const followEnvelope = Math.sin(flight * Math.PI) * (1 - THREE.MathUtils.smoothstep(dissolve, 0.08, 0.72));
      const targetCameraX = group.position.x * 0.075 * followEnvelope;
      const operatorTurn = THREE.MathUtils.smoothstep(scrollTravel, 1.72, 1.98);
      const turnEase = operatorTurn * operatorTurn * operatorTurn
        * (operatorTurn * (operatorTurn * 6 - 15) + 10);
      const anticipationPhase = THREE.MathUtils.clamp(operatorTurn / 0.18, 0, 1);
      const anticipation = Math.sin(anticipationPhase * Math.PI)
        * (1 - THREE.MathUtils.smoothstep(operatorTurn, 0.14, 0.28));
      const settlePhase = THREE.MathUtils.clamp((operatorTurn - 0.68) / 0.32, 0, 1);
      const turnOvershoot = Math.sin(settlePhase * Math.PI) * 3.2;
      const scenePass = THREE.MathUtils.smoothstep(scrollTravel, 0.1, 0.34);
      const tunnelArrival = THREE.MathUtils.smoothstep(scrollTravel, 0.31, 0.38);
      const tunnelDeparture = THREE.MathUtils.smoothstep(scrollTravel, 0.58, 0.66);
      tunnelUniforms.uTravel.value = scrollTravel;
      tunnelUniforms.uOpacity.value = tunnelArrival * (1 - tunnelDeparture);
      const columnsArrival = THREE.MathUtils.smoothstep(scrollTravel, 0.81, 0.84);
      columnUniforms.uOpacity.value = columnsArrival;
      columnUniforms.uTime.value = reduceMotion.matches ? 0.7 : wingPhase;
      columnUniforms.uLeftBuild.value = THREE.MathUtils.smoothstep(scrollTravel, 0.82, 0.89);
      columnUniforms.uCenterBuild.value = THREE.MathUtils.smoothstep(scrollTravel, 0.85, 0.915);
      columnUniforms.uRightBuild.value = THREE.MathUtils.smoothstep(scrollTravel, 0.88, 0.94);
      columnUniforms.uMorph.value = reduceMotion.matches
        ? THREE.MathUtils.smoothstep(scrollTravel, 0.95, 0.985)
        : THREE.MathUtils.smoothstep(scrollTravel, 0.945, 0.998);
      const finalFlight = reduceMotion.matches
        ? 0
        : THREE.MathUtils.smoothstep(scrollTravel, 1.0, 1.18);
      columnUniforms.uFinalFlight.value = finalFlight;
      const impulseIntegral = finalFlight - (1 - Math.exp(-7 * finalFlight)) / 7;
      const impulseDistance = impulseIntegral / 0.857273;
      const cameraCatch = THREE.MathUtils.smoothstep(finalFlight, 0.12, 0.82);
      const sectionDeparture = THREE.MathUtils.smoothstep(finalFlight, 0.26, 0.9);
      const principleStages = [
        [0.835, 0.892, 0.895],
        [0.887, 0.917, 0.92],
        [0.922, 0.947, 0.95],
      ];
      const principlesExit = 1;
      principleStages.forEach(([start, focusEnd, settleAt], index) => {
        const attentionIn = THREE.MathUtils.smoothstep(scrollTravel, start, start + 0.022);
        const attentionOut = THREE.MathUtils.smoothstep(scrollTravel, focusEnd - 0.01, focusEnd);
        const attention = attentionIn * (1 - attentionOut) * principlesExit;
        const settled = THREE.MathUtils.smoothstep(scrollTravel, settleAt - 0.004, settleAt + 0.012) * principlesExit;
        const callout = calloutRefs.current[index];
        const principle = principleRefs.current[index];
        if (callout) {
          callout.style.opacity = String(attention);
          callout.style.transform = `translate3d(0, ${(1 - attention) * 18}px, 0)`;
        }
        if (principle) {
          principle.style.opacity = String(settled);
          principle.style.transform = `translate3d(0, ${(1 - settled) * 8}px, 0)`;
        }
      });
      const resolutionIn = THREE.MathUtils.smoothstep(scrollTravel, 0.925, 0.945);
      const resolutionVisibility = resolutionIn;
      if (resolutionRef.current) {
        resolutionRef.current.style.opacity = String(resolutionVisibility);
        resolutionRef.current.style.transform = `translate3d(0, ${(1 - resolutionIn) * 18}px, 0)`;
      }
      if (approachRef.current) {
        const passedBehind = THREE.MathUtils.smoothstep(finalFlight, 0.72, 1);
        approachRef.current.style.opacity = String(1 - passedBehind);
        approachRef.current.style.transform = `perspective(1100px) translate3d(${-sectionDeparture * 42}vw, 0, ${sectionDeparture * 380}px) scale(${1 + sectionDeparture * 0.34})`;
      }
      if (caseGlowRef.current) {
        const glowIn = THREE.MathUtils.smoothstep(finalFlight, 0.24, 0.92);
        caseGlowRef.current.style.opacity = String(
          glowIn * 0.72 * (1 - operatorTurn * 0.82) * (1 - walkState.darknessDive),
        );
        caseGlowRef.current.style.transform = `translate3d(${(1 - glowIn) * 12 + turnEase * 34}%, 0, 0) scale(${0.82 + glowIn * 0.18})`;
      }
      if (caseScreenRef.current) {
        const screenIn = THREE.MathUtils.smoothstep(finalFlight, 0.48, 0.98);
        caseScreenRef.current.style.opacity = String(screenIn);
        caseScreenRef.current.style.transform = `perspective(1400px) translate3d(${(1 - screenIn) * 7}vw, 0, ${-(1 - screenIn) * 180}px) rotateY(${(1 - screenIn) * -4}deg)`;
      }
      const showcase = reduceMotion.matches
        ? 1
        : THREE.MathUtils.smoothstep(scrollTravel, 1.18, 1.58);
      const revealCaseText = (
        element: HTMLElement | null,
        start: number,
        end: number,
        distance: number,
      ) => {
        if (!element) return;
        const reveal = THREE.MathUtils.smoothstep(showcase, start, end);
        element.style.opacity = String(reveal);
        element.style.transform = `translate3d(0, ${(1 - reveal) * distance}px, 0)`;
      };
      revealCaseText(caseIndexRef.current, 0.02, 0.1, 7);
      revealCaseText(caseTitleRef.current, 0.07, 0.22, 16);
      revealCaseText(caseDescriptionRef.current, 0.16, 0.3, 12);
      revealCaseText(caseMetaRef.current, 0.25, 0.38, 8);
      const gridIn = THREE.MathUtils.smoothstep(showcase, 0.03, 0.15);
      if (flowGridRef.current) flowGridRef.current.style.opacity = String(gridIn);

      const promptIn = THREE.MathUtils.smoothstep(showcase, 0.16, 0.25);
      const promptOut = THREE.MathUtils.smoothstep(showcase, 0.43, 0.54);
      const promptVisibility = promptIn * (1 - promptOut * 0.72);
      if (flowPromptRef.current) {
        flowPromptRef.current.style.opacity = String(promptVisibility);
        flowPromptRef.current.style.transform = `translate3d(-50%, ${(1 - promptIn) * 10}px, 0) scale(${0.97 + promptIn * 0.03})`;
        flowPromptRef.current.style.filter = `blur(${(1 - promptIn) * 5}px)`;
      }
      if (flowPromptTextRef.current) {
        const typing = THREE.MathUtils.smoothstep(showcase, 0.21, 0.39);
        flowPromptTextRef.current.textContent = FLOW_PROMPT.slice(0, Math.floor(typing * FLOW_PROMPT.length));
      }

      const nodeStages = [[0.4, 0.52], [0.57, 0.69], [0.74, 0.86]];
      nodeStages.forEach(([start, end], index) => {
        const nodeIn = THREE.MathUtils.smoothstep(showcase, start, end);
        const node = flowNodeRefs.current[index];
        if (!node) return;
        node.style.opacity = String(nodeIn);
        node.style.transform = `scale(${0.96 + nodeIn * 0.04})`;
        node.style.filter = `blur(${(1 - nodeIn) * 7}px)`;
      });

      const edgeStages = [[0.5, 0.63], [0.67, 0.8]];
      edgeStages.forEach(([start, end], index) => {
        const edgeIn = THREE.MathUtils.smoothstep(showcase, start, end);
        const edge = flowEdgeRefs.current[index];
        if (!edge) return;
        edge.style.strokeDashoffset = String(1 - edgeIn);
        edge.style.opacity = String(edgeIn);
      });

      const toolbarIn = THREE.MathUtils.smoothstep(showcase, 0.72, 0.82);
      if (flowToolbarRef.current) {
        flowToolbarRef.current.style.opacity = String(toolbarIn);
        flowToolbarRef.current.style.transform = `translate3d(-50%, ${(1 - toolbarIn) * -8}px, 0)`;
        flowToolbarRef.current.style.filter = `blur(${(1 - toolbarIn) * 5}px)`;
      }
      const runFocusIn = THREE.MathUtils.smoothstep(showcase, 0.775, 0.815);
      const runFocusOut = THREE.MathUtils.smoothstep(showcase, 0.88, 0.93);
      const runFocus = runFocusIn * (1 - runFocusOut);
      const runPressIn = THREE.MathUtils.smoothstep(showcase, 0.835, 0.852);
      const runPressOut = THREE.MathUtils.smoothstep(showcase, 0.858, 0.885);
      const runPress = runPressIn * (1 - runPressOut);
      const runSettled = THREE.MathUtils.smoothstep(showcase, 0.858, 0.89);
      const executionIn = THREE.MathUtils.smoothstep(showcase, 0.835, 0.875);
      const executionDone = THREE.MathUtils.smoothstep(showcase, 0.965, 1);
      const running = executionIn * (1 - executionDone);
      if (flowRunRef.current) {
        flowRunRef.current.textContent = running > 0.04 ? "RUNNING" : "RUN";
        flowRunRef.current.style.transform = `translateZ(${runFocus * (1 - runSettled) * 22}px) scale(${1 + runFocus * (1 - runSettled) * 0.34 - runPress * 0.17})`;
        flowRunRef.current.style.background = `rgba(232, 143, 53, ${0.075 + runFocus * 0.7})`;
        flowRunRef.current.style.boxShadow = `0 0 ${runFocus * 28}px rgba(232, 143, 53, ${runFocus * 0.42})`;
        flowRunRef.current.style.color = `rgba(${248 - runFocus * 228}, ${203 - runFocus * 191}, ${147 - runFocus * 140}, ${0.72 + runFocus * 0.28})`;
      }
      if (flowToolbarRef.current) {
        flowToolbarRef.current.style.setProperty("--run-focus", String(runFocus));
      }

      const workStages = [[0.84, 0.91], [0.895, 0.955], [0.945, 0.995]];
      workStages.forEach(([start, end], index) => {
        const workIn = THREE.MathUtils.smoothstep(showcase, start, start + 0.018);
        const workOut = THREE.MathUtils.smoothstep(showcase, end - 0.018, end);
        flowNodeRefs.current[index]?.style.setProperty("--work", String(workIn * (1 - workOut)));
      });

      const pulseTimings = [
        [0, 0.862, 0.925], [0, 0.875, 0.946], [0, 0.89, 0.965],
        [1, 0.918, 0.972], [1, 0.932, 0.989], [1, 0.946, 1.0],
      ];
      pulseTimings.forEach(([edgeIndex, start, end], index) => {
        const pulse = flowPulseRefs.current[index];
        const edge = flowEdgeRefs.current[edgeIndex];
        if (!pulse || !edge) return;
        const pulseProgress = THREE.MathUtils.clamp((showcase - start) / (end - start), 0, 1);
        if (flowEdgeLengths[edgeIndex] === 0) {
          flowEdgeLengths[edgeIndex] = edge.getTotalLength();
        }
        const point = edge.getPointAtLength(flowEdgeLengths[edgeIndex] * pulseProgress);
        const pulseIn = THREE.MathUtils.smoothstep(pulseProgress, 0, 0.1);
        const pulseOut = THREE.MathUtils.smoothstep(pulseProgress, 0.82, 1);
        pulse.setAttribute("cx", String(point.x));
        pulse.setAttribute("cy", String(point.y));
        pulse.style.opacity = String(pulseIn * (1 - pulseOut));
      });

      if (flowResultRef.current) {
        const resultIn = THREE.MathUtils.smoothstep(showcase, 0.965, 1);
        flowResultRef.current.style.opacity = String(resultIn);
        flowResultRef.current.style.transform = `translate3d(0, ${(1 - resultIn) * 7}px, 0)`;
      }
      if (caseWorldRef.current) {
        const pullback = reduceMotion.matches
          ? 0
          : THREE.MathUtils.smoothstep(scrollTravel, 1.58, 1.72);
        const pullbackZ = pullback * -1380;
        const turnX = turnEase * 3.5;
        const turnY = Math.sin(operatorTurn * Math.PI) * -1.4;
        const turnZ = turnEase * -70;
        const turnYaw = -anticipation * 2.2 + turnEase * 88 + turnOvershoot;
        const turnRoll = Math.sin(operatorTurn * Math.PI) * 1.15;
        const displayFade = walkState.darknessDive;
        caseWorldRef.current.style.transform = `perspective(1400px) translate3d(${-displayFade * 10}vw, 0, ${-displayFade * 480}px) rotateZ(${turnRoll}deg) rotateY(${turnYaw}deg) translate3d(${turnX}vw, ${turnY}vh, ${pullbackZ + turnZ}px)`;
        caseWorldRef.current.style.opacity = String(1 - displayFade);
        caseWorldRef.current.style.filter = displayFade > 0.001 ? `blur(${displayFade * 5}px)` : "none";
        caseWorldRef.current.classList.toggle("is-turning", operatorTurn > 0.002);
        if (caseSurfaceRef.current) {
          caseSurfaceRef.current.style.backgroundColor = `rgba(0, 0, 0, ${pullback})`;
        }
        if (caseCopyPlaneRef.current) {
          caseCopyPlaneRef.current.style.transform = `translate3d(${pullback * 38}px, 0, ${pullback * 82}px)`;
        }
      }
      const targetCameraY = group.position.y * 0.045 * followEnvelope - dissolve * 0.035
        + scrollTravel * 0.08 - scenePass * 0.28;
      const caseApproach = THREE.MathUtils.smoothstep(finalFlight, 0.3, 1);
      const targetCameraZ = 8 - followEnvelope * 0.16 + dissolve * 0.22
        - scenePass * 11.25 - caseApproach * 2.15;
      const cameraEase = 1 - Math.exp(-delta * (3.2 + scenePass * 4.8));
      camera.position.x = THREE.MathUtils.lerp(
        camera.position.x,
        targetCameraX - scenePass * 1.18,
        cameraEase,
      );
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY, cameraEase);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCameraZ, cameraEase);
      cameraTarget.set(
        camera.position.x * 0.28 - scenePass * 0.42,
        camera.position.y * 0.18 - scenePass * 0.08,
        -scenePass * 7 - caseApproach * 2.0,
      );
      const cameraTurn = THREE.MathUtils.smoothstep(finalFlight, 0.16, 0.94);
      const lookDistance = Math.max(1, camera.position.distanceTo(cameraTarget));
      const leftArc = THREE.MathUtils.smoothstep(finalFlight, 0.02, 0.34)
        * (1 - THREE.MathUtils.smoothstep(finalFlight, 0.76, 1)) * 0.72;
      cameraTarget.x -= leftArc * lookDistance * cameraCatch * 0.28;
      cameraTarget.x += Math.tan(THREE.MathUtils.degToRad(4)) * lookDistance * cameraTurn;
      const screenDive = THREE.MathUtils.smoothstep(finalFlight, 0.38, 1);
      cameraTarget.y += (impulseDistance * 0.035 - screenDive * 0.075) * cameraCatch;
      camera.lookAt(cameraTarget);
      // From 1.90 the walk scene owns the camera pose.
      if (walkVeilRef.current) {
        walkVeilRef.current.style.opacity = String(walkState.whiteout * (1 - walkState.caseReveal) * 0.12);
      }
      const dawnProgress = dawnRef.current.value;
      const dawnState = getDawnState(dawnProgress, {
        reducedMotion: reduceMotion.matches,
        narrow: camera.aspect < 0.9,
      });
      walkScene.update(walkState, sceneTime, camera, dawnState);
      // The case screens ride the light panel whenever the camera is away from
      // it: flying in to case 02, and pulling back into the field at dawn.
      const inPortal = walkState.active && !reduceMotion.matches && walkState.caseReveal < 1;
      const inDawn = dawnState.active && dawnProgress < 1;
      const portal = inPortal || inDawn ? walkScene.portalTransform(camera, stageSize.width, stageSize.height) : "none";
      if (caseTwoRef.current) {
        let opacity = inPortal ? walkState.lightReveal : walkState.caseReveal;
        if (inDawn) opacity = 1 - dawnState.screenMix;
        else if (dawnProgress >= 1) opacity = 0;
        caseTwoRef.current.style.opacity = String(opacity);
        caseTwoRef.current.style.transform = inPortal || inDawn ? portal : "none";
      }
      if (caseThreeRef.current) {
        caseThreeRef.current.style.opacity = String(inDawn ? dawnState.screenMix : dawnProgress >= 1 ? 1 : 0);
        caseThreeRef.current.style.transform = inDawn ? portal : "none";
      }
      if (dawnSkyRef.current) {
        // The sunrise glows from behind the screen, wherever it is in frame.
        dawnSkyRef.current.style.opacity = String(inDawn ? dawnState.dawn : 0);
        if (inDawn) {
          const [sunX, sunY] = walkScene.portalCenter(camera, stageSize.width, stageSize.height);
          dawnSkyRef.current.style.setProperty("--sun-x", `${sunX}px`);
          dawnSkyRef.current.style.setProperty("--sun-y", `${sunY}px`);
        }
      }
      renderer.render(scene, camera);
    };
    resize(); render();
    window.addEventListener("resize", resize);
    return () => {
      disposed = true;
      image.onload = null;
      heroImage.onload = null;
      columnsImage.onload = null;
      window.clearTimeout(columnsLoadTimer);
      cancelAnimationFrame(frame); sequenceRef.current?.kill();
      window.removeEventListener("resize", resize);
      geometry?.dispose(); material?.dispose(); bodyGeometry?.dispose(); bodyMaterial?.dispose();
      antennaGeometry?.dispose(); antennaMaterial?.dispose();
      trailGeometry?.dispose(); trailMaterial?.dispose();
      columnGeometry?.dispose(); columnMaterial?.dispose();
      trailSourceData = null;
      renderer.dispose(); renderer.domElement.remove();
      tunnelGeometry.dispose(); tunnelMaterial.dispose();
      walkScene.dispose();
      torsoOccluderGeometry.dispose(); headOccluderGeometry.dispose(); occluderMaterial.dispose();
      uniformsRef.current = null;
    };
  }, [playSequence]);

  const loadingProgress = ready ? Math.min(1, Math.max(0, progress)) : 0;
  const loadingComplete = ready && loadingProgress >= 1;

  return (
    <main ref={shellRef} className="study-shell">
      <div ref={stageRef} className="hero-stage">
        <div ref={dawnSkyRef} className="dawn-sky" aria-hidden="true" />
        <div ref={mountRef} className="canvas-mount" aria-hidden="true" />
        <HeroStory />

        <FlowArchitectCase
          caseGlowRef={caseGlowRef}
          caseWorldRef={caseWorldRef}
          caseSurfaceRef={caseSurfaceRef}
          caseCopyPlaneRef={caseCopyPlaneRef}
          caseScreenRef={caseScreenRef}
          flowGridRef={flowGridRef}
          flowPromptRef={flowPromptRef}
          flowPromptTextRef={flowPromptTextRef}
          flowNodeRefs={flowNodeRefs}
          flowEdgeRefs={flowEdgeRefs}
          flowPulseRefs={flowPulseRefs}
          flowToolbarRef={flowToolbarRef}
          flowRunRef={flowRunRef}
          flowResultRef={flowResultRef}
          caseIndexRef={caseIndexRef}
          caseTitleRef={caseTitleRef}
          caseDescriptionRef={caseDescriptionRef}
          caseMetaRef={caseMetaRef}
        />

        <ApproachScene
          approachRef={approachRef}
          calloutRefs={calloutRefs}
          principleRefs={principleRefs}
          resolutionRef={resolutionRef}
        />

        <SecondCaseStub veilRef={walkVeilRef} stubRef={caseTwoRef} />
        <ThirdCase sectionRef={caseThreeRef} />

        <LoadingLine progress={loadingProgress} complete={loadingComplete} />
      </div>
    </main>
  );
}

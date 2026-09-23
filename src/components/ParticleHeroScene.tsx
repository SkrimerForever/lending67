"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const MAX_PARTICLES = 92_000;
const SCENE_HEIGHT = 6.18;
const SCENE_WIDTH = 10.82;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMotion;
  attribute float aSize;
  attribute float aBrightness;
  attribute float aPhase;
  attribute float aStillness;
  varying float vBrightness;
  varying float vPhase;

  void main() {
    vec3 point = position;
    float movement = (1.0 - aStillness) * uMotion;
    point.x += sin(uTime * 0.16 + aPhase * 18.0 + point.y * 0.72) * 0.014 * movement;
    point.y += cos(uTime * 0.13 + aPhase * 13.0 + point.x * 0.48) * 0.011 * movement;
    point.z += sin(uTime * 0.11 + aPhase * 21.0) * 0.022 * movement;

    vec4 mvPosition = modelViewMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * uPixelRatio * (7.0 / -mvPosition.z);
    vBrightness = aBrightness;
    vPhase = aPhase;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying float vBrightness;
  varying float vPhase;

  void main() {
    vec2 centered = gl_PointCoord - 0.5;
    float radius = length(centered);
    if (radius > 0.5) discard;

    float core = 1.0 - smoothstep(0.13, 0.5, radius);
    float shimmer = 0.94 + sin(uTime * 0.42 + vPhase * 31.0) * 0.06;
    float luminance = min(1.0, vBrightness * shimmer);
    float alpha = core * mix(0.36, 0.94, vBrightness);
    gl_FragColor = vec4(vec3(luminance), alpha);
  }
`;

type Sample = {
  x: number;
  y: number;
  brightness: number;
};

function sampleReference(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const samples: Sample[] = [];

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const offset = (y * canvas.width + x) * 4;
      const luminance = (
        pixels[offset] * 0.2126
        + pixels[offset + 1] * 0.7152
        + pixels[offset + 2] * 0.0722
      ) / 255;

      if (luminance < 0.075) continue;
      const acceptance = Math.pow(luminance, 0.72) * 0.56;
      if (Math.random() > acceptance) continue;
      samples.push({ x, y, brightness: luminance });
    }
  }

  if (samples.length > MAX_PARTICLES) {
    for (let i = samples.length - 1; i > 0; i -= 1) {
      const swap = Math.floor(Math.random() * (i + 1));
      [samples[i], samples[swap]] = [samples[swap], samples[i]];
    }
    samples.length = MAX_PARTICLES;
  }

  const count = samples.length;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const brightness = new Float32Array(count);
  const phases = new Float32Array(count);
  const stillness = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const sample = samples[i];
    const nx = sample.x / canvas.width;
    const ny = sample.y / canvas.height;
    const offset = i * 3;
    const inFigureField = nx > 0.34 && nx < 0.65 && ny > 0.2 && ny < 0.64;
    const foreground = THREE.MathUtils.smoothstep(ny, 0.48, 1);
    const farField = 1 - THREE.MathUtils.smoothstep(ny, 0.22, 0.72);
    const figureWeight = inFigureField
      ? THREE.MathUtils.smoothstep(sample.brightness, 0.28, 0.86)
      : 0;

    positions[offset] = (nx - 0.5) * SCENE_WIDTH + (Math.random() - 0.5) * 0.008;
    positions[offset + 1] = (0.5 - ny) * SCENE_HEIGHT + (Math.random() - 0.5) * 0.008;
    positions[offset + 2] = foreground * 0.42 - farField * 0.64 + figureWeight * 0.3
      + (Math.random() - 0.5) * mixDepth(sample.brightness);

    sizes[i] = 1.12 + Math.pow(sample.brightness, 1.45) * 2.15
      + figureWeight * 0.42 + Math.random() * 0.42;
    brightness[i] = Math.min(1, 0.3 + sample.brightness * 0.78 + figureWeight * 0.13);
    phases[i] = Math.random();
    stillness[i] = Math.min(1, figureWeight * 0.92 + foreground * 0.34);
  }

  return { positions, sizes, brightness, phases, stillness };
}

function mixDepth(luminance: number) {
  return THREE.MathUtils.lerp(0.22, 0.045, Math.min(1, luminance));
}

export function ParticleHeroScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 9.15);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x020202, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let frame = 0;
    let disposed = false;

    const image = new Image();
    image.decoding = "async";
    image.src = "/hero-particle-reference.png";
    image.onload = () => {
      if (disposed) return;
      const data = sampleReference(image);
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(data.sizes, 1));
      geometry.setAttribute("aBrightness", new THREE.BufferAttribute(data.brightness, 1));
      geometry.setAttribute("aPhase", new THREE.BufferAttribute(data.phases, 1));
      geometry.setAttribute("aStillness", new THREE.BufferAttribute(data.stillness, 1));

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uMotion: { value: reduceMotion.matches ? 0 : 1 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      scene.add(new THREE.Points(geometry, material));
    };

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      if (material) material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    };

    const render = () => {
      frame = requestAnimationFrame(render);
      const elapsed = clock.getElapsedTime();
      if (material) {
        material.uniforms.uTime.value = elapsed;
        material.uniforms.uMotion.value = reduceMotion.matches ? 0 : 1;
      }
      renderer.render(scene, camera);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      disposed = true;
      image.onload = null;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      geometry?.dispose();
      material?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <main className="particle-hero-shell">
      <div ref={mountRef} className="particle-hero-canvas" aria-hidden="true" />
    </main>
  );
}

# Walker Flight Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the Flow Architect display turn, fly the camera forward into darkness, overtake a procedural particle walker just above the left shoulder, and fly into a silver light that becomes the case 02 placeholder.

**Architecture:** A pure `getWalkFlightState(scroll, options)` maps scroll progress to camera pose, walk phase, and layer reveals. An isolated `walk/` module owns the Three.js walker, ground, dust, and light, and is added to the existing scene/renderer. `ButterflyExperience` only wires it: it computes the state per frame, lets the walk scene override the camera from `1.98`, fades the DOM display out, and drives a DOM veil + case 02 placeholder.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Three.js 0.186 (GLSL ShaderMaterial), GSAP ScrollTrigger, Node 25 `node:test` with native type stripping.

**Spec:** `docs/superpowers/specs/2026-09-23-walker-flight-transition-design.md`

## Global Constraints

- Everything before `scrollTravel = 1.98` must look and time exactly as before.
- Scroll range: `scrollTween` target `1.98 → 2.60`; `.study-shell` `1980svh → 2535svh`; GSAP `timelineClock` duration `165.6 → 270.4`.
- All motion is derived from scroll; every phase reverses cleanly. No autoplay timelines for this scene.
- Walker: procedural, white-silver, no amber. Amber belongs to case 01.
- Silver light family: `rgb(205, 218, 226)`.
- One WebGL renderer/canvas; no second context.
- Walk scene world origin: `(0, 0, -200)`; walker walks toward `-Z`; the walker's left side is `-X`.
- Visual acceptance is done by the user in `npm run dev`; do not claim visual quality yourself.
- Do not change class names used by existing GSAP selectors or CSS.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/components/butterfly/walk/walkFlightState.ts` | Pure scroll → state mapping (camera spline, stride, reveals, reduced motion) |
| `src/components/butterfly/walk/walkFlightState.test.ts` | Boundary tests for the state mapping |
| `src/components/butterfly/walk/walkerBody.ts` | Pure body definition + point sampling (no three import) |
| `src/components/butterfly/walk/walkerBody.test.ts` | Sampling tests |
| `src/components/butterfly/walk/WalkerFigure.ts` | Walker `THREE.Points` + walk-cycle vertex shader |
| `src/components/butterfly/walk/walkEnvironment.ts` | Ground strip, dust, silver light |
| `src/components/butterfly/walk/createWalkScene.ts` | Assembles the group, applies state + camera, dispose |
| `src/components/butterfly/SecondCaseStub.tsx` | DOM light veil + case 02 placeholder |
| `src/components/butterfly/performance-profile.ts` | Adds walk particle counts |
| `src/components/butterfly/ButterflyExperience.tsx` | Wiring, scroll extension, DOM fades |
| `src/app/globals.css` | Shell height, veil and placeholder styles |

---

### Task 1: Scroll → walk-flight state

**Files:**
- Create: `src/components/butterfly/walk/walkFlightState.ts`
- Create: `src/components/butterfly/walk/walkFlightState.test.ts`
- Modify: `package.json` (scripts)
- Modify: `tsconfig.json` (compilerOptions)

**Interfaces:**
- Produces:
  - `type Vec3 = [number, number, number]`
  - `type WalkFlightOptions = { reducedMotion: boolean; narrow: boolean }`
  - `type WalkFlightState = { active: boolean; darknessDive: number; groundReveal: number; dustStreak: number; walkerReveal: number; stride: number; walkerZ: number; cameraPosition: Vec3; cameraTarget: Vec3; lightReveal: number; whiteout: number; caseReveal: number }`
  - `getWalkFlightState(scroll: number, options: WalkFlightOptions): WalkFlightState`
  - constants `WALK_START = 1.98`, `WALK_END = 2.6`, `LIGHT_Y = 1.7`, `LIGHT_Z = -40`, `CYCLE_LENGTH = 1.1`
  - All positions are local to the walk scene origin.

- [ ] **Step 1: Enable TS test imports and the test script**

In `tsconfig.json` `compilerOptions`, add after `"noEmit": true,`:

```json
    "allowImportingTsExtensions": true,
```

In `package.json` `scripts`, add after `"lint": "eslint"` (add a comma to the previous line):

```json
    "test": "node --test \"src/**/*.test.ts\""
```

- [ ] **Step 2: Write the failing tests**

Create `src/components/butterfly/walk/walkFlightState.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getWalkFlightState, WALK_START } from "./walkFlightState.ts";

const desktop = { reducedMotion: false, narrow: false };
const narrow = { reducedMotion: false, narrow: true };
const reduced = { reducedMotion: true, narrow: false };

test("inactive before the operator turn completes", () => {
  const state = getWalkFlightState(1.9, desktop);
  assert.equal(state.active, false);
  assert.equal(state.darknessDive, 0);
  assert.equal(state.caseReveal, 0);
  assert.equal(getWalkFlightState(WALK_START, desktop).active, false);
});

test("the dive into darkness starts right after the turn", () => {
  const state = getWalkFlightState(2.02, desktop);
  assert.equal(state.active, true);
  assert.ok(state.darknessDive > 0 && state.darknessDive < 1);
  assert.equal(getWalkFlightState(2.06, desktop).darknessDive, 1);
});

test("the camera starts well behind the walker", () => {
  const state = getWalkFlightState(2.06, desktop);
  assert.ok(state.cameraPosition[2] > state.walkerZ + 5);
  assert.ok(state.cameraPosition[1] > 2.4);
});

test("the camera passes just above and left of the left shoulder", () => {
  const state = getWalkFlightState(2.24, desktop);
  const [x, y, z] = state.cameraPosition;
  assert.ok(Math.abs(z - state.walkerZ) < 0.15, `z gap ${z - state.walkerZ}`);
  assert.ok(y - 1.45 > 0.2 && y - 1.45 < 0.6, `height above shoulder ${y - 1.45}`);
  assert.ok(x > -0.6 && x < -0.2, `x ${x}`);
});

test("the camera is ahead of the walker after the overtake", () => {
  const state = getWalkFlightState(2.32, desktop);
  assert.ok(state.cameraPosition[2] < state.walkerZ - 2);
});

test("the walker completes about three steps", () => {
  const start = getWalkFlightState(2.02, desktop).stride;
  const end = getWalkFlightState(2.6, desktop).stride;
  assert.ok(Math.abs(end - start - 1.5) < 1e-9);
});

test("the flight ends inside the light and reveals case 02", () => {
  assert.equal(getWalkFlightState(2.5, desktop).whiteout, 1);
  const end = getWalkFlightState(2.6, desktop);
  assert.equal(end.caseReveal, 1);
  assert.ok(end.cameraPosition[2] < -38);
});

test("camera travel is continuous", () => {
  let previous = getWalkFlightState(1.981, desktop).cameraPosition;
  for (let scroll = 1.982; scroll <= 2.6; scroll += 0.001) {
    const next = getWalkFlightState(scroll, desktop).cameraPosition;
    const step = Math.hypot(next[0] - previous[0], next[1] - previous[1], next[2] - previous[2]);
    assert.ok(step < 0.5, `jump ${step} at ${scroll}`);
    previous = next;
  }
});

test("narrow viewports pass the shoulder wider", () => {
  const wide = getWalkFlightState(2.24, desktop).cameraPosition[0];
  const tight = getWalkFlightState(2.24, narrow).cameraPosition[0];
  assert.ok(tight < wide);
});

test("reduced motion shows three stable states", () => {
  const first = getWalkFlightState(2.1, reduced);
  const firstLater = getWalkFlightState(2.18, reduced);
  assert.deepEqual(first.cameraPosition, firstLater.cameraPosition);
  assert.equal(first.stride, firstLater.stride);
  assert.equal(first.whiteout, 0);
  const light = getWalkFlightState(2.3, reduced);
  assert.equal(light.whiteout, 1);
  assert.equal(light.caseReveal, 0);
  assert.deepEqual(light.cameraPosition, first.cameraPosition);
  assert.equal(getWalkFlightState(2.55, reduced).caseReveal, 1);
  assert.equal(first.dustStreak, 0);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `./walkFlightState.ts`.

- [ ] **Step 4: Implement the state mapping**

Create `src/components/butterfly/walk/walkFlightState.ts`:

```ts
export type Vec3 = [number, number, number];

export type WalkFlightOptions = {
  reducedMotion: boolean;
  narrow: boolean;
};

export type WalkFlightState = {
  active: boolean;
  darknessDive: number;
  groundReveal: number;
  dustStreak: number;
  walkerReveal: number;
  stride: number;
  walkerZ: number;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  lightReveal: number;
  whiteout: number;
  caseReveal: number;
};

export const WALK_START = 1.98;
export const WALK_END = 2.6;
export const LIGHT_Y = 1.7;
export const LIGHT_Z = -40;
export const CYCLE_LENGTH = 1.1;

const STRIDE_OFFSET = 0.3;
const STRIDE_CYCLES = 1.5;
const STRIDE_START = 2.02;
const STRIDE_END = 2.42;

// Scroll time of each camera knot. The shoulder pass happens at 2.24.
const KNOT_TIMES = [1.98, 2.06, 2.16, 2.24, 2.32, 2.42, 2.5];

const DESKTOP_KNOTS: Vec3[] = [
  [-1.8, 3.1, 18],
  [-1.6, 2.9, 8],
  [-0.9, 2.3, 2],
  [-0.36, 1.86, -0.9],
  [-0.12, 1.74, -5.5],
  [0, LIGHT_Y, -20],
  [0, LIGHT_Y, LIGHT_Z + 1.2],
];

const NARROW_KNOTS: Vec3[] = [
  [-1.1, 3.1, 19],
  [-0.9, 2.9, 9],
  [-0.7, 2.35, 2.2],
  [-0.55, 2.0, -0.9],
  [-0.2, 1.76, -5.5],
  [0, LIGHT_Y, -20],
  [0, LIGHT_Y, LIGHT_Z + 1.2],
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const smooth = (value: number, start: number, end: number) => {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
  const m1 = (p2 - p0) * 0.5;
  const m2 = (p3 - p1) * 0.5;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1
    + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2;
}

function cameraOnPath(scroll: number, knots: Vec3[]): Vec3 {
  const last = KNOT_TIMES.length - 1;
  if (scroll <= KNOT_TIMES[0]) return [...knots[0]];
  if (scroll >= KNOT_TIMES[last]) return [...knots[last]];
  let segment = 0;
  while (scroll > KNOT_TIMES[segment + 1]) segment += 1;
  const t = (scroll - KNOT_TIMES[segment]) / (KNOT_TIMES[segment + 1] - KNOT_TIMES[segment]);
  const p0 = knots[Math.max(0, segment - 1)];
  const p1 = knots[segment];
  const p2 = knots[segment + 1];
  const p3 = knots[Math.min(last, segment + 2)];
  return [0, 1, 2].map((axis) => catmullRom(p0[axis], p1[axis], p2[axis], p3[axis], t)) as Vec3;
}

function lookAhead(scroll: number, position: Vec3, narrow: boolean): Vec3 {
  const leftBias = narrow ? 0.3 : 0.8;
  const centre = smooth(scroll, 2.18, 2.36);
  return [
    lerp(position[0] - leftBias, 0, centre),
    lerp(2.5, LIGHT_Y, smooth(scroll, 2.12, 2.3)),
    position[2] - 8,
  ];
}

const walkerZFor = (stride: number) => -(stride - STRIDE_OFFSET) * CYCLE_LENGTH;

const INACTIVE: WalkFlightState = {
  active: false,
  darknessDive: 0,
  groundReveal: 0,
  dustStreak: 0,
  walkerReveal: 0,
  stride: STRIDE_OFFSET,
  walkerZ: 0,
  cameraPosition: [...DESKTOP_KNOTS[0]],
  cameraTarget: [DESKTOP_KNOTS[0][0], 2.5, DESKTOP_KNOTS[0][2] - 8],
  lightReveal: 0,
  whiteout: 0,
  caseReveal: 0,
};

export function getWalkFlightState(scroll: number, options: WalkFlightOptions): WalkFlightState {
  if (scroll <= WALK_START) return { ...INACTIVE, cameraPosition: [...INACTIVE.cameraPosition] };
  const knots = options.narrow ? NARROW_KNOTS : DESKTOP_KNOTS;

  if (options.reducedMotion) {
    const settled = smooth(scroll, 1.98, 2.02);
    const light = smooth(scroll, 2.2, 2.24);
    const stride = STRIDE_OFFSET + 0.25;
    const position: Vec3 = [...knots[1]];
    return {
      active: true,
      darknessDive: settled,
      groundReveal: settled,
      dustStreak: 0,
      walkerReveal: settled,
      stride,
      walkerZ: walkerZFor(stride),
      cameraPosition: position,
      cameraTarget: [position[0] - (options.narrow ? 0.3 : 0.8), 2.5, position[2] - 8],
      lightReveal: light,
      whiteout: light,
      caseReveal: smooth(scroll, 2.42, 2.46),
    };
  }

  const stride = STRIDE_OFFSET + STRIDE_CYCLES * clamp01((scroll - STRIDE_START) / (STRIDE_END - STRIDE_START));
  const cameraPosition = cameraOnPath(scroll, knots);
  const whiteout = smooth(scroll, 2.44, 2.5);
  const diveStreak = smooth(scroll, 1.98, 2.02) * (1 - smooth(scroll, 2.04, 2.1));
  const rushStreak = smooth(scroll, 2.36, 2.46) * (1 - whiteout);
  return {
    active: true,
    darknessDive: smooth(scroll, 1.98, 2.06),
    groundReveal: smooth(scroll, 2.0, 2.1),
    dustStreak: Math.max(diveStreak, rushStreak),
    walkerReveal: smooth(scroll, 2.02, 2.1),
    stride,
    walkerZ: walkerZFor(stride),
    cameraPosition,
    cameraTarget: lookAhead(scroll, cameraPosition, options.narrow),
    lightReveal: smooth(scroll, 2.3, 2.44),
    whiteout,
    caseReveal: smooth(scroll, 2.5, 2.56),
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all 10 tests PASS. Do not add `"type": "module"` to `package.json` (it changes how Next config files load). If Node refuses to parse the `.ts` test as ESM, change the script to `node --experimental-strip-types --experimental-detect-module --test \"src/**/*.test.ts\"`.

- [ ] **Step 6: Lint and commit**

Run: `npm run lint`
Expected: no new errors.

```bash
git add package.json tsconfig.json src/components/butterfly/walk/walkFlightState.ts src/components/butterfly/walk/walkFlightState.test.ts
git commit -m "feat: map scroll to walker flight state"
```

---

### Task 2: Procedural walker body sampling

**Files:**
- Create: `src/components/butterfly/walk/walkerBody.ts`
- Create: `src/components/butterfly/walk/walkerBody.test.ts`
- Modify: `docs/superpowers/specs/2026-09-23-walker-flight-transition-design.md` (fix part count 15 → 16)

**Interfaces:**
- Produces:
  - `WALKER_BONE_COUNT = 16` with bone ids: `0` pelvis, `1` ribcage, `2` neck, `3` head, `4..6` left upper arm/forearm/hand, `7..9` right upper arm/forearm/hand, `10..12` left thigh/shin/foot, `13..15` right thigh/shin/foot.
  - `WALKER_JOINTS` (numbers used by the shader): `hipY 0.95, spineY 0.13, neckY 0.42, neckLength 0.12, shoulderX 0.2, shoulderY 0.37, hipX 0.1, hipDrop -0.05, thigh 0.43, shin 0.41, upperArm 0.29, forearm 0.26, ankleHeight 0.06`.
  - `sampleWalkerBody(count: number, random?: () => number): { local: Float32Array; bone: Float32Array; seed: Float32Array }` — `local` is xyz relative to the bone's joint in rest pose (limbs hang along `-Y`, feet point toward `-Z`).

- [ ] **Step 1: Fix the spec's part count**

In the spec, replace `- **Body:** 15 parts —` with `- **Body:** 16 parts —`.

- [ ] **Step 2: Write the failing tests**

Create `src/components/butterfly/walk/walkerBody.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { sampleWalkerBody, WALKER_BONE_COUNT } from "./walkerBody.ts";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test("returns the requested number of points", () => {
  const body = sampleWalkerBody(5000, seeded(1));
  assert.equal(body.local.length, 5000 * 3);
  assert.equal(body.bone.length, 5000);
  assert.equal(body.seed.length, 5000);
});

test("every bone receives points", () => {
  const body = sampleWalkerBody(5000, seeded(2));
  const counts = new Array(WALKER_BONE_COUNT).fill(0);
  body.bone.forEach((bone) => { counts[bone] += 1; });
  counts.forEach((count, bone) => assert.ok(count > 10, `bone ${bone} has ${count}`));
});

test("limbs hang below their joints and feet point forward", () => {
  const body = sampleWalkerBody(5000, seeded(3));
  let footZ = 0;
  let feet = 0;
  for (let i = 0; i < body.bone.length; i += 1) {
    const bone = body.bone[i];
    const y = body.local[i * 3 + 1];
    if (bone === 10 || bone === 11 || bone === 4) assert.ok(y <= 0.09, `bone ${bone} y ${y}`);
    if (bone === 12 || bone === 15) { footZ += body.local[i * 3 + 2]; feet += 1; }
  }
  assert.ok(footZ / feet < -0.03);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot find module `./walkerBody.ts`.

- [ ] **Step 4: Implement the body definition and sampler**

Create `src/components/butterfly/walk/walkerBody.ts`:

```ts
type Vec3 = [number, number, number];

type Ellipsoid = { bone: number; kind: "ellipsoid"; center: Vec3; radii: Vec3 };
type Capsule = {
  bone: number;
  kind: "capsule";
  length: number;
  radiusStart: number;
  radiusEnd: number;
  direction: 1 | -1;
};
type BodyPart = Ellipsoid | Capsule;

export const WALKER_BONE_COUNT = 16;

export const WALKER_JOINTS = {
  hipY: 0.95,
  spineY: 0.13,
  neckY: 0.42,
  neckLength: 0.12,
  shoulderX: 0.2,
  shoulderY: 0.37,
  hipX: 0.1,
  hipDrop: -0.05,
  thigh: 0.43,
  shin: 0.41,
  upperArm: 0.29,
  forearm: 0.26,
  ankleHeight: 0.06,
} as const;

const J = WALKER_JOINTS;

const arm = (offset: number): BodyPart[] => [
  { bone: offset, kind: "capsule", length: J.upperArm, radiusStart: 0.052, radiusEnd: 0.042, direction: -1 },
  { bone: offset + 1, kind: "capsule", length: J.forearm, radiusStart: 0.042, radiusEnd: 0.031, direction: -1 },
  { bone: offset + 2, kind: "ellipsoid", center: [0, -0.08, 0], radii: [0.03, 0.08, 0.045] },
];

const leg = (offset: number): BodyPart[] => [
  { bone: offset, kind: "capsule", length: J.thigh, radiusStart: 0.08, radiusEnd: 0.055, direction: -1 },
  { bone: offset + 1, kind: "capsule", length: J.shin, radiusStart: 0.055, radiusEnd: 0.038, direction: -1 },
  { bone: offset + 2, kind: "ellipsoid", center: [0, -0.025, -0.07], radii: [0.045, 0.035, 0.12] },
];

const PARTS: BodyPart[] = [
  { bone: 0, kind: "ellipsoid", center: [0, 0.02, 0], radii: [0.17, 0.12, 0.11] },
  { bone: 1, kind: "ellipsoid", center: [0, 0.2, 0], radii: [0.19, 0.25, 0.12] },
  { bone: 2, kind: "capsule", length: J.neckLength, radiusStart: 0.055, radiusEnd: 0.05, direction: 1 },
  { bone: 3, kind: "ellipsoid", center: [0, 0.11, 0.01], radii: [0.085, 0.115, 0.1] },
  ...arm(4),
  ...arm(7),
  ...leg(10),
  ...leg(13),
];

function surfaceArea(part: BodyPart) {
  if (part.kind === "capsule") {
    return 2 * Math.PI * ((part.radiusStart + part.radiusEnd) / 2) * part.length;
  }
  const [a, b, c] = part.radii;
  const p = 1.6;
  return 4 * Math.PI * Math.pow((Math.pow(a * b, p) + Math.pow(a * c, p) + Math.pow(b * c, p)) / 3, 1 / p);
}

function unitVector(random: () => number): Vec3 {
  const z = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return [r * Math.cos(angle), r * Math.sin(angle), z];
}

export function sampleWalkerBody(count: number, random: () => number = Math.random) {
  const local = new Float32Array(count * 3);
  const bone = new Float32Array(count);
  const seed = new Float32Array(count);
  const areas = PARTS.map(surfaceArea);
  const total = areas.reduce((sum, area) => sum + area, 0);
  const cumulative: number[] = [];
  areas.reduce((sum, area) => { cumulative.push((sum + area) / total); return sum + area; }, 0);

  for (let i = 0; i < count; i += 1) {
    // Guarantee every part a few points, then distribute by surface area.
    const partIndex = i < PARTS.length * 12
      ? i % PARTS.length
      : (() => { const pick = random(); return cumulative.findIndex((edge) => pick <= edge); })();
    const part = PARTS[Math.max(0, partIndex)];
    // Slight inward scatter gives volume and a soft, dusty edge.
    const inset = 1 - 0.14 * random() * random();
    let x: number;
    let y: number;
    let z: number;
    if (part.kind === "ellipsoid") {
      const [ux, uy, uz] = unitVector(random);
      x = part.center[0] + ux * part.radii[0] * inset;
      y = part.center[1] + uy * part.radii[1] * inset;
      z = part.center[2] + uz * part.radii[2] * inset;
    } else {
      const along = random();
      const angle = random() * Math.PI * 2;
      const radius = (part.radiusStart + (part.radiusEnd - part.radiusStart) * along) * inset;
      x = Math.cos(angle) * radius;
      y = part.direction * along * part.length;
      z = Math.sin(angle) * radius * 0.86;
    }
    local[i * 3] = x;
    local[i * 3 + 1] = y;
    local[i * 3 + 2] = z;
    bone[i] = part.bone;
    seed[i] = random();
  }
  return { local, bone, seed };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests PASS (Task 1 + Task 2).

- [ ] **Step 6: Lint and commit**

Run: `npm run lint` — expected: no new errors.

```bash
git add src/components/butterfly/walk/walkerBody.ts src/components/butterfly/walk/walkerBody.test.ts docs/superpowers/specs/2026-09-23-walker-flight-transition-design.md
git commit -m "feat: sample procedural walker body"
```

---

### Task 3: Walker figure with walk-cycle shader

**Files:**
- Create: `src/components/butterfly/walk/WalkerFigure.ts`
- Modify: `src/components/butterfly/performance-profile.ts`

**Interfaces:**
- Consumes: `sampleWalkerBody`, `WALKER_JOINTS` from Task 2.
- Produces:
  - `PerformanceProfile` gains `walkerParticleCount`, `walkGroundParticleCount`, `walkDustParticleCount` (HIGH 14 000 / 26 000 / 1 500; BALANCED 9 000 / 16 000 / 1 000; LOW 5 000 / 9 000 / 600).
  - `type WalkerFigure = { points: THREE.Points; update(stride: number, time: number, reveal: number): void; setPixelRatio(value: number): void; dispose(): void }`
  - `createWalkerFigure(count: number, pixelRatio: number): WalkerFigure` — `points` is positioned by the caller (`points.position.z = walkerZ`).

- [ ] **Step 1: Add walk particle counts to the performance profile**

In `performance-profile.ts` add to the `PerformanceProfile` type:

```ts
  walkerParticleCount: number;
  walkGroundParticleCount: number;
  walkDustParticleCount: number;
```

and to the three profiles:

```ts
// HIGH
  walkerParticleCount: 14_000,
  walkGroundParticleCount: 26_000,
  walkDustParticleCount: 1_500,
// BALANCED
  walkerParticleCount: 9_000,
  walkGroundParticleCount: 16_000,
  walkDustParticleCount: 1_000,
// LOW
  walkerParticleCount: 5_000,
  walkGroundParticleCount: 9_000,
  walkDustParticleCount: 600,
```

- [ ] **Step 2: Implement the figure**

Create `src/components/butterfly/walk/WalkerFigure.ts`:

```ts
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
```

- [ ] **Step 3: Type-check through lint and tests**

Run: `npm run lint && npm test`
Expected: no new lint errors; all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/butterfly/walk/WalkerFigure.ts src/components/butterfly/performance-profile.ts
git commit -m "feat: add procedural particle walker"
```

---

### Task 4: Ground, dust, and silver light

**Files:**
- Create: `src/components/butterfly/walk/walkEnvironment.ts`

**Interfaces:**
- Consumes: `WalkFlightState`, `LIGHT_Y`, `LIGHT_Z` from Task 1.
- Produces:
  - `type WalkEnvironment = { group: THREE.Group; update(state: WalkFlightState, time: number): void; setPixelRatio(value: number): void; dispose(): void }`
  - `createWalkEnvironment(counts: { ground: number; dust: number }, pixelRatio: number): WalkEnvironment`

- [ ] **Step 1: Implement the environment**

Create `src/components/butterfly/walk/walkEnvironment.ts`:

```ts
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
    const x = (Math.random() * 2 - 1) * 7;
    const z = 14 - Math.random() * 62;
    const band = Math.pow(0.5 + 0.5 * Math.sin((x * 1.25 + Math.sin(z * 0.17) * 2.4 + z * 0.05) * 2.1), 3);
    const edge = 1 - smoothstep(Math.abs(x), 4.5, 7);
    if (Math.random() > (0.18 + 0.82 * band) * edge) continue;
    // The walking path stays flat; the terrain rises into soft banks at the sides.
    const hill = 0.28 * Math.sin(x * 0.55 + z * 0.13) + 0.16 * Math.sin(z * 0.31 - x * 0.8);
    const sides = smoothstep(Math.abs(x), 0.7, 3.2);
    positions[written * 3] = x;
    positions[written * 3 + 1] = hill * sides + 0.35 * smoothstep(Math.abs(x), 1.5, 6) - 0.01
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
        vAlpha = uReveal * mix(0.3, 0.78, aSeed) * shimmer * smoothstep(48.0, 18.0, distanceToCamera);
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
          * smoothstep(0.3, 1.2, distanceToCamera) * smoothstep(50.0, 20.0, distanceToCamera);
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
        float glow = exp(-dot(q, q) * 3.2) * 0.35;
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
      dustUniforms.uReveal.value = state.darknessDive;
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
```

- [ ] **Step 2: Lint and test**

Run: `npm run lint && npm test`
Expected: no new lint errors; all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/butterfly/walk/walkEnvironment.ts
git commit -m "feat: add walk ground, dust, and silver light"
```

---

### Task 5: Assemble the walk scene and wire it into the experience

**Files:**
- Create: `src/components/butterfly/walk/createWalkScene.ts`
- Modify: `src/components/butterfly/ButterflyExperience.tsx` (imports ~L3-11; `scrollTween` ~L466-475; `timelineClock` ~L547; scene setup after tunnel ~L639; `resize` ~L748-758; render loop ~L1207, ~L1447-1451, ~L1569-1587, ~L1614-1615; cleanup ~L1619-1636)
- Modify: `src/app/globals.css:17`

**Interfaces:**
- Consumes: `getWalkFlightState`, `WalkFlightState` (Task 1); `createWalkerFigure` (Task 3); `createWalkEnvironment` (Task 4); profile counts (Task 3).
- Produces:
  - `WALK_ORIGIN: THREE.Vector3` = `(0, 0, -200)`
  - `type WalkScene = { group: THREE.Group; update(state: WalkFlightState, time: number, camera: THREE.PerspectiveCamera): void; setPixelRatio(value: number): void; dispose(): void }`
  - `createWalkScene(profile: PerformanceProfile, pixelRatio: number): WalkScene`
  - In `ButterflyExperience` render loop: a `walkState` const available to Task 6.

- [ ] **Step 1: Implement the scene assembly**

Create `src/components/butterfly/walk/createWalkScene.ts`:

```ts
import * as THREE from "three";
import type { PerformanceProfile } from "../performance-profile";
import { createWalkEnvironment } from "./walkEnvironment";
import { createWalkerFigure } from "./WalkerFigure";
import type { WalkFlightState } from "./walkFlightState";

export type WalkScene = {
  group: THREE.Group;
  update(state: WalkFlightState, time: number, camera: THREE.PerspectiveCamera): void;
  setPixelRatio(value: number): void;
  dispose(): void;
};

// Far away from the butterfly and columns world, which is hidden after 1.22.
export const WALK_ORIGIN = new THREE.Vector3(0, 0, -200);

export function createWalkScene(profile: PerformanceProfile, pixelRatio: number): WalkScene {
  const group = new THREE.Group();
  group.position.copy(WALK_ORIGIN);
  group.visible = false;
  const walker = createWalkerFigure(profile.walkerParticleCount, pixelRatio);
  const environment = createWalkEnvironment(
    { ground: profile.walkGroundParticleCount, dust: profile.walkDustParticleCount },
    pixelRatio,
  );
  group.add(environment.group);
  group.add(walker.points);
  const target = new THREE.Vector3();

  return {
    group,
    update(state, time, camera) {
      group.visible = state.active;
      if (!state.active) return;
      walker.points.position.z = state.walkerZ;
      walker.update(state.stride, time, state.walkerReveal);
      environment.update(state, time);
      // The camera pose comes straight from scroll so reversal is exact.
      camera.position.set(...state.cameraPosition).add(WALK_ORIGIN);
      target.set(...state.cameraTarget).add(WALK_ORIGIN);
      camera.lookAt(target);
    },
    setPixelRatio(value) {
      walker.setPixelRatio(value);
      environment.setPixelRatio(value);
    },
    dispose() {
      walker.dispose();
      environment.dispose();
    },
  };
}
```

- [ ] **Step 2: Extend the scroll range without stretching earlier scenes**

In `ButterflyExperience.tsx`, `scrollTween`: change `value: 1.98,` to `value: 2.6,`.

Replace the `timelineClock` line and its comment:

```ts
        // Keep the original scene timings aligned after the dedicated
        // post-columns flight range extended scrollRef from 1 to 1.18.
        .to(timelineClock, { value: 1, duration: 165.6, ease: "none" }, 169);
```

with:

```ts
        // Keep the original scene timings aligned while scrollRef grows:
        // the timeline total (169 + duration) scales with the scroll range
        // (334.6 at 1.98 → 439.4 at 2.60 for the walker flight).
        .to(timelineClock, { value: 1, duration: 270.4, ease: "none" }, 169);
```

In `globals.css` line 17 change `height: 1980svh;` to `height: 2535svh;`.

- [ ] **Step 3: Create, resize, and dispose the walk scene**

Add imports:

```ts
import { createWalkScene } from "./walk/createWalkScene";
import { getWalkFlightState } from "./walk/walkFlightState";
```

After `scene.add(tunnelPoints);` add:

```ts
    const walkScene = createWalkScene(performanceProfile, pixelRatio());
    scene.add(walkScene.group);
```

In `resize`, after `columnUniforms.uPixelRatio.value = nextPixelRatio;` add:

```ts
      walkScene.setPixelRatio(nextPixelRatio);
```

In the cleanup, after `tunnelGeometry.dispose(); tunnelMaterial.dispose();` add:

```ts
      walkScene.dispose();
```

- [ ] **Step 4: Compute the walk state and hand the camera over**

In `render`, directly after `const scrollTravel = reduceMotion.matches ? 0 : scrollRef.current.value;` add:

```ts
      // Reduced motion freezes the earlier world at 0, but the walk stage
      // still needs the raw scroll to step through its three stable states.
      const walkState = getWalkFlightState(scrollRef.current.value, {
        reducedMotion: reduceMotion.matches,
        narrow: camera.aspect < 0.9,
      });
```

Replace:

```ts
      camera.lookAt(cameraTarget);
      renderer.render(scene, camera);
```

with:

```ts
      camera.lookAt(cameraTarget);
      // From 1.98 the walk scene owns the camera pose.
      walkScene.update(walkState, sceneTime, camera);
      renderer.render(scene, camera);
```

- [ ] **Step 5: Fade the turned display into darkness**

In the `caseGlowRef` block replace:

```ts
        caseGlowRef.current.style.opacity = String(glowIn * 0.72 * (1 - operatorTurn * 0.82));
```

with:

```ts
        caseGlowRef.current.style.opacity = String(
          glowIn * 0.72 * (1 - operatorTurn * 0.82) * (1 - walkState.darknessDive),
        );
```

In the `caseWorldRef` block replace:

```ts
        caseWorldRef.current.style.transform = `perspective(1400px) rotateZ(${turnRoll}deg) rotateY(${turnYaw}deg) translate3d(${turnX}vw, ${turnY}vh, ${pullbackZ + turnZ}px)`;
```

with:

```ts
        caseWorldRef.current.style.transform = `perspective(1400px) translate3d(${-walkState.darknessDive * 24}vw, 0, 0) rotateZ(${turnRoll}deg) rotateY(${turnYaw}deg) translate3d(${turnX}vw, ${turnY}vh, ${pullbackZ + turnZ}px)`;
        caseWorldRef.current.style.opacity = String(1 - walkState.darknessDive);
```

- [ ] **Step 6: Lint, test, and smoke-check in the browser**

Run: `npm run lint && npm test`
Expected: no new lint errors; all tests PASS.

With `npm run dev` running, open `http://localhost:3000`, scroll to the end, and check the browser console for WebGL shader compile errors. Expected: none. (Visual judgement is left to the user in Task 6.)

- [ ] **Step 7: Commit**

```bash
git add src/components/butterfly/walk/createWalkScene.ts src/components/butterfly/ButterflyExperience.tsx src/app/globals.css
git commit -m "feat: fly past the walker after the display turn"
```

---

### Task 6: Light veil and case 02 placeholder

**Files:**
- Create: `src/components/butterfly/SecondCaseStub.tsx`
- Modify: `src/components/butterfly/ButterflyExperience.tsx` (refs ~L400-418; render loop before `walkScene.update`; JSX ~L1648-1676)
- Modify: `src/app/globals.css` (append before the `@media (max-width: 640px)` block, ~L952)

**Interfaces:**
- Consumes: `walkState.whiteout`, `walkState.caseReveal` from Task 5.
- Produces: `SecondCaseStub({ veilRef, stubRef })`, DOM classes `.walk-light-veil` and `.case-two`.

- [ ] **Step 1: Create the placeholder component**

Create `src/components/butterfly/SecondCaseStub.tsx`:

```tsx
import type { RefObject } from "react";

type SecondCaseStubProps = {
  veilRef: RefObject<HTMLDivElement | null>;
  stubRef: RefObject<HTMLElement | null>;
};

export function SecondCaseStub({ veilRef, stubRef }: SecondCaseStubProps) {
  return (
    <>
      <div ref={veilRef} className="walk-light-veil" aria-hidden="true" />
      <section ref={stubRef} className="case-two" aria-label="Кейс 02">
        <div className="case-copy">
          <span className="case-copy__index">04 / КЕЙС 02</span>
          <div className="case-copy__body">
            <h2 className="case-copy__title">
              <span>СЛЕДУЮЩИЙ ПРОЕКТ.</span>
              <span>СКОРО ЗДЕСЬ.</span>
            </h2>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Add the styles**

In `globals.css`, before `@media (max-width: 640px) {`, add:

```css
.walk-light-veil {
  position: absolute;
  z-index: 4;
  inset: 0;
  background: radial-gradient(ellipse 70% 60% at 50% 48%, rgba(232, 239, 243, 0.96), rgba(205, 218, 226, 0.88) 55%, rgba(160, 174, 184, 0.8));
  opacity: 0;
  pointer-events: none;
  will-change: opacity;
}
.case-two {
  position: absolute;
  z-index: 5;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 70% at 62% 50%, rgba(205, 218, 226, 0.07), transparent 70%),
    #030405;
  opacity: 0;
  pointer-events: none;
  will-change: opacity, transform;
}
.case-two .case-copy__index,
.case-two .case-copy__title { opacity: 1; }
```

- [ ] **Step 3: Wire refs, per-frame opacity, and JSX**

Add refs next to the other case refs:

```ts
  const walkVeilRef = useRef<HTMLDivElement>(null);
  const caseTwoRef = useRef<HTMLElement>(null);
```

Add import:

```ts
import { SecondCaseStub } from "./SecondCaseStub";
```

In `render`, directly before `walkScene.update(walkState, sceneTime, camera);` add:

```ts
      if (walkVeilRef.current) {
        walkVeilRef.current.style.opacity = String(walkState.whiteout * (1 - walkState.caseReveal));
      }
      if (caseTwoRef.current) {
        caseTwoRef.current.style.opacity = String(walkState.caseReveal);
        caseTwoRef.current.style.transform = `scale(${1.04 - walkState.caseReveal * 0.04})`;
      }
```

In the JSX, after the `<ApproachScene ... />` element and before `<LoadingLine ... />`, add:

```tsx
        <SecondCaseStub veilRef={walkVeilRef} stubRef={caseTwoRef} />
```

- [ ] **Step 4: Lint and test**

Run: `npm run lint && npm test`
Expected: no new lint errors; all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/butterfly/SecondCaseStub.tsx src/components/butterfly/ButterflyExperience.tsx src/app/globals.css
git commit -m "feat: fly into the light and reveal case 02 placeholder"
```

- [ ] **Step 6: Hand over for visual review**

Ensure `npm run dev` is running and tell the user to review at `http://localhost:3000`, forward and backward, against the spec's acceptance criteria:
- everything before the turn unchanged;
- forward motion into darkness with dust;
- the walker reads as walking, 2–3 steps, starting lower right, back to camera;
- overtake just above the left shoulder, figure exits lower right;
- the flight ends inside the silver light, which becomes the `04 / КЕЙС 02` placeholder;
- clean reversal; reduced-motion and narrow-viewport behaviour.

Stop and wait for the user's feedback; tuning (knots, gait curves, densities) happens from that feedback.

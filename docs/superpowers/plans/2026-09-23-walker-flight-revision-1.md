# Walker Flight Revision 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the capsule-looking walker with one continuous SDF-sampled human silhouette with two-bone skinning, narrow the ground into a path, and soften the hand-off from the case 01 display.

**Architecture:** `walkerBody.ts` becomes an SDF body sampler that emits rest positions, two bone ids, and a blend weight per point; `WalkerFigure.ts` gets a vertex shader that poses 16 bones from `uStride` and blends two bone transforms per point. `walkFlightState.ts` starts at `1.90` with new `dustReveal` and eased reveals; `walkEnvironment.ts` narrows the ground and fixes the halo; `ButterflyExperience.tsx` pushes and blurs the display while it fades.

**Tech Stack:** TypeScript, Three.js 0.186 GLSL (WebGL2 / GLSL ES 3.0 via three's ShaderMaterial), Node 25 `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-23-walker-flight-transition-design.md` — section "Revision 1".

## Global Constraints

- Everything before `scrollTravel = 1.90` must look and time exactly as before.
- Walk stage starts at `WALK_START = 1.90`; display fade `1.92–2.08`; dust `1.90–2.00`; ground outline from `1.92`, full by `2.10`.
- Shoulder pass stays at scroll `2.24`; all later timings (light `2.30–2.44`, whiteout `2.44–2.50`, case reveal `2.50–2.56`) unchanged.
- Walker: white-silver only, left side is `-X`, walks toward `-Z`, back is `+Z`.
- Ground: `x ∈ [-2.8, 2.8]`; counts HIGH 12 000 / BALANCED 8 000 / LOW 4 500.
- Visual acceptance is the user's; do not claim visual quality.

---

### Task R1: Retime the walk stage for a softer hand-off

**Files:**
- Modify: `src/components/butterfly/walk/walkFlightState.ts`
- Modify: `src/components/butterfly/walk/walkFlightState.test.ts`

**Interfaces:**
- Produces: `WalkFlightState` gains `dustReveal: number`. `WALK_START` becomes `1.9`. All other exports unchanged.

- [ ] **Step 1: Update the tests first**

In `walkFlightState.test.ts` replace the first two tests (`"inactive before the operator turn completes"` and `"the dive into darkness starts right after the turn"`) with:

```ts
test("inactive before the walk stage starts", () => {
  const state = getWalkFlightState(1.85, desktop);
  assert.equal(state.active, false);
  assert.equal(state.darknessDive, 0);
  assert.equal(state.dustReveal, 0);
  assert.equal(state.caseReveal, 0);
  assert.equal(getWalkFlightState(WALK_START, desktop).active, false);
});

test("dust appears while the display is still turning", () => {
  const state = getWalkFlightState(1.95, desktop);
  assert.equal(state.active, true);
  assert.ok(state.dustReveal > 0);
  assert.ok(state.darknessDive > 0 && state.darknessDive < 0.3);
  assert.equal(getWalkFlightState(2.08, desktop).darknessDive, 1);
});

test("a faint ground outline appears before the display is gone", () => {
  const state = getWalkFlightState(2.0, desktop);
  assert.ok(state.groundReveal > 0 && state.groundReveal < 0.5);
  assert.ok(getWalkFlightState(2.1, desktop).groundReveal > 0.999);
});

test("the camera eases in before the dive", () => {
  const start = getWalkFlightState(1.905, desktop).cameraPosition[2];
  const slow = getWalkFlightState(1.98, desktop).cameraPosition[2];
  const fast = getWalkFlightState(2.06, desktop).cameraPosition[2];
  assert.ok(start - slow < 4, `slow segment ${start - slow}`);
  assert.ok(slow - fast > 8, `dive segment ${slow - fast}`);
});
```

In the `"camera travel is continuous"` test replace `getWalkFlightState(1.981, desktop)` with `getWalkFlightState(1.901, desktop)` and `let scroll = 1.982` with `let scroll = 1.902`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `dustReveal` is undefined / `1.95` is inactive.

- [ ] **Step 3: Implement the retiming**

In `walkFlightState.ts`:

1. In `type WalkFlightState`, add after `darknessDive: number;`:

```ts
  dustReveal: number;
```

2. Change `export const WALK_START = 1.98;` to `export const WALK_START = 1.9;`.

3. Replace `const KNOT_TIMES = [1.98, 2.06, 2.16, 2.24, 2.32, 2.42, 2.5];` with:

```ts
const KNOT_TIMES = [1.9, 1.98, 2.06, 2.16, 2.24, 2.32, 2.42, 2.5];
```

4. Prepend a slow first knot to both knot arrays: `DESKTOP_KNOTS` gets `[-1.8, 3.15, 21],` as its first entry (before `[-1.8, 3.1, 18]`); `NARROW_KNOTS` gets `[-1.1, 3.15, 22],` as its first entry (before `[-1.1, 3.1, 19]`).

5. In the reduced-motion branch `position` must still be the overtake-start knot, which is now index 2: change `const position: Vec3 = [...knots[1]];` to `const position: Vec3 = [...knots[2]];`.

6. In `INACTIVE` add `dustReveal: 0,` after `darknessDive: 0,`.

7. In the reduced-motion return object add `dustReveal: settled,` after `darknessDive: settled,`.

8. In the animated return object replace:

```ts
    darknessDive: smooth(scroll, 1.98, 2.06),
    groundReveal: smooth(scroll, 2.0, 2.1),
```

with:

```ts
    darknessDive: smooth(scroll, 1.92, 2.08),
    dustReveal: smooth(scroll, 1.9, 2.0),
    groundReveal: 0.35 * smooth(scroll, 1.92, 2.0) + 0.65 * smooth(scroll, 2.0, 2.1),
```

and replace `const diveStreak = smooth(scroll, 1.98, 2.02) * (1 - smooth(scroll, 2.04, 2.1));` with:

```ts
  const diveStreak = smooth(scroll, 1.98, 2.02) * (1 - smooth(scroll, 2.06, 2.12));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all walkFlightState tests PASS (12 in this file) plus walkerBody tests.

- [ ] **Step 5: Lint and commit**

Run: `npm run lint` — no new errors (pre-existing ones are in FlowArchitectCase.tsx).

```bash
git add src/components/butterfly/walk/walkFlightState.ts src/components/butterfly/walk/walkFlightState.test.ts
git commit -m "feat: overlap the walk stage with the display turn"
```

---

### Task R2: One continuous SDF body with two-bone weights

**Files:**
- Modify (full rewrite): `src/components/butterfly/walk/walkerBody.ts`
- Modify (full rewrite): `src/components/butterfly/walk/walkerBody.test.ts`

**Interfaces:**
- Produces:
  - `WALKER_BONE_COUNT = 16` (ids: 0 pelvis, 1 ribcage, 2 neck, 3 head, 4–6 left upper arm/forearm/hand, 7–9 right, 10–12 left thigh/shin/foot, 13–15 right).
  - `WALKER_REST_JOINTS: ReadonlyArray<[number, number, number]>` — 16 joint positions in rest pose, indexed by bone id.
  - `WALKER_LENGTHS = { thigh: 0.42, shin: 0.4, pelvisY: 0.95 }`.
  - `walkerBodyDistance(x: number, y: number, z: number): number` — signed distance to the body surface (negative inside).
  - `sampleWalkerBody(count: number, random?: () => number): { rest: Float32Array; bones: Float32Array; weight: Float32Array; seed: Float32Array; shell: Float32Array }` — `rest` xyz per point; `bones` two ids per point; `weight` = blend toward the second bone (`0..0.5`); `shell` 1 for surface points, 0 for fill.

- [ ] **Step 1: Write the failing tests**

Replace `walkerBody.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { sampleWalkerBody, walkerBodyDistance, WALKER_BONE_COUNT } from "./walkerBody.ts";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const body = sampleWalkerBody(6000, seeded(7));

test("returns the requested number of points", () => {
  assert.equal(body.rest.length, 6000 * 3);
  assert.equal(body.bones.length, 6000 * 2);
  assert.equal(body.weight.length, 6000);
  assert.equal(body.seed.length, 6000);
  assert.equal(body.shell.length, 6000);
});

test("every bone receives points and weights stay in range", () => {
  const counts = new Array(WALKER_BONE_COUNT).fill(0);
  for (let i = 0; i < 6000; i += 1) {
    counts[body.bones[i * 2]] += 1;
    assert.ok(body.weight[i] >= 0 && body.weight[i] <= 0.5);
  }
  counts.forEach((count, bone) => assert.ok(count > 5, `bone ${bone} has ${count}`));
});

test("points lie inside or on the one body surface", () => {
  for (let i = 0; i < 6000; i += 1) {
    const d = walkerBodyDistance(body.rest[i * 3], body.rest[i * 3 + 1], body.rest[i * 3 + 2]);
    assert.ok(d <= 0.0041, `point ${i} is ${d} outside`);
  }
});

test("most points form the surface shell", () => {
  const shell = body.shell.reduce((sum, value) => sum + value, 0);
  assert.ok(shell / 6000 > 0.75, `shell share ${shell / 6000}`);
});

test("the legs stay separate below the crotch", () => {
  for (let i = 0; i < 6000; i += 1) {
    const x = body.rest[i * 3];
    const y = body.rest[i * 3 + 1];
    assert.ok(!(Math.abs(x) < 0.025 && y > 0.15 && y < 0.6), `point in leg gap at ${x}, ${y}`);
  }
});

test("the figure is about 1.85 m tall and stands on the ground", () => {
  let top = -Infinity;
  let bottom = Infinity;
  for (let i = 0; i < 6000; i += 1) {
    top = Math.max(top, body.rest[i * 3 + 1]);
    bottom = Math.min(bottom, body.rest[i * 3 + 1]);
  }
  assert.ok(top > 1.8 && top < 1.88, `top ${top}`);
  assert.ok(bottom > -0.02 && bottom < 0.03, `bottom ${bottom}`);
});

test("hands never merge with thighs", () => {
  assert.ok(walkerBodyDistance(0.2, 0.84, 0) > 0, "gap right");
  assert.ok(walkerBodyDistance(-0.2, 0.84, 0) > 0, "gap left");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `walkerBodyDistance` is not exported.

- [ ] **Step 3: Implement the SDF body**

Replace `walkerBody.ts` with:

```ts
type Vec3 = [number, number, number];

type Primitive =
  | { bone: number; kind: "cone"; a: Vec3; b: Vec3; ra: number; rb: number; depth: number }
  | { bone: number; kind: "sphere"; c: Vec3; r: number }
  | { bone: number; kind: "ellipsoid"; c: Vec3; r: Vec3 };

type Group = "torso" | "armL" | "armR" | "legL" | "legR";

export const WALKER_BONE_COUNT = 16;

export const WALKER_LENGTHS = { thigh: 0.42, shin: 0.4, pelvisY: 0.95 } as const;

const side = (s: number): Vec3[] => [
  [s * 0.2, 1.43, 0],
  [s * 0.215, 1.15, 0],
  [s * 0.235, 0.905, -0.01],
];
const legJoints = (s: number): Vec3[] => [
  [s * 0.1, 0.9, 0],
  [s * 0.105, 0.48, 0],
  [s * 0.11, 0.08, 0],
];

// Indexed by bone id. Left is -X.
export const WALKER_REST_JOINTS: ReadonlyArray<Vec3> = [
  [0, 0.95, 0],
  [0, 1.08, 0],
  [0, 1.5, 0],
  [0, 1.62, 0],
  ...side(-1),
  ...side(1),
  ...legJoints(-1),
  ...legJoints(1),
];

const cone = (bone: number, a: Vec3, b: Vec3, ra: number, rb: number, depth = 1): Primitive =>
  ({ bone, kind: "cone", a, b, ra, rb, depth });
const sphere = (bone: number, c: Vec3, r: number): Primitive => ({ bone, kind: "sphere", c, r });
const ellipsoid = (bone: number, c: Vec3, r: Vec3): Primitive => ({ bone, kind: "ellipsoid", c, r });

const arm = (s: number, offset: number): Primitive[] => [
  sphere(offset, [s * 0.195, 1.415, 0], 0.068),
  cone(offset, [s * 0.2, 1.4, 0], [s * 0.215, 1.15, 0], 0.056, 0.045),
  cone(offset + 1, [s * 0.215, 1.15, 0], [s * 0.235, 0.915, -0.01], 0.045, 0.035),
  ellipsoid(offset + 2, [s * 0.238, 0.84, -0.012], [0.03, 0.072, 0.046]),
];

const leg = (s: number, offset: number): Primitive[] => [
  cone(offset, [s * 0.095, 0.9, 0], [s * 0.105, 0.48, 0], 0.09, 0.058),
  cone(offset + 1, [s * 0.105, 0.48, 0], [s * 0.11, 0.11, 0], 0.056, 0.044),
  sphere(offset + 1, [s * 0.107, 0.34, 0.03], 0.052),
  cone(offset + 2, [s * 0.11, 0.045, 0.035], [s * 0.115, 0.035, -0.15], 0.044, 0.036),
];

// Back is +Z (the walker faces -Z).
const GROUPS: Record<Group, Primitive[]> = {
  torso: [
    cone(0, [0, 0.9, 0], [0, 1.1, 0], 0.14, 0.135, 0.72),
    sphere(0, [-0.07, 0.88, 0.05], 0.095),
    sphere(0, [0.07, 0.88, 0.05], 0.095),
    cone(1, [0, 1.1, 0], [0, 1.34, 0], 0.14, 0.165, 0.64),
    cone(1, [-0.16, 1.425, 0.01], [0.16, 1.425, 0.01], 0.06, 0.06, 0.85),
    cone(2, [0, 1.47, 0.01], [0, 1.63, 0], 0.058, 0.05),
    ellipsoid(3, [0, 1.735, 0.005], [0.078, 0.105, 0.093]),
  ],
  armL: arm(-1, 4),
  armR: arm(1, 7),
  legL: leg(-1, 10),
  legR: leg(1, 13),
};

const ADJACENT: number[][] = [
  [1, 10, 13], [0, 2, 4, 7], [1, 3], [2],
  [1, 5], [4, 6], [5], [1, 8], [7, 9], [8],
  [0, 11], [10, 12], [11], [0, 14], [13, 15], [14],
];

function roundCone(px: number, py: number, pz: number, a: Vec3, b: Vec3, r1: number, r2: number) {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = px - a[0];
  const pay = py - a[1];
  const paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const xx = pax * l2 - bax * y;
  const xy = pay * l2 - bay * y;
  const xz = paz * l2 - baz * y;
  const x2 = xx * xx + xy * xy + xz * xz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

function primitiveDistance(p: Primitive, x: number, y: number, z: number) {
  if (p.kind === "sphere") return Math.hypot(x - p.c[0], y - p.c[1], z - p.c[2]) - p.r;
  if (p.kind === "ellipsoid") {
    const qx = (x - p.c[0]) / p.r[0];
    const qy = (y - p.c[1]) / p.r[1];
    const qz = (z - p.c[2]) / p.r[2];
    const k0 = Math.hypot(qx, qy, qz);
    const k1 = Math.hypot(qx / p.r[0], qy / p.r[1], qz / p.r[2]);
    return k1 === 0 ? -Math.min(...p.r) : k0 * (k0 - 1) / k1;
  }
  // Flatten the cone front-to-back around its own centre.
  const cz = (p.a[2] + p.b[2]) / 2;
  return roundCone(x, y, cz + (z - cz) / p.depth, p.a, p.b, p.ra, p.rb) * Math.min(1, p.depth + 0.15);
}

function smoothMin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function groupDistance(group: Primitive[], x: number, y: number, z: number, k: number) {
  let d = Infinity;
  for (const primitive of group) {
    const next = primitiveDistance(primitive, x, y, z);
    d = d === Infinity ? next : smoothMin(d, next, k);
  }
  return d;
}

export function walkerBodyDistance(x: number, y: number, z: number) {
  const torso = groupDistance(GROUPS.torso, x, y, z, 0.04);
  const arms = Math.min(groupDistance(GROUPS.armL, x, y, z, 0.03), groupDistance(GROUPS.armR, x, y, z, 0.03));
  const legs = Math.min(groupDistance(GROUPS.legL, x, y, z, 0.03), groupDistance(GROUPS.legR, x, y, z, 0.03));
  // Limbs join the torso smoothly, but arms and legs never blend into each other.
  return Math.min(smoothMin(torso, arms, 0.025), smoothMin(torso, legs, 0.03));
}

const ALL_PRIMITIVES = Object.values(GROUPS).flat();
const SHELL_INNER = -0.022;
const SHELL_OUTER = 0.004;
const FILL_CHANCE = 0.12;

function assignBones(x: number, y: number, z: number): [number, number, number] {
  const perBone = new Array(WALKER_BONE_COUNT).fill(Infinity);
  for (const primitive of ALL_PRIMITIVES) {
    perBone[primitive.bone] = Math.min(perBone[primitive.bone], primitiveDistance(primitive, x, y, z));
  }
  let first = 0;
  for (let bone = 1; bone < WALKER_BONE_COUNT; bone += 1) {
    if (perBone[bone] < perBone[first]) first = bone;
  }
  let second = first;
  for (const bone of ADJACENT[first]) {
    if (second === first || perBone[bone] < perBone[second]) second = bone;
  }
  if (second === first) return [first, first, 0];
  const weight = 0.5 * Math.exp(-Math.max(0, perBone[second] - perBone[first]) / 0.02);
  return [first, second, weight];
}

export function sampleWalkerBody(count: number, random: () => number = Math.random) {
  const rest = new Float32Array(count * 3);
  const bones = new Float32Array(count * 2);
  const weight = new Float32Array(count);
  const seed = new Float32Array(count);
  const shell = new Float32Array(count);
  let written = 0;
  let attempts = 0;
  while (written < count && attempts < count * 400) {
    attempts += 1;
    const x = (random() * 2 - 1) * 0.34;
    const y = random() * 1.88;
    const z = -0.22 + random() * 0.4;
    const d = walkerBodyDistance(x, y, z);
    if (d > SHELL_OUTER) continue;
    const onShell = d >= SHELL_INNER;
    if (!onShell && random() > FILL_CHANCE) continue;
    const [first, second, blend] = assignBones(x, y, z);
    rest[written * 3] = x;
    rest[written * 3 + 1] = y;
    rest[written * 3 + 2] = z;
    bones[written * 2] = first;
    bones[written * 2 + 1] = second;
    weight[written] = blend;
    seed[written] = random();
    shell[written] = onShell ? 1 : 0;
    written += 1;
  }
  if (written < count) throw new Error(`walker sampling produced ${written} of ${count} points`);
  return { rest, bones, weight, seed, shell };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all walkerBody tests PASS. If `"the legs stay separate below the crotch"` or `"the figure is about 1.85 m tall"` fails, report the failing values as DONE_WITH_CONCERNS rather than changing primitive numbers yourself.

Note: `WalkerFigure.ts` still imports the old API (`WALKER_JOINTS`, `local`/`bone`) and will not type-check until Task R3. That is expected; do not edit `WalkerFigure.ts` in this task. `npm run lint` must show no new errors in `walkerBody.ts` / `walkerBody.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/components/butterfly/walk/walkerBody.ts src/components/butterfly/walk/walkerBody.test.ts
git commit -m "feat: sample the walker as one continuous silhouette"
```

---

### Task R3: Two-bone skinned walker shader

**Files:**
- Modify (full rewrite): `src/components/butterfly/walk/WalkerFigure.ts`

**Interfaces:**
- Consumes: `sampleWalkerBody`, `WALKER_REST_JOINTS`, `WALKER_LENGTHS` from Task R2.
- Produces: unchanged public API — `createWalkerFigure(count, pixelRatio): WalkerFigure` with `points`, `update(stride, time, reveal)`, `setPixelRatio`, `dispose`.

- [ ] **Step 1: Rewrite the figure**

Replace `WalkerFigure.ts` with:

```ts
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
    vLight = mix(0.5, 1.0, aShell) * mix(0.78, 1.0, smoothstep(0.4, 1.7, p.y)) * shimmer;
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

- [ ] **Step 2: Type-check, lint, test**

Run: `npx tsc --noEmit -p . && npm run lint && npm test`
Expected: tsc clean; no new lint errors; all tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/butterfly/walk/WalkerFigure.ts
git commit -m "feat: skin the walker silhouette to two bones"
```

---

### Task R4: Narrow path, halo fix, dust reveal, softer display fade

**Files:**
- Modify: `src/components/butterfly/walk/walkEnvironment.ts`
- Modify: `src/components/butterfly/performance-profile.ts`
- Modify: `src/components/butterfly/ButterflyExperience.tsx`

**Interfaces:**
- Consumes: `WalkFlightState.dustReveal` (Task R1).

- [ ] **Step 1: Narrow the ground into a path**

In `walkEnvironment.ts` `sampleGround`, replace the loop body lines from `const x = (Math.random() * 2 - 1) * 7;` through the `positions[written * 3 + 1] = ...` assignment (the two-line expression ending in `+ (Math.random() - 0.5) * 0.03;`) with:

```ts
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
```

In the ground vertex shader replace:

```glsl
        vAlpha = uReveal * mix(0.3, 0.78, aSeed) * shimmer * smoothstep(48.0, 18.0, distanceToCamera);
```

with:

```glsl
        // The walking path itself reads slightly brighter than the verges.
        float path = 1.0 + 0.6 * (1.0 - smoothstep(0.15, 0.45, abs(position.x)));
        vAlpha = uReveal * mix(0.3, 0.78, aSeed) * shimmer * path
          * (1.0 - smoothstep(18.0, 48.0, distanceToCamera));
```

- [ ] **Step 2: Fix inverted smoothsteps and the halo edges**

In the dust vertex shader replace `* smoothstep(0.3, 1.2, distanceToCamera) * smoothstep(50.0, 20.0, distanceToCamera);` with:

```glsl
          * smoothstep(0.3, 1.2, distanceToCamera) * (1.0 - smoothstep(20.0, 50.0, distanceToCamera));
```

In the halo fragment shader replace:

```glsl
        float glow = exp(-dot(q, q) * 3.2) * 0.35;
```

with:

```glsl
        vec2 edge = abs(vUv - 0.5);
        float fade = (1.0 - smoothstep(0.32, 0.5, edge.x)) * (1.0 - smoothstep(0.28, 0.5, edge.y));
        float glow = exp(-dot(q, q) * 3.2) * 0.35 * fade;
```

- [ ] **Step 3: Dust follows `dustReveal`**

In `update`, replace `dustUniforms.uReveal.value = state.darknessDive;` with `dustUniforms.uReveal.value = state.dustReveal;`.

- [ ] **Step 4: Ground counts for the narrower path**

In `performance-profile.ts` change `walkGroundParticleCount` to `12_000` (HIGH), `8_000` (BALANCED), `4_500` (LOW).

- [ ] **Step 5: Push and blur the display while it fades**

In `ButterflyExperience.tsx`, in the `caseWorldRef` block, replace:

```ts
        caseWorldRef.current.style.transform = `perspective(1400px) translate3d(${-walkState.darknessDive * 24}vw, 0, 0) rotateZ(${turnRoll}deg) rotateY(${turnYaw}deg) translate3d(${turnX}vw, ${turnY}vh, ${pullbackZ + turnZ}px)`;
        caseWorldRef.current.style.opacity = String(1 - walkState.darknessDive);
```

with:

```ts
        const displayFade = walkState.darknessDive;
        caseWorldRef.current.style.transform = `perspective(1400px) translate3d(${-displayFade * 10}vw, 0, ${-displayFade * 480}px) rotateZ(${turnRoll}deg) rotateY(${turnYaw}deg) translate3d(${turnX}vw, ${turnY}vh, ${pullbackZ + turnZ}px)`;
        caseWorldRef.current.style.opacity = String(1 - displayFade);
        caseWorldRef.current.style.filter = displayFade > 0.001 ? `blur(${displayFade * 5}px)` : "none";
```

- [ ] **Step 6: Type-check, lint, test, smoke**

Run: `npx tsc --noEmit -p . && npm run lint && npm test` — tsc clean, no new lint errors, all tests PASS.
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` — expect `200` (dev server is already running; do not start another).

- [ ] **Step 7: Commit**

```bash
git add src/components/butterfly/walk/walkEnvironment.ts src/components/butterfly/performance-profile.ts src/components/butterfly/ButterflyExperience.tsx
git commit -m "feat: narrow the path and soften the display hand-off"
```

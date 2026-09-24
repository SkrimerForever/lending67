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
  [s * 0.225, 1.15, 0],
  [s * 0.245, 0.905, -0.01],
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
  sphere(offset, [s * 0.195, 1.405, 0], 0.062),
  cone(offset, [s * 0.2, 1.39, 0], [s * 0.225, 1.15, 0], 0.052, 0.043),
  cone(offset + 1, [s * 0.225, 1.15, 0], [s * 0.245, 0.915, -0.01], 0.043, 0.033),
  ellipsoid(offset + 2, [s * 0.248, 0.84, -0.012], [0.028, 0.07, 0.044]),
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
    // Hips, then a slight waist, then a chest that widens toward the armpits.
    cone(0, [0, 0.9, 0], [0, 1.02, 0], 0.135, 0.125, 0.75),
    sphere(0, [-0.068, 0.88, 0.045], 0.088),
    sphere(0, [0.068, 0.88, 0.045], 0.088),
    cone(1, [0, 1.0, 0], [0, 1.16, 0], 0.125, 0.125, 0.66),
    cone(1, [0, 1.16, 0], [0, 1.29, 0.005], 0.13, 0.148, 0.6),
    // Shoulders slope down from the neck (trapezius) instead of a flat bar.
    cone(1, [-0.05, 1.46, 0.015], [-0.175, 1.405, 0.01], 0.042, 0.055, 0.9),
    cone(1, [0.05, 1.46, 0.015], [0.175, 1.405, 0.01], 0.042, 0.055, 0.9),
    cone(2, [0, 1.43, 0.015], [0, 1.63, 0], 0.048, 0.043),
    ellipsoid(3, [0, 1.735, 0.005], [0.074, 0.1, 0.088]),
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

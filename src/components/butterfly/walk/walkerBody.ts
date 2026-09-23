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

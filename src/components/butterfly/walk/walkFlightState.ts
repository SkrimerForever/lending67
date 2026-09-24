export type Vec3 = [number, number, number];

export type WalkFlightOptions = {
  reducedMotion: boolean;
  narrow: boolean;
};

export type WalkFlightState = {
  active: boolean;
  darknessDive: number;
  dustReveal: number;
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

export const WALK_START = 1.9;
export const WALK_END = 2.4;
export const LIGHT_Y = 1.7;
export const LIGHT_Z = -40;

// The walker holds one mid-stride pose (left leg forward, right heel lifting)
// at the depth where the camera passes his left shoulder.
const POSE_STRIDE = 0.06;
const WALKER_Z = -0.9;

// Scroll time of each camera knot. The shoulder pass happens at 2.24; after it
// the camera reaches the light within one short scroll.
const KNOT_TIMES = [1.9, 1.98, 2.06, 2.16, 2.24, 2.28, 2.32, 2.35];

const DESKTOP_KNOTS: Vec3[] = [
  [-1.8, 3.15, 21],
  [-1.8, 3.1, 18],
  [-1.6, 2.9, 8],
  [-0.9, 2.3, 2],
  [-0.36, 1.86, -0.9],
  [-0.12, 1.74, -6],
  [0, LIGHT_Y, -24],
  [0, LIGHT_Y, LIGHT_Z + 1.2],
];

const NARROW_KNOTS: Vec3[] = [
  [-1.1, 3.15, 22],
  [-1.1, 3.1, 19],
  [-0.9, 2.9, 9],
  [-0.7, 2.35, 2.2],
  [-0.55, 2.0, -0.9],
  [-0.2, 1.76, -6],
  [0, LIGHT_Y, -24],
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
  const centre = smooth(scroll, 2.18, 2.3);
  return [
    lerp(position[0] - leftBias, 0, centre),
    lerp(2.5, LIGHT_Y, smooth(scroll, 2.12, 2.3)),
    position[2] - 8,
  ];
}

const INACTIVE: WalkFlightState = {
  active: false,
  darknessDive: 0,
  dustReveal: 0,
  groundReveal: 0,
  dustStreak: 0,
  walkerReveal: 0,
  stride: POSE_STRIDE,
  walkerZ: WALKER_Z,
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
    const position: Vec3 = [...knots[2]];
    return {
      active: true,
      darknessDive: settled,
      dustReveal: settled,
      groundReveal: settled,
      dustStreak: 0,
      walkerReveal: settled,
      stride: POSE_STRIDE,
      walkerZ: WALKER_Z,
      cameraPosition: position,
      cameraTarget: [position[0] - (options.narrow ? 0.3 : 0.8), 2.5, position[2] - 8],
      lightReveal: light,
      whiteout: light,
      caseReveal: smooth(scroll, 2.33, 2.37),
    };
  }

  const cameraPosition = cameraOnPath(scroll, knots);
  const whiteout = smooth(scroll, 2.31, 2.35);
  const diveStreak = smooth(scroll, 1.98, 2.02) * (1 - smooth(scroll, 2.06, 2.12));
  const rushStreak = smooth(scroll, 2.26, 2.32) * (1 - whiteout);
  return {
    active: true,
    darknessDive: smooth(scroll, 1.92, 2.08),
    dustReveal: smooth(scroll, 1.9, 2.0),
    groundReveal: 0.35 * smooth(scroll, 1.92, 2.0) + 0.65 * smooth(scroll, 2.0, 2.1),
    dustStreak: Math.max(diveStreak, rushStreak),
    walkerReveal: smooth(scroll, 2.02, 2.1),
    stride: POSE_STRIDE,
    walkerZ: WALKER_Z,
    cameraPosition,
    cameraTarget: lookAhead(scroll, cameraPosition, options.narrow),
    lightReveal: smooth(scroll, 2.22, 2.31),
    whiteout,
    caseReveal: smooth(scroll, 2.35, 2.38),
  };
}

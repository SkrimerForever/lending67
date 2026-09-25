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
export const WALK_END = 2.22;
export const LIGHT_Y = 1.7;
export const LIGHT_Z = -14;
// The light is the case 02 screen seen from afar. The flight stops exactly where
// a PORTAL_HEIGHT-tall screen fills the 42° camera, so case 02 lands full-screen.
export const PORTAL_HEIGHT = 1.8;
export const PORTAL_DISTANCE = PORTAL_HEIGHT / 2 / Math.tan((21 * Math.PI) / 180);

// The walker holds one mid-stride pose (left leg forward, right heel lifting)
// at the depth where the camera passes his left shoulder.
const POSE_STRIDE = 0.06;
const WALKER_Z = -0.9;

// Scroll time of each camera knot. The shoulder pass happens at 2.10; after it
// the camera reaches the light within one short scroll.
const KNOT_TIMES = [1.9, 1.95, 2.0, 2.05, 2.1, 2.12, 2.14, 2.16];

const DESKTOP_KNOTS: Vec3[] = [
  [-1.8, 3.15, 21],
  [-1.8, 3.1, 18],
  [-1.6, 2.9, 8],
  [-0.9, 2.3, 2],
  [-0.36, 1.86, -0.9],
  [-0.12, 1.74, -4],
  [0, LIGHT_Y, -9],
  [0, LIGHT_Y, LIGHT_Z + PORTAL_DISTANCE],
];

const NARROW_KNOTS: Vec3[] = [
  [-1.1, 3.15, 22],
  [-1.1, 3.1, 19],
  [-0.9, 2.9, 9],
  [-0.7, 2.35, 2.2],
  [-0.55, 2.0, -0.9],
  [-0.2, 1.76, -4],
  [0, LIGHT_Y, -9],
  [0, LIGHT_Y, LIGHT_Z + PORTAL_DISTANCE],
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

function cameraOnPath(scroll: number, knots: Vec3[], times: number[] = KNOT_TIMES): Vec3 {
  const last = times.length - 1;
  if (scroll <= times[0]) return [...knots[0]];
  if (scroll >= times[last]) return [...knots[last]];
  let segment = 0;
  while (scroll > times[segment + 1]) segment += 1;
  const t = (scroll - times[segment]) / (times[segment + 1] - times[segment]);
  const p0 = knots[Math.max(0, segment - 1)];
  const p1 = knots[segment];
  const p2 = knots[segment + 1];
  const p3 = knots[Math.min(last, segment + 2)];
  return [0, 1, 2].map((axis) => catmullRom(p0[axis], p1[axis], p2[axis], p3[axis], t)) as Vec3;
}

function lookAhead(scroll: number, position: Vec3, narrow: boolean): Vec3 {
  const leftBias = narrow ? 0.3 : 0.8;
  const centre = smooth(scroll, 2.06, 2.14);
  return [
    lerp(position[0] - leftBias, 0, centre),
    lerp(2.5, LIGHT_Y, smooth(scroll, 2.02, 2.12)),
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
    const settled = smooth(scroll, 1.95, 1.98);
    const light = smooth(scroll, 2.06, 2.1);
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
      caseReveal: smooth(scroll, 2.16, 2.2),
    };
  }

  const cameraPosition = cameraOnPath(scroll, knots);
  const whiteout = smooth(scroll, 2.14, 2.16);
  const diveStreak = smooth(scroll, 1.95, 1.98) * (1 - smooth(scroll, 2.0, 2.04));
  const rushStreak = smooth(scroll, 2.11, 2.14) * (1 - whiteout);
  return {
    active: true,
    darknessDive: smooth(scroll, 1.92, 2.0),
    dustReveal: smooth(scroll, 1.9, 1.96),
    groundReveal: 0.35 * smooth(scroll, 1.92, 1.97) + 0.65 * smooth(scroll, 1.97, 2.02),
    dustStreak: Math.max(diveStreak, rushStreak),
    walkerReveal: smooth(scroll, 1.96, 2.01),
    stride: POSE_STRIDE,
    walkerZ: WALKER_Z,
    cameraPosition,
    cameraTarget: lookAhead(scroll, cameraPosition, options.narrow),
    lightReveal: smooth(scroll, 2.08, 2.14),
    whiteout,
    caseReveal: smooth(scroll, 2.16, 2.19),
  };
}

// Case 02 → case 03, driven by its own 0..1 progress. The camera backs off the
// case 02 screen, the screen breaks into points that gather into the butterfly
// from the opening, the camera follows it through the dark to the case 03
// screen, the butterfly spreads out over that screen, and the camera flies in.
export type ButterflyPassState = {
  active: boolean;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  // Case 02 DOM fades while its points take over (0 → 1).
  screenDissolve: number;
  // Points leave the case 02 screen and form the butterfly (0 → 1, staggered per point).
  gather: number;
  // Points leave the butterfly and spread over the case 03 screen (0 → 1, staggered).
  land: number;
  butterflyPosition: Vec3;
  // Unit direction of flight.
  butterflyHeading: Vec3;
  // The first colour on the site: a faint warmth on the wing tips.
  warmth: number;
  // Glow of the case 03 screen in the dark, then the DOM case on it.
  caseThreeLight: number;
  caseThreeReveal: number;
};

// The case 03 screen stands further on, off to the right, facing back along +Z.
export const CASE_THREE_SCREEN: Vec3 = [6, LIGHT_Y, -32];
const PORTAL: Vec3 = [0, LIGHT_Y, LIGHT_Z + PORTAL_DISTANCE];
const CASE_THREE_PORTAL: Vec3 = [CASE_THREE_SCREEN[0], LIGHT_Y, CASE_THREE_SCREEN[2] + PORTAL_DISTANCE];

const PASS_TIMES = [0, 0.14, 0.3, 0.46, 0.62, 0.76, 0.9, 1];
const PASS_KNOTS: Vec3[] = [
  PORTAL,
  [0, 1.8, -7.6],
  [0.2, 1.9, -8.4],
  [0.9, 2.05, -12.5],
  [3.0, 2.0, -18.5],
  [5.2, 1.85, -24.5],
  [6, 1.75, -27.8],
  CASE_THREE_PORTAL,
];
const NARROW_PASS_KNOTS: Vec3[] = PASS_KNOTS.map(([x, y, z], i) =>
  i === 0 || i === PASS_KNOTS.length - 1 ? [x, y, z] : [x * 0.8, y, z + 1.2]);

// The butterfly forms in front of the case 02 screen and flies to case 03.
const FLIGHT_TIMES = [0.26, 0.42, 0.56, 0.7, 0.8];
const FLIGHT_KNOTS: Vec3[] = [
  [0, 1.75, -13.6],
  [0.9, 2.2, -17.5],
  [3.2, 2.0, -23],
  [5.4, 1.8, -28.4],
  [6, LIGHT_Y, -31.6],
];

export function getButterflyPassState(progress: number, options: WalkFlightOptions): ButterflyPassState {
  const gather = smooth(progress, 0.1, 0.3);
  const land = smooth(progress, 0.7, 0.84);
  const screenDissolve = smooth(progress, 0.08, 0.2);
  const caseThreeLight = smooth(progress, 0.56, 0.74);
  const caseThreeReveal = smooth(progress, 0.8, 0.9);
  const warmth = smooth(progress, 0.3, 0.46) * (1 - 0.6 * land);
  const flight = (at: number) => cameraOnPath(at, FLIGHT_KNOTS, FLIGHT_TIMES);
  const butterflyPosition = flight(progress);
  const ahead = flight(Math.min(0.8, Math.max(0.27, progress) + 0.02));
  const behind = flight(Math.min(0.78, Math.max(0.26, progress)));
  const heading = ahead.map((v, i) => v - behind[i]) as Vec3;
  const length = Math.hypot(...heading) || 1;
  const butterflyHeading = heading.map((v) => v / length) as Vec3;
  const common = { screenDissolve, gather, land, butterflyPosition, butterflyHeading, warmth, caseThreeLight, caseThreeReveal };

  if (progress <= 0) {
    return { ...common, active: false, cameraPosition: [...PORTAL], cameraTarget: [0, LIGHT_Y, LIGHT_Z] };
  }
  if (options.reducedMotion) {
    // No camera travel: case 02 crossfades straight into case 03.
    return { ...common, active: true, cameraPosition: [...PORTAL], cameraTarget: [0, LIGHT_Y, LIGHT_Z], gather: 0, land: 0, warmth: 0 };
  }
  const cameraPosition = cameraOnPath(progress, options.narrow ? NARROW_PASS_KNOTS : PASS_KNOTS, PASS_TIMES);
  // Look at the case 02 screen, then follow the butterfly, then settle
  // straight onto the case 03 screen for the fly-in.
  const follow = smooth(progress, 0.2, 0.34) * (1 - smooth(progress, 0.74, 0.88));
  const settle = smooth(progress, 0.74, 0.88);
  const screen: Vec3 = settle > 0 ? CASE_THREE_SCREEN : [0, LIGHT_Y, LIGHT_Z];
  const cameraTarget = [0, 1, 2].map((axis) =>
    lerp(screen[axis], butterflyPosition[axis], follow)) as Vec3;
  return { ...common, active: true, cameraPosition, cameraTarget };
}

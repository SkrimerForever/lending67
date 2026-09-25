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

// The butterfly that carries the story between cases. Both transitions below
// fold the current case screen away in place (to a line, then a point), burst
// that point into the butterfly from the opening and fly on with it.
export type ButterflyShapeState = {
  active: boolean;
  // Width and height scale of the screen it bursts from, as it folds (1 → ~0).
  collapse: [number, number];
  // Points leave that screen and form the butterfly (0 → 1, staggered per point).
  gather: number;
  // Points leave the butterfly and spread over the next screen (0 → 1, staggered).
  land: number;
  butterflyPosition: Vec3;
  // Unit direction of flight.
  butterflyHeading: Vec3;
  // 0 hovering → 1 fastest: quickens the wing beat and stretches a trail.
  butterflySpeed: number;
  // Roll into turns, in radians (positive banks right).
  butterflyBank: number;
  // A faint warmth on the wing tips — the first colour on the site.
  warmth: number;
  // The butterfly's points fade out (0 → 1) once it has become the next screen.
  vanish: number;
  // The night comes alive with the butterfly (0 → 1) — sky, moon, forest,
  // fireflies, mist and water — and stays alive from then on.
  life: number;
};

type Flight = { times: number[]; knots: Vec3[] };

const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v) || 1;
  return v.map((value) => value / length) as Vec3;
};

// Where the butterfly is, which way it heads, how fast it goes and how far it
// banks, all from scroll so that every frame reverses exactly.
function flightKinematics(progress: number, { times, knots }: Flight) {
  const start = times[0];
  const end = times[times.length - 1];
  const at = (t: number) => cameraOnPath(t, knots, times);
  const headingAt = (t: number): Vec3 => {
    const clamped = Math.min(end - 0.012, Math.max(start, t));
    const ahead = at(clamped + 0.012);
    const here = at(clamped);
    return normalize([ahead[0] - here[0], ahead[1] - here[1], ahead[2] - here[2]]);
  };
  const step = 0.006;
  const before = at(Math.max(start, progress - step));
  const after = at(Math.min(end, progress + step));
  const flying = progress > start && progress < end ? 1 : 0;
  const pace = Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2]) / (2 * step);
  // Turning right (heading swinging towards +x) banks right.
  const turn = headingAt(progress + 0.03)[0] - headingAt(progress - 0.03)[0];
  return {
    position: at(progress),
    heading: headingAt(progress),
    speed: flying * Math.min(1, pace / 60),
    bank: Math.max(-0.7, Math.min(0.7, turn * 1.6)) * flying,
    ahead: (lead: number) => at(Math.min(end, progress + lead)),
  };
}

// A case screen folds away where it stands: to a glowing line, then a point.
const foldAway = (progress: number): [number, number] => [
  1 - 0.99 * smooth(progress, 0.07, 0.14),
  1 - 0.985 * smooth(progress, 0.01, 0.08),
];

// Case 02 → case 03, driven by its own 0..1 progress. Case 02 folds away, the
// butterfly bursts out, the camera rises and flies on over the night field with
// it to the case 03 screen, the butterfly spreads out over that screen, and
// the camera flies in.
export type ButterflyPassState = ButterflyShapeState & {
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  // The camera leans a little with the butterfly.
  cameraRoll: number;
  // Case 02 DOM fades once it has folded to a point (0 → 1).
  screenDissolve: number;
  // Glow of the case 03 screen in the dark, then the DOM case on it.
  caseThreeLight: number;
  caseThreeReveal: number;
};

// The case 03 screen stands further on, off to the right, facing back along +Z.
export const CASE_THREE_SCREEN: Vec3 = [6, LIGHT_Y, -32];
const PORTAL: Vec3 = [0, LIGHT_Y, LIGHT_Z + PORTAL_DISTANCE];
export const CASE_THREE_PORTAL: Vec3 = [CASE_THREE_SCREEN[0], LIGHT_Y, CASE_THREE_SCREEN[2] + PORTAL_DISTANCE];

// Camera: holds while case 02 folds away, rises above the field, flies on
// high behind the butterfly, then comes down onto the case 03 screen.
const PASS_TIMES = [0, 0.12, 0.22, 0.32, 0.44, 0.56, 0.7, 0.86];
const PASS_KNOTS: Vec3[] = [
  PORTAL,
  [0, 1.75, -11.6],
  [0, 3.2, -11.2],
  [0.3, 4.8, -12.5],
  [1.6, 5.4, -16.0],
  [3.4, 4.6, -20.5],
  [5.4, 2.8, -25.8],
  CASE_THREE_PORTAL,
];
const NARROW_PASS_KNOTS: Vec3[] = PASS_KNOTS.map(([x, y, z], i) =>
  i === 0 || i === PASS_KNOTS.length - 1 ? [x, y, z] : [x * 0.8, y, z + 0.8]);

// The butterfly bursts out of the folded screen, climbs to the camera's
// height, arcs to the right and dives onto the case 03 screen.
const PASS_FLIGHT: Flight = {
  times: [0.16, 0.28, 0.4, 0.52, 0.6, 0.66],
  knots: [
    [0, LIGHT_Y, -13.9],
    [0.8, 3.2, -16.5],
    [2.4, 4.4, -20],
    [4.2, 3.0, -24.5],
    [5.6, 2.1, -29],
    [6, LIGHT_Y, -31.6],
  ],
};

export function getButterflyPassState(progress: number, options: WalkFlightOptions): ButterflyPassState {
  const collapse = foldAway(progress);
  const gather = smooth(progress, 0.13, 0.26);
  const land = smooth(progress, 0.62, 0.76);
  const screenDissolve = smooth(progress, 0.11, 0.15);
  const caseThreeLight = smooth(progress, 0.5, 0.66);
  const caseThreeReveal = smooth(progress, 0.74, 0.86);
  const warmth = smooth(progress, 0.2, 0.34) * (1 - 0.6 * land);
  const flight = flightKinematics(progress, PASS_FLIGHT);
  const common = {
    collapse, screenDissolve, gather, land, warmth, caseThreeLight, caseThreeReveal,
    vanish: caseThreeReveal,
    life: smooth(progress, 0.12, 0.35),
    butterflyPosition: flight.position,
    butterflyHeading: flight.heading,
    butterflySpeed: flight.speed,
    butterflyBank: flight.bank,
  };

  if (progress <= 0) {
    return { ...common, active: false, cameraPosition: [...PORTAL], cameraTarget: [0, LIGHT_Y, LIGHT_Z], cameraRoll: 0 };
  }
  if (options.reducedMotion) {
    // No camera travel: case 02 crossfades straight into case 03.
    return {
      ...common, active: true, cameraPosition: [...PORTAL], cameraTarget: [0, LIGHT_Y, LIGHT_Z], cameraRoll: 0,
      gather: 0, land: 0, warmth: 0, butterflySpeed: 0, butterflyBank: 0, collapse: [1, 1],
    };
  }
  const cameraPosition = cameraOnPath(progress, options.narrow ? NARROW_PASS_KNOTS : PASS_KNOTS, PASS_TIMES);
  // Look at the case 02 screen while it folds, then chase the butterfly —
  // aiming a little ahead of it, so it swings through the frame — then settle
  // straight onto the case 03 screen for the fly-in.
  const follow = smooth(progress, 0.12, 0.24) * (1 - smooth(progress, 0.62, 0.74));
  const screen: Vec3 = progress > 0.5 ? CASE_THREE_SCREEN : [0, LIGHT_Y, LIGHT_Z];
  const aim = flight.ahead(0.04);
  const chase = [0, 1, 2].map((axis) => lerp(flight.position[axis], aim[axis], 0.45)) as Vec3;
  const cameraTarget = [0, 1, 2].map((axis) => lerp(screen[axis], chase[axis], follow)) as Vec3;
  return { ...common, active: true, cameraPosition, cameraTarget, cameraRoll: flight.bank * 0.25 * follow };
}

// Case 03 → block 04 (process), driven by its own 0..1 progress. Case 03 folds
// away, the butterfly bursts out again and flies on low along a road of
// points; soon after, grass grows up out of that road, a wave running on
// ahead, until the whole road is one muted green grass road. Block 04 opens
// over it.
export type MeadowPassState = ButterflyShapeState & {
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  cameraRoll: number;
  // Case 03 DOM fades once it has folded to a point (0 → 1).
  screenDissolve: number;
  // The road fades in beneath the flight (0 → 1).
  roadReveal: number;
  // Grass has grown everywhere behind this depth (walk-space Z); the front
  // sweeps along the road ahead of the camera.
  grassFront: number;
  // Grass everywhere, road or not (0 → 1), to finish the meadow.
  grassAll: number;
  // Block 04 opens over the meadow (0 → 1).
  processReveal: number;
};

export const MEADOW_NEAR_Z = -30;
export const MEADOW_FAR_Z = -66;
const MEADOW_X = CASE_THREE_SCREEN[0];

// Camera: holds while case 03 folds, drops low over the road and follows the
// butterfly along it, then eases to a stop above the meadow.
const MEADOW_TIMES = [0, 0.12, 0.24, 0.45, 0.7, 1];
const MEADOW_KNOTS: Vec3[] = [
  CASE_THREE_PORTAL,
  [MEADOW_X, 1.72, -29.6],
  [MEADOW_X, 1.5, -30.6],
  [MEADOW_X + 0.3, 1.35, -38],
  [MEADOW_X - 0.2, 1.3, -46],
  [MEADOW_X, 1.4, -52],
];

// The butterfly bursts out of case 03, dips low over the road, weaves along it
// and comes to hover ahead of the camera.
const MEADOW_FLIGHT: Flight = {
  times: [0.16, 0.3, 0.5, 0.75, 1],
  knots: [
    [MEADOW_X, LIGHT_Y, -31.9],
    [MEADOW_X + 0.4, 1.2, -36.5],
    [MEADOW_X - 0.4, 0.95, -44],
    [MEADOW_X + 0.3, 1.0, -51],
    [MEADOW_X, 1.0, -56],
  ],
};

export function getMeadowPassState(progress: number, options: WalkFlightOptions): MeadowPassState {
  const collapse = foldAway(progress);
  const screenDissolve = smooth(progress, 0.11, 0.15);
  const gather = smooth(progress, 0.13, 0.26);
  const roadReveal = smooth(progress, 0.1, 0.28);
  const processReveal = smooth(progress, 0.82, 0.96);
  const flight = flightKinematics(progress, MEADOW_FLIGHT);
  // The grass wave starts as soon as the butterfly is out and runs on ahead
  // along the road, so the road turns green early in the flight.
  const grassFront = lerp(MEADOW_NEAR_Z + 4, MEADOW_FAR_Z - 8, smooth(progress, 0.16, 0.45));
  const common = {
    collapse, screenDissolve, gather, roadReveal, processReveal,
    land: 0,
    vanish: 0,
    warmth: 1,
    life: 1,
    grassFront,
    grassAll: smooth(progress, 0.4, 0.5),
    butterflyPosition: flight.position,
    butterflyHeading: flight.heading,
    butterflySpeed: flight.speed,
    butterflyBank: flight.bank,
  };
  const screen: Vec3 = [...CASE_THREE_SCREEN];

  if (progress <= 0) {
    return { ...common, active: false, cameraPosition: [...CASE_THREE_PORTAL], cameraTarget: screen, cameraRoll: 0 };
  }
  if (options.reducedMotion) {
    // No flight: case 03 crossfades straight into block 04.
    return {
      ...common, active: true, cameraPosition: [...CASE_THREE_PORTAL], cameraTarget: screen, cameraRoll: 0,
      collapse: [1, 1], gather: 0, roadReveal: 0, butterflySpeed: 0, butterflyBank: 0, grassAll: 0,
    };
  }
  const knots = options.narrow
    ? MEADOW_KNOTS.map(([x, y, z], i) => (i === 0 ? [x, y, z] : [MEADOW_X + (x - MEADOW_X) * 0.6, y, z + 0.6]) as Vec3)
    : MEADOW_KNOTS;
  const cameraPosition = cameraOnPath(progress, knots, MEADOW_TIMES);
  // Look at case 03 while it folds, then chase the butterfly, aiming a little
  // ahead and low so the road (and the grass) fills the lower frame.
  const follow = smooth(progress, 0.12, 0.24);
  const aim = flight.ahead(0.05);
  const chase: Vec3 = [
    lerp(flight.position[0], aim[0], 0.45),
    lerp(flight.position[1], aim[1], 0.45) - 0.6,
    lerp(flight.position[2], aim[2], 0.45),
  ];
  const cameraTarget = [0, 1, 2].map((axis) => lerp(screen[axis], chase[axis], follow)) as Vec3;
  return { ...common, active: true, cameraPosition, cameraTarget, cameraRoll: flight.bank * 0.2 * follow };
}

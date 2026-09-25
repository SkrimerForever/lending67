// Pure timing and glyph rules for the case 02 → case 03 ASCII transition.
// progress 0..1 comes straight from scroll, so every frame is reversible.

export type Rgb = [number, number, number];

// The flight, as fractions of the transition:
//   0.00–0.19  case 02 rains into black-and-white characters (plane A)
//   0.19–0.42  the camera turns right; plane A slides away and
//              crumbles into star dust
//   0.30–0.86  flight through an ASCII starfield; colour enters at 0.42–0.66
//   0.60–0.88  case 03 flies in from the depth as a lit screen of characters
//   0.88–1.00  its characters fall away and uncover the real case 03
export const CASE_TWO_COVERED = 0.19;
export const CASE_THREE_ARRIVED = 0.88;

export type PlaneState = { visible: boolean; x: number; y: number; z: number; rotateY: number };

export type FlightState = {
  planeA: PlaneState;
  planeB: PlaneState;
  space: {
    visible: boolean;
    // Distance flown through the starfield, in star-depth units.
    travel: number;
    // 0 at rest, 1 at full speed: stretches stars into streaks.
    speed: number;
    // Camera yaw, 0..1: the whole sky swings left as the camera turns right.
    turn: number;
    colour: number;
  };
};

export const STAR_DEPTH = 40;
const TRAVEL = STAR_DEPTH * 2.2;

// The colour wave starts where case 03 used to open as a lit door.
export const WAVE_ORIGIN: [number, number] = [0.65, 0.45];

export const SCRAMBLE = "01#%&*+=-:;<>/\\|$@";
export const FILL_RAMP = " .:-=+*#%@";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number, start: number, end: number) => {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
// Accelerates, cruises and brakes; its slope is the flight speed.
const cruise = (value: number) => {
  const t = clamp01((value - 0.3) / (0.86 - 0.3));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export function hash(col: number, row: number, salt = 0) {
  const value = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

export function flightState(progress: number): FlightState {
  const turn = smooth(progress, 0.19, 0.42);
  const arrival = smooth(progress, 0.64, CASE_THREE_ARRIVED);
  const approach = 1 - Math.pow(1 - arrival, 2.4);
  const epsilon = 0.004;
  const slope = (cruise(progress + epsilon) - cruise(progress - epsilon)) / (2 * epsilon);
  return {
    planeA: {
      visible: progress > 0 && progress < 0.47,
      x: -68 * turn,
      y: 0,
      z: 240 * turn,
      rotateY: -30 * turn,
    },
    planeB: {
      visible: progress >= 0.6 && progress < 1,
      x: 0,
      y: 4 * (1 - approach),
      z: -5200 * (1 - approach),
      rotateY: 9 * (1 - approach),
    },
    space: {
      visible: progress >= CASE_TWO_COVERED && progress < CASE_THREE_ARRIVED,
      travel: cruise(progress) * TRAVEL,
      speed: clamp01(slope / 3.2),
      turn,
      colour: smooth(progress, 0.42, 0.66),
    },
  };
}

// Case 02 turns into characters: top-down terminal rain with a ragged edge.
export function coverPhase(progress: number, col: number, row: number, rows: number) {
  const rain = (row / Math.max(1, rows - 1)) * 0.7 + hash(col, row, 1) * 0.3;
  const start = rain * 0.12;
  return smooth(progress, start, start + 0.06);
}

// Plane A crumbles into dust while it slides out of frame.
export function dropPhase(progress: number, col: number, row: number) {
  const start = 0.27 + hash(col, row, 6) * 0.15;
  return smooth(progress, start, start + 0.03);
}

// Case 03 settles out of scrambled colour glyphs, from the old door outwards.
export function swapPhase(progress: number, col: number, row: number, cols: number, rows: number) {
  const dx = col / Math.max(1, cols - 1) - WAVE_ORIGIN[0];
  const dy = (row / Math.max(1, rows - 1) - WAVE_ORIGIN[1]) * 0.6;
  const radial = clamp01(Math.hypot(dx, dy) / 0.78) * 0.85 + hash(col, row, 2) * 0.15;
  const start = 0.7 + radial * 0.12;
  return smooth(progress, start, start + 0.06);
}

// The arrived screen falls away cell by cell and uncovers the real case 03.
export function revealPhase(progress: number, col: number, row: number) {
  const start = 0.9 + hash(col, row, 3) * 0.07;
  return smooth(progress, start, start + 0.03);
}

// Scrambled glyphs change in steps of scroll, not time, so reversing the
// scroll replays the same sequence backwards.
export function scrambleGlyph(col: number, row: number, progress: number) {
  const step = Math.floor(progress * 90);
  return SCRAMBLE[Math.floor(hash(col, row, step) * SCRAMBLE.length)];
}

// The colour front: saturated hues that enter the black-and-white world first.
export function spectrum(col: number, row: number): Rgb {
  const hue = (hash(col, row, 4) * 0.35 + col * 0.004 + row * 0.006) % 1;
  const k = (n: number) => (n + hue * 12) % 12;
  const f = (n: number) => 0.62 - 0.38 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export const luminance = ([r, g, b]: Rgb) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export const mixRgb = (from: Rgb, to: Rgb, t: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * t),
  Math.round(from[1] + (to[1] - from[1]) * t),
  Math.round(from[2] + (to[2] - from[2]) * t),
];

export const grey = (color: Rgb, gain = 1): Rgb => {
  const value = Math.round(Math.min(255, luminance(color) * 255 * gain));
  return [value, value, value];
};

// Panel fills read as a faint density texture relative to the page background.
export function fillGlyph(background: Rgb, page: Rgb) {
  const contrast = clamp01(Math.abs(luminance(background) - luminance(page)) * 6);
  return FILL_RAMP[Math.round(contrast * (FILL_RAMP.length - 1))];
}

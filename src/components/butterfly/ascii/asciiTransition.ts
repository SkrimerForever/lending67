// Pure timing and glyph rules for the case 02 → case 03 ASCII transition.
// progress 0..1 comes straight from scroll, so every frame is reversible.

export type Rgb = [number, number, number];

export type CellPhase = {
  // The DOM screen underneath is replaced by this cell's glyph.
  cover: number;
  // The glyph morphs from case 02 into case 03 (scramble + colour front).
  swap: number;
  // The cell falls away and uncovers the real case 03 underneath.
  reveal: number;
};

// Between the last cover and the first reveal every cell is opaque, so the
// DOM can swap case 02 for case 03 at this moment without a visible cut.
export const DOM_SWITCH = 0.62;

const COVER_SPREAD = 0.4;
const COVER_LENGTH = 0.14;
const SWAP_START = 0.3;
const SWAP_SPREAD = 0.3;
const SWAP_LENGTH = 0.14;
const REVEAL_START = 0.76;
const REVEAL_SPREAD = 0.18;
const REVEAL_LENGTH = 0.06;

// The colour wave starts where case 03 used to open as a lit door.
export const WAVE_ORIGIN: [number, number] = [0.65, 0.45];

export const SCRAMBLE = "01#%&*+=-:;<>/\\|$@";
export const FILL_RAMP = " .:-=+*#%@";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (value: number, start: number, end: number) => {
  const t = clamp01((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

export function hash(col: number, row: number, salt = 0) {
  const value = Math.sin(col * 127.1 + row * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

export function cellPhase(progress: number, col: number, row: number, cols: number, rows: number): CellPhase {
  // Cover: top-down terminal rain with a ragged edge.
  const rain = (row / Math.max(1, rows - 1)) * 0.7 + hash(col, row, 1) * 0.3;
  const coverStart = rain * COVER_SPREAD;
  // Swap: a radial front out of the old door position.
  const dx = col / Math.max(1, cols - 1) - WAVE_ORIGIN[0];
  const dy = (row / Math.max(1, rows - 1) - WAVE_ORIGIN[1]) * 0.6;
  const radial = clamp01(Math.hypot(dx, dy) / 0.78) * 0.85 + hash(col, row, 2) * 0.15;
  const swapStart = SWAP_START + radial * SWAP_SPREAD;
  // Reveal: a loose sparkle, slightly later far from the origin.
  const revealStart = REVEAL_START + (hash(col, row, 3) * 0.75 + radial * 0.25) * REVEAL_SPREAD;
  return {
    cover: smooth(progress, coverStart, coverStart + COVER_LENGTH),
    swap: smooth(progress, swapStart, swapStart + SWAP_LENGTH),
    reveal: smooth(progress, revealStart, revealStart + REVEAL_LENGTH),
  };
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

import {
  coverPhase,
  dropPhase,
  fillGlyph,
  flightState,
  grey,
  hash,
  mixRgb,
  revealPhase,
  scrambleGlyph,
  spectrum,
  STAR_DEPTH,
  swapPhase,
  type PlaneState,
  type Rgb,
} from "./asciiTransition";

// A screen rasterised into a character grid: what each cell shows, and in
// which colours. Built from the live DOM, so the ASCII is the case itself.
type CellMap = {
  glyph: string[];
  foreground: Rgb[];
  background: Rgb[];
  page: Rgb;
};

type Grid = { cols: number; rows: number; cellWidth: number; cellHeight: number };

export type AsciiLayers = {
  // Black starfield between the two screens.
  space: HTMLCanvasElement;
  // Case 02 in characters, flown away from.
  planeA: HTMLCanvasElement;
  // Case 03 in characters, flown towards.
  planeB: HTMLCanvasElement;
};

export type AsciiTransition = {
  resize(width: number, height: number, pixelRatio: number): void;
  // Forget the sampled screens (layout changed); they are re-read on demand.
  invalidate(): void;
  render(progress: number): void;
  dispose(): void;
};

const FONT = "ui-monospace, SFMono-Regular, Menlo, monospace";
const BOX = { h: "─", v: "│", tl: "┌", tr: "┐", bl: "└", br: "┘" };

function parseColor(value: string): { rgb: Rgb; alpha: number } | null {
  const parts = value.match(/[\d.]+/g);
  if (!parts || parts.length < 3 || !value.startsWith("rgb")) return null;
  const alpha = parts.length > 3 ? Number(parts[3]) : 1;
  return { rgb: [Number(parts[0]), Number(parts[1]), Number(parts[2])], alpha };
}

// The screens being sampled may be hidden as a whole (opacity 0 before they
// appear), so visibility is judged only below their root.
function visibleWithin(element: Element, root: Element, cache: Map<Element, boolean>): boolean {
  if (element === root) return true;
  const known = cache.get(element);
  if (known !== undefined) return known;
  const style = getComputedStyle(element);
  const own = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0.5;
  const result = own && (!element.parentElement || visibleWithin(element.parentElement, root, cache));
  cache.set(element, result);
  return result;
}

// Reads the screen at rest: the portal flight may still hold case 02 small and
// tilted when a fast scroll jumps into the transition, and hidden screens keep
// their layout, so both are neutralised for the duration of the read.
function sampleScreen(root: HTMLElement, grid: Grid, page: Rgb): CellMap {
  const { transform, visibility } = root.style;
  root.style.transform = "none";
  root.style.visibility = "visible";
  try {
    return readScreen(root, grid, page);
  } finally {
    root.style.transform = transform;
    root.style.visibility = visibility;
  }
}

function readScreen(root: HTMLElement, grid: Grid, page: Rgb): CellMap {
  const { cols, rows, cellWidth, cellHeight } = grid;
  const count = cols * rows;
  const map: CellMap = {
    glyph: new Array(count).fill(" "),
    foreground: new Array(count).fill(page),
    background: new Array(count).fill(page),
    page,
  };
  const cache = new Map<Element, boolean>();
  const toCol = (x: number) => Math.floor(x / cellWidth);
  const toRow = (y: number) => Math.floor(y / cellHeight);
  const put = (col: number, row: number, glyph: string, color: Rgb) => {
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    map.glyph[row * cols + col] = glyph;
    map.foreground[row * cols + col] = color;
  };

  // Boxes first, in document order, so nested panels paint over their parents.
  for (const element of root.querySelectorAll<HTMLElement | SVGElement>("*")) {
    if (!visibleWithin(element, root, cache)) continue;
    const style = getComputedStyle(element);

    if (element instanceof SVGGeometryElement) {
      const stroke = parseColor(style.stroke);
      const matrix = element.getScreenCTM();
      if (!stroke || stroke.alpha < 0.05 || !matrix) continue;
      const length = element.getTotalLength();
      let previous: DOMPoint | null = null;
      for (let at = 0; at <= length; at += length / 400) {
        const point = element.getPointAtLength(at).matrixTransform(matrix);
        if (previous) {
          const slope = (point.y - previous.y) / Math.max(0.001, Math.abs(point.x - previous.x));
          const glyph = Math.abs(slope) < 0.35 ? "-" : Math.abs(slope) > 2.5 ? "|" : slope < 0 ? "/" : "\\";
          put(toCol(point.x), toRow(point.y), glyph, stroke.rgb);
        }
        previous = point;
      }
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const left = Math.max(0, toCol(rect.left));
    const right = Math.min(cols - 1, toCol(rect.right - 1));
    const top = Math.max(0, toRow(rect.top));
    const bottom = Math.min(rows - 1, toRow(rect.bottom - 1));
    if (right < left || bottom < top) continue;

    const fill = parseColor(style.backgroundColor);
    if (fill && fill.alpha > 0.05) {
      const color = mixRgb(page, fill.rgb, fill.alpha);
      for (let row = top; row <= bottom; row += 1) {
        for (let col = left; col <= right; col += 1) {
          const index = row * cols + col;
          map.background[index] = color;
          map.glyph[index] = fillGlyph(color, page);
          map.foreground[index] = mixRgb(color, [255 - color[0], 255 - color[1], 255 - color[2]], 0.18);
        }
      }
    }

    const border = parseColor(style.borderTopColor);
    if (border && border.alpha > 0.05 && parseFloat(style.borderTopWidth) > 0
      && right - left >= 2 && bottom - top >= 1) {
      for (let col = left + 1; col < right; col += 1) {
        put(col, top, BOX.h, border.rgb);
        put(col, bottom, BOX.h, border.rgb);
      }
      for (let row = top + 1; row < bottom; row += 1) {
        put(left, row, BOX.v, border.rgb);
        put(right, row, BOX.v, border.rgb);
      }
      put(left, top, BOX.tl, border.rgb);
      put(right, top, BOX.tr, border.rgb);
      put(left, bottom, BOX.bl, border.rgb);
      put(right, bottom, BOX.br, border.rgb);
    }
  }

  // Then the text itself, spread over the cells each line box covers.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
    const parent = node.parentElement;
    if (!text || !parent || !visibleWithin(parent, root, cache)) continue;
    const color = parseColor(getComputedStyle(parent).color);
    if (!color || color.alpha < 0.05) continue;
    range.selectNodeContents(node);
    const lines = Array.from(range.getClientRects()).filter((line) => line.width > 0);
    const total = lines.reduce((sum, line) => sum + line.width, 0);
    let consumed = 0;
    for (const line of lines) {
      const from = Math.round((consumed / total) * text.length);
      consumed += line.width;
      const chunk = text.slice(from, Math.round((consumed / total) * text.length));
      // Each character keeps its own position; narrow type simply drops the
      // characters that share a cell instead of stretching the word.
      const row = toRow(line.top + line.height / 2);
      const advance = line.width / Math.max(1, chunk.length);
      for (let i = 0; i < chunk.length; i += 1) {
        if (chunk[i] !== " ") put(toCol(line.left + (i + 0.5) * advance), row, chunk[i], mixRgb(page, color.rgb, color.alpha));
      }
    }
  }
  return map;
}

type Star = { x: number; y: number; z: number; seed: number };

function createStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    x: hash(i, 1, 11) * 2 - 1,
    y: hash(i, 2, 12) * 2 - 1,
    z: hash(i, 3, 13) * STAR_DEPTH,
    seed: hash(i, 4, 14),
  }));
}

// Nearer stars are larger, brighter and more elaborate characters.
const STAR_CLASSES = [
  { until: 5, glyph: "*", size: 22 },
  { until: 12, glyph: "+", size: 15 },
  { until: 24, glyph: ".", size: 12 },
  { until: Infinity, glyph: ".", size: 9 },
];

const SPACE: Rgb = [2, 2, 2];

export function createAsciiTransition(
  layers: AsciiLayers,
  from: HTMLElement,
  to: HTMLElement,
  pages: { from: Rgb; to: Rgb },
): AsciiTransition {
  const spaceContext = layers.space.getContext("2d");
  const aContext = layers.planeA.getContext("2d");
  const bContext = layers.planeB.getContext("2d");
  let grid: Grid = { cols: 1, rows: 1, cellWidth: 9, cellHeight: 16 };
  let size = { width: 1, height: 1 };
  let pixelRatio = 1;
  let screens: { from: CellMap; to: CellMap } | null = null;
  let stars = createStars(1400);
  const colorCache = new Map<number, string>();
  const css = ([r, g, b]: Rgb) => {
    const key = (r << 16) | (g << 8) | b;
    let value = colorCache.get(key);
    if (!value) {
      value = `rgb(${r},${g},${b})`;
      colorCache.set(key, value);
    }
    return value;
  };

  const place = (canvas: HTMLCanvasElement, plane: PlaneState) => {
    canvas.style.visibility = plane.visible ? "visible" : "hidden";
    canvas.style.transform = plane.visible
      ? `translate3d(${plane.x}vw, ${plane.y}vh, ${plane.z}px) rotateY(${plane.rotateY}deg)`
      : "";
  };

  const begin = (context: CanvasRenderingContext2D) => {
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
  };

  const drawCell = (context: CanvasRenderingContext2D, col: number, row: number, glyph: string, foreground: Rgb, background: Rgb | null) => {
    const x = col * grid.cellWidth;
    const y = row * grid.cellHeight;
    if (background) {
      context.fillStyle = css(background);
      context.fillRect(x, y, grid.cellWidth, grid.cellHeight);
    }
    if (glyph !== " ") {
      context.fillStyle = css(foreground);
      context.fillText(glyph, x + grid.cellWidth / 2, y + grid.cellHeight / 2);
    }
  };

  // Case 02 in black and white; cells switch whole, then crumble into dust.
  const drawPlaneA = (context: CanvasRenderingContext2D, map: CellMap, progress: number) => {
    begin(context);
    context.font = `${Math.round(grid.cellHeight * 0.78)}px ${FONT}`;
    const { cols, rows } = grid;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cover = coverPhase(progress, col, row, rows);
        if (cover < 0.5 || dropPhase(progress, col, row) >= 0.5) continue;
        const index = row * cols + col;
        let glyph = map.glyph[index];
        // The leading edge of the rain lights up empty cells as it passes.
        if (glyph === " " && cover < 0.8) glyph = scrambleGlyph(col, row, progress);
        else if (glyph === " " && hash(col, row, 5) < 0.12) glyph = ".";
        drawCell(context, col, row, glyph, grey(map.foreground[index], 1.35 + (1 - cover) * 3.2), grey(map.background[index]));
      }
    }
  };

  // Case 03 as a lit screen of characters: scrambled colour, then itself,
  // then its cells fall away to uncover the real page underneath.
  const drawPlaneB = (context: CanvasRenderingContext2D, map: CellMap, progress: number) => {
    begin(context);
    context.font = `${Math.round(grid.cellHeight * 0.78)}px ${FONT}`;
    const { cols, rows } = grid;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (revealPhase(progress, col, row) >= 0.5) continue;
        const index = row * cols + col;
        const swap = swapPhase(progress, col, row, cols, rows);
        if (swap < 1) {
          const foreground = mixRgb(spectrum(col, row), map.foreground[index], swap * swap);
          drawCell(context, col, row, scrambleGlyph(col, row, progress), foreground, map.background[index]);
        } else {
          drawCell(context, col, row, map.glyph[index], map.foreground[index], map.background[index]);
        }
      }
    }
  };

  // An ASCII starfield flown through: characters grow as they near the camera,
  // leave streaks at speed, swing left while the camera turns and take on
  // colour as the flight goes on.
  const drawSpace = (context: CanvasRenderingContext2D, space: ReturnType<typeof flightState>["space"]) => {
    begin(context);
    const { width, height } = size;
    context.fillStyle = css(SPACE);
    context.fillRect(0, 0, width, height);
    const focal = height * 0.55;
    const spreadX = (STAR_DEPTH * width) / focal * 0.7;
    const spreadY = (STAR_DEPTH * height) / focal * 0.7;
    // The sky pans exactly one wrap period while the camera turns, so the
    // flight that follows heads straight into the centre of the frame.
    const yaw = -space.turn * width * 2;
    const project = (star: Star, depth: number) => {
      const x = width / 2 + ((star.x * spreadX) / depth) * focal + yaw;
      return [((x + width * 0.5) % (width * 2) + width * 2) % (width * 2) - width * 0.5, height / 2 + ((star.y * spreadY) / depth) * focal];
    };
    for (const starClass of STAR_CLASSES) {
      context.font = `${starClass.size}px ${FONT}`;
      for (let i = 0; i < stars.length; i += 1) {
        const star = stars[i];
        const depth = (((star.z - space.travel) % STAR_DEPTH) + STAR_DEPTH) % STAR_DEPTH + 0.6;
        const previous = STAR_CLASSES[STAR_CLASSES.indexOf(starClass) - 1];
        if (depth >= starClass.until || (previous && depth < previous.until)) continue;
        const brightness = Math.min(1, 1.45 - depth / STAR_DEPTH) * (0.6 + star.seed * 0.4);
        const fadeIn = Math.min(1, (STAR_DEPTH - depth) / 5);
        const white = Math.round(235 * brightness);
        const colour = mixRgb([white, white, white], spectrum(i, i * 3), space.colour * (0.35 + star.seed * 0.65));
        context.fillStyle = css(colour);
        // At speed a star stretches into a streak of line characters that
        // follow its direction of flight away from the centre of view.
        const [x, y] = project(star, depth);
        const trail = Math.round(space.speed * 10);
        if (trail > 0) {
          const angle = Math.atan2(star.y * spreadY, star.x * spreadX);
          const slope = Math.abs(Math.tan(angle));
          const streak = slope < 0.4 ? "-" : slope > 2.5 ? "|" : Math.sin(angle) * Math.cos(angle) > 0 ? "\\" : "/";
          for (let step = trail; step >= 1; step -= 1) {
            const [tx, ty] = project(star, depth * (1 + step * space.speed * 0.035));
            if (tx < -20 || tx > width + 20 || ty < -20 || ty > height + 20) continue;
            context.globalAlpha = fadeIn * 0.75 * (1 - step / (trail + 1));
            context.fillText(streak, tx, ty);
          }
        }
        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;
        context.globalAlpha = fadeIn;
        context.fillText(starClass.glyph, x, y);
      }
    }
    context.globalAlpha = 1;
  };

  const clearCanvas = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D | null) => {
    canvas.style.visibility = "hidden";
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  return {
    resize(width, height, ratio) {
      pixelRatio = ratio;
      size = { width, height };
      const cellWidth = width < 760 ? 7 : 9;
      const cellHeight = width < 760 ? 13 : 16;
      grid = { cols: Math.ceil(width / cellWidth), rows: Math.ceil(height / cellHeight), cellWidth, cellHeight };
      for (const canvas of [layers.space, layers.planeA, layers.planeB]) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      stars = createStars(width < 760 ? 900 : 1800);
      screens = null;
    },
    invalidate() {
      screens = null;
    },
    render(progress) {
      if (!spaceContext || !aContext || !bContext || progress <= 0 || progress >= 1) {
        clearCanvas(layers.space, spaceContext);
        clearCanvas(layers.planeA, aContext);
        clearCanvas(layers.planeB, bContext);
        return;
      }
      if (!screens) screens = { from: sampleScreen(from, grid, pages.from), to: sampleScreen(to, grid, pages.to) };
      const flight = flightState(progress);
      place(layers.planeA, flight.planeA);
      place(layers.planeB, flight.planeB);
      layers.space.style.visibility = flight.space.visible ? "visible" : "hidden";
      if (flight.planeA.visible) drawPlaneA(aContext, screens.from, progress);
      if (flight.planeB.visible) drawPlaneB(bContext, screens.to, progress);
      if (flight.space.visible) drawSpace(spaceContext, flight.space);
    },
    dispose() {
      clearCanvas(layers.space, spaceContext);
      clearCanvas(layers.planeA, aContext);
      clearCanvas(layers.planeB, bContext);
      colorCache.clear();
    },
  };
}

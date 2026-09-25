import {
  cellPhase,
  fillGlyph,
  grey,
  hash,
  mixRgb,
  scrambleGlyph,
  spectrum,
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

export function createAsciiTransition(
  canvas: HTMLCanvasElement,
  from: HTMLElement,
  to: HTMLElement,
  pages: { from: Rgb; to: Rgb },
): AsciiTransition {
  const context = canvas.getContext("2d");
  let grid: Grid = { cols: 1, rows: 1, cellWidth: 9, cellHeight: 16 };
  let pixelRatio = 1;
  let screens: { from: CellMap; to: CellMap } | null = null;
  let drawn = false;
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

  const clear = () => {
    if (!context || !drawn) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawn = false;
  };

  return {
    resize(width, height, ratio) {
      pixelRatio = ratio;
      const cellWidth = width < 760 ? 7 : 9;
      const cellHeight = width < 760 ? 13 : 16;
      grid = { cols: Math.ceil(width / cellWidth), rows: Math.ceil(height / cellHeight), cellWidth, cellHeight };
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      screens = null;
      drawn = false;
    },
    invalidate() {
      screens = null;
    },
    render(progress) {
      if (!context || progress <= 0 || progress >= 1) {
        clear();
        return;
      }
      if (!screens) screens = { from: sampleScreen(from, grid, pages.from), to: sampleScreen(to, grid, pages.to) };
      const { cols, rows, cellWidth, cellHeight } = grid;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, cols * cellWidth, rows * cellHeight);
      context.font = `${Math.round(cellHeight * 0.78)}px ${FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      drawn = true;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const phase = cellPhase(progress, col, row, cols, rows);
          // Cells switch whole, like a terminal redraw, never half-transparent.
          if (phase.cover < 0.5 || phase.reveal >= 0.5) continue;
          const index = row * cols + col;
          let glyph: string;
          let foreground: Rgb;
          let background: Rgb;
          if (phase.swap <= 0) {
            // Black and white: case 02 in its own characters, with a phosphor
            // flash on freshly converted cells.
            background = grey(screens.from.background[index]);
            glyph = screens.from.glyph[index];
            // The leading edge of the rain lights up empty cells as it passes.
            if (glyph === " " && phase.cover < 0.8) glyph = scrambleGlyph(col, row, progress);
            else if (glyph === " " && hash(col, row, 5) < 0.12) glyph = ".";
            foreground = grey(screens.from.foreground[index], 1.35 + (1 - phase.cover) * 3.2);
          } else if (phase.swap < 1) {
            // The colour front: scrambled glyphs carry the first colours in.
            background = mixRgb(grey(screens.from.background[index]), screens.to.background[index], phase.swap);
            glyph = scrambleGlyph(col, row, progress);
            foreground = mixRgb(spectrum(col, row), screens.to.foreground[index], phase.swap * phase.swap);
          } else {
            // Case 03 in colour, still made of characters.
            background = screens.to.background[index];
            glyph = screens.to.glyph[index];
            foreground = screens.to.foreground[index];
          }
          const x = col * cellWidth;
          const y = row * cellHeight;
          context.fillStyle = css(background);
          context.fillRect(x, y, cellWidth, cellHeight);
          if (glyph !== " ") {
            context.fillStyle = css(foreground);
            context.fillText(glyph, x + cellWidth / 2, y + cellHeight / 2);
          }
        }
      }
    },
    dispose() {
      clear();
      colorCache.clear();
    },
  };
}

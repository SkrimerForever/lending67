import assert from "node:assert/strict";
import test from "node:test";
import { cellPhase, DOM_SWITCH, scrambleGlyph, spectrum } from "./asciiTransition.ts";

const COLS = 160;
const ROWS = 56;

function everyCell(check: (col: number, row: number) => void) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) check(col, row);
  }
}

test("nothing is drawn before the transition starts", () => {
  everyCell((col, row) => {
    const phase = cellPhase(0, col, row, COLS, ROWS);
    assert.equal(phase.cover, 0);
    assert.equal(phase.swap, 0);
    assert.equal(phase.reveal, 0);
  });
});

test("every cell is opaque when the DOM swaps case 02 for case 03", () => {
  everyCell((col, row) => {
    const phase = cellPhase(DOM_SWITCH, col, row, COLS, ROWS);
    assert.equal(phase.cover, 1);
    assert.equal(phase.reveal, 0);
  });
});

test("a cell turns into case 03 before it falls away", () => {
  everyCell((col, row) => {
    for (let progress = 0; progress <= 1; progress += 0.01) {
      const phase = cellPhase(progress, col, row, COLS, ROWS);
      if (phase.reveal > 0) assert.equal(phase.swap, 1);
    }
  });
});

test("the transition ends on the real case 03", () => {
  everyCell((col, row) => assert.equal(cellPhase(1, col, row, COLS, ROWS).reveal, 1));
});

test("scramble and colour are deterministic, so scrolling back replays them", () => {
  assert.equal(scrambleGlyph(12, 7, 0.4321), scrambleGlyph(12, 7, 0.4321));
  assert.deepEqual(spectrum(40, 20), spectrum(40, 20));
  for (const channel of spectrum(40, 20)) assert.ok(channel >= 0 && channel <= 255);
});

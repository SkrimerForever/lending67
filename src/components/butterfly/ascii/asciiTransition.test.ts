import assert from "node:assert/strict";
import test from "node:test";
import {
  CASE_THREE_ARRIVED,
  CASE_TWO_COVERED,
  coverPhase,
  flightState,
  revealPhase,
  scrambleGlyph,
  spectrum,
  swapPhase,
} from "./asciiTransition.ts";

// -0 and 0 are the same pose.
const isZero = (value: number) => assert.ok(value === 0, `${value} is not 0`);
const COLS = 160;
const ROWS = 56;

function everyCell(check: (col: number, row: number) => void) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) check(col, row);
  }
}

test("nothing moves before the transition starts", () => {
  const state = flightState(0);
  assert.equal(state.planeA.visible, false);
  assert.equal(state.planeB.visible, false);
  assert.equal(state.space.visible, false);
  everyCell((col, row) => assert.equal(coverPhase(0, col, row, ROWS), 0));
});

test("case 02 is fully in characters, still facing the camera, before it is hidden", () => {
  everyCell((col, row) => assert.equal(coverPhase(CASE_TWO_COVERED, col, row, ROWS), 1));
  const { planeA } = flightState(CASE_TWO_COVERED);
  isZero(planeA.x);
  isZero(planeA.z);
  isZero(planeA.rotateY);
});

test("the camera turns and flies through space in between", () => {
  const cruising = flightState(0.55);
  assert.ok(cruising.space.visible);
  assert.equal(cruising.space.turn, 1);
  assert.ok(cruising.space.speed > 0.8);
  assert.ok(flightState(0.3).space.travel < cruising.space.travel);
  assert.ok(flightState(0.3).space.colour === 0 && flightState(0.7).space.colour === 1);
});

test("case 03 lands exactly full-screen and fully settled before space is hidden", () => {
  const { planeB, space } = flightState(CASE_THREE_ARRIVED);
  assert.equal(space.visible, false);
  assert.equal(planeB.visible, true);
  isZero(planeB.z);
  isZero(planeB.rotateY);
  assert.equal(space.speed < 0.05, true);
  everyCell((col, row) => {
    assert.equal(swapPhase(CASE_THREE_ARRIVED, col, row, COLS, ROWS), 1);
    assert.equal(revealPhase(CASE_THREE_ARRIVED, col, row), 0);
  });
});

test("the transition ends on the real case 03", () => {
  everyCell((col, row) => assert.equal(revealPhase(1, col, row), 1));
  assert.equal(flightState(1).planeB.visible, false);
});

test("scramble and colour are deterministic, so scrolling back replays them", () => {
  assert.equal(scrambleGlyph(12, 7, 0.4321), scrambleGlyph(12, 7, 0.4321));
  assert.deepEqual(flightState(0.5731), flightState(0.5731));
  assert.deepEqual(spectrum(40, 20), spectrum(40, 20));
  for (const channel of spectrum(40, 20)) assert.ok(channel >= 0 && channel <= 255);
});

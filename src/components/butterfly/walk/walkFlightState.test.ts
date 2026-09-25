import assert from "node:assert/strict";
import test from "node:test";
import { getWalkFlightState, LIGHT_Z, PORTAL_DISTANCE, WALK_END, WALK_START } from "./walkFlightState.ts";

const desktop = { reducedMotion: false, narrow: false };
const narrow = { reducedMotion: false, narrow: true };
const reduced = { reducedMotion: true, narrow: false };

test("inactive before the walk stage starts", () => {
  const state = getWalkFlightState(1.85, desktop);
  assert.equal(state.active, false);
  assert.equal(state.darknessDive, 0);
  assert.equal(state.dustReveal, 0);
  assert.equal(state.caseReveal, 0);
  assert.equal(getWalkFlightState(WALK_START, desktop).active, false);
});

test("dust appears while the display is still turning", () => {
  const state = getWalkFlightState(1.94, desktop);
  assert.equal(state.active, true);
  assert.ok(state.dustReveal > 0);
  assert.ok(state.darknessDive > 0 && state.darknessDive < 0.3);
  assert.equal(getWalkFlightState(2.0, desktop).darknessDive, 1);
});

test("a faint ground outline appears before the display is gone", () => {
  const state = getWalkFlightState(1.97, desktop);
  assert.ok(state.groundReveal > 0 && state.groundReveal < 0.5);
  assert.ok(getWalkFlightState(2.02, desktop).groundReveal > 0.999);
});

test("the camera eases in before the dive", () => {
  const start = getWalkFlightState(1.905, desktop).cameraPosition[2];
  const slow = getWalkFlightState(1.95, desktop).cameraPosition[2];
  const fast = getWalkFlightState(2.0, desktop).cameraPosition[2];
  assert.ok(start - slow < 4, `slow segment ${start - slow}`);
  assert.ok(slow - fast > 8, `dive segment ${slow - fast}`);
});

test("the camera starts well behind the walker", () => {
  const state = getWalkFlightState(2.0, desktop);
  assert.ok(state.cameraPosition[2] > state.walkerZ + 5);
  assert.ok(state.cameraPosition[1] > 2.4);
});

test("the camera passes just above and left of the left shoulder", () => {
  const state = getWalkFlightState(2.1, desktop);
  const [x, y, z] = state.cameraPosition;
  assert.ok(Math.abs(z - state.walkerZ) < 0.15, `z gap ${z - state.walkerZ}`);
  assert.ok(y - 1.45 > 0.2 && y - 1.45 < 0.6, `height above shoulder ${y - 1.45}`);
  assert.ok(x > -0.6 && x < -0.2, `x ${x}`);
});

test("the camera is ahead of the walker after the overtake", () => {
  const state = getWalkFlightState(2.14, desktop);
  assert.ok(state.cameraPosition[2] < state.walkerZ - 2);
});

test("the walker holds one mid-stride pose", () => {
  const early = getWalkFlightState(2.0, desktop);
  const late = getWalkFlightState(2.15, desktop);
  assert.equal(early.stride, late.stride);
  assert.equal(early.walkerZ, late.walkerZ);
});

test("case 02 is one short scroll after the shoulder pass", () => {
  assert.equal(getWalkFlightState(2.16, desktop).whiteout, 1);
  assert.equal(getWalkFlightState(2.19, desktop).caseReveal, 1);
  assert.equal(getWalkFlightState(2.14, desktop).caseReveal, 0);
});

test("the flight ends inside the light and reveals case 02", () => {
  const end = getWalkFlightState(WALK_END, desktop);
  assert.equal(end.caseReveal, 1);
  assert.ok(Math.abs(end.cameraPosition[2] - (LIGHT_Z + PORTAL_DISTANCE)) < 1e-9);
  assert.ok(end.cameraPosition[2] < LIGHT_Z + 2.5);
});

test("camera travel is continuous", () => {
  let previous = getWalkFlightState(1.901, desktop).cameraPosition;
  for (let scroll = 1.902; scroll <= WALK_END; scroll += 0.001) {
    const next = getWalkFlightState(scroll, desktop).cameraPosition;
    const step = Math.hypot(next[0] - previous[0], next[1] - previous[1], next[2] - previous[2]);
    assert.ok(step < 1, `jump ${step} at ${scroll}`);
    previous = next;
  }
});

test("narrow viewports pass the shoulder wider", () => {
  const wide = getWalkFlightState(2.1, desktop).cameraPosition[0];
  const tight = getWalkFlightState(2.1, narrow).cameraPosition[0];
  assert.ok(tight < wide);
});

test("reduced motion shows three stable states", () => {
  const first = getWalkFlightState(2.0, reduced);
  const firstLater = getWalkFlightState(2.04, reduced);
  assert.deepEqual(first.cameraPosition, firstLater.cameraPosition);
  assert.equal(first.stride, firstLater.stride);
  assert.equal(first.whiteout, 0);
  const light = getWalkFlightState(2.12, reduced);
  assert.equal(light.whiteout, 1);
  assert.equal(light.caseReveal, 0);
  assert.deepEqual(light.cameraPosition, first.cameraPosition);
  assert.equal(getWalkFlightState(2.21, reduced).caseReveal, 1);
  assert.equal(first.dustStreak, 0);
});

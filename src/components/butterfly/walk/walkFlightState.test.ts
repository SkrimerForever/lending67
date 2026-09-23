import assert from "node:assert/strict";
import test from "node:test";
import { getWalkFlightState, WALK_START } from "./walkFlightState.ts";

const desktop = { reducedMotion: false, narrow: false };
const narrow = { reducedMotion: false, narrow: true };
const reduced = { reducedMotion: true, narrow: false };

test("inactive before the operator turn completes", () => {
  const state = getWalkFlightState(1.9, desktop);
  assert.equal(state.active, false);
  assert.equal(state.darknessDive, 0);
  assert.equal(state.caseReveal, 0);
  assert.equal(getWalkFlightState(WALK_START, desktop).active, false);
});

test("the dive into darkness starts right after the turn", () => {
  const state = getWalkFlightState(2.02, desktop);
  assert.equal(state.active, true);
  assert.ok(state.darknessDive > 0 && state.darknessDive < 1);
  assert.equal(getWalkFlightState(2.06, desktop).darknessDive, 1);
});

test("the camera starts well behind the walker", () => {
  const state = getWalkFlightState(2.06, desktop);
  assert.ok(state.cameraPosition[2] > state.walkerZ + 5);
  assert.ok(state.cameraPosition[1] > 2.4);
});

test("the camera passes just above and left of the left shoulder", () => {
  const state = getWalkFlightState(2.24, desktop);
  const [x, y, z] = state.cameraPosition;
  assert.ok(Math.abs(z - state.walkerZ) < 0.15, `z gap ${z - state.walkerZ}`);
  assert.ok(y - 1.45 > 0.2 && y - 1.45 < 0.6, `height above shoulder ${y - 1.45}`);
  assert.ok(x > -0.6 && x < -0.2, `x ${x}`);
});

test("the camera is ahead of the walker after the overtake", () => {
  const state = getWalkFlightState(2.32, desktop);
  assert.ok(state.cameraPosition[2] < state.walkerZ - 2);
});

test("the walker completes about three steps", () => {
  const start = getWalkFlightState(2.02, desktop).stride;
  const end = getWalkFlightState(2.6, desktop).stride;
  assert.ok(Math.abs(end - start - 1.5) < 1e-9);
});

test("the flight ends inside the light and reveals case 02", () => {
  assert.equal(getWalkFlightState(2.5, desktop).whiteout, 1);
  const end = getWalkFlightState(2.6, desktop);
  assert.equal(end.caseReveal, 1);
  assert.ok(end.cameraPosition[2] < -38);
});

test("camera travel is continuous", () => {
  let previous = getWalkFlightState(1.981, desktop).cameraPosition;
  for (let scroll = 1.982; scroll <= 2.6; scroll += 0.001) {
    const next = getWalkFlightState(scroll, desktop).cameraPosition;
    const step = Math.hypot(next[0] - previous[0], next[1] - previous[1], next[2] - previous[2]);
    assert.ok(step < 0.5, `jump ${step} at ${scroll}`);
    previous = next;
  }
});

test("narrow viewports pass the shoulder wider", () => {
  const wide = getWalkFlightState(2.24, desktop).cameraPosition[0];
  const tight = getWalkFlightState(2.24, narrow).cameraPosition[0];
  assert.ok(tight < wide);
});

test("reduced motion shows three stable states", () => {
  const first = getWalkFlightState(2.1, reduced);
  const firstLater = getWalkFlightState(2.18, reduced);
  assert.deepEqual(first.cameraPosition, firstLater.cameraPosition);
  assert.equal(first.stride, firstLater.stride);
  assert.equal(first.whiteout, 0);
  const light = getWalkFlightState(2.3, reduced);
  assert.equal(light.whiteout, 1);
  assert.equal(light.caseReveal, 0);
  assert.deepEqual(light.cameraPosition, first.cameraPosition);
  assert.equal(getWalkFlightState(2.55, reduced).caseReveal, 1);
  assert.equal(first.dustStreak, 0);
});

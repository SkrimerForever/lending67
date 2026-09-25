import assert from "node:assert/strict";
import test from "node:test";
import { CASE_THREE_PORTAL, CASE_THREE_SCREEN, getButterflyPassState, getMeadowPassState, MEADOW_FAR_Z, MEADOW_NEAR_Z, getWalkFlightState, LIGHT_Z, PORTAL_DISTANCE, WALK_END, WALK_START } from "./walkFlightState.ts";

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

const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("the butterfly pass starts on case 02 and ends full-screen on case 03", () => {
  const end = getWalkFlightState(WALK_END, desktop).cameraPosition;
  assert.ok(distance(getButterflyPassState(0.0001, desktop).cameraPosition, end) < 0.01);
  assert.equal(getButterflyPassState(0, desktop).active, false);
  const last = getButterflyPassState(1, desktop);
  assert.deepEqual(last.cameraPosition, [CASE_THREE_SCREEN[0], CASE_THREE_SCREEN[1], CASE_THREE_SCREEN[2] + PORTAL_DISTANCE]);
  assert.equal(last.caseThreeReveal, 1);
});

test("the case 02 screen becomes the butterfly before it flies", () => {
  const formed = getButterflyPassState(0.26, desktop);
  assert.equal(formed.screenDissolve, 1);
  assert.equal(formed.gather, 1);
  assert.equal(formed.land, 0);
  assert.equal(formed.caseThreeReveal, 0);
});

test("colour arrives only as a faint warmth on the butterfly", () => {
  assert.equal(getButterflyPassState(0.2, desktop).warmth, 0);
  const flying = getButterflyPassState(0.45, desktop);
  assert.ok(flying.warmth > 0.9 && flying.warmth <= 1);
});

test("the butterfly reaches the case 03 screen and spreads over it before the fly-in", () => {
  const landed = getButterflyPassState(0.76, desktop);
  assert.equal(landed.land, 1);
  assert.ok(distance(landed.butterflyPosition, CASE_THREE_SCREEN) < 0.5);
  assert.equal(getButterflyPassState(0.73, desktop).caseThreeReveal, 0);
});

test("butterfly pass camera travel is continuous", () => {
  let previous = getButterflyPassState(0.001, desktop);
  for (let progress = 0.002; progress <= 1; progress += 0.001) {
    const next = getButterflyPassState(progress, desktop);
    assert.ok(distance(next.cameraPosition, previous.cameraPosition) < 0.2, `camera jumps at ${progress}`);
    assert.ok(distance(next.cameraTarget, previous.cameraTarget) < 0.3, `view jumps at ${progress}`);
    previous = next;
  }
});

test("reduced motion keeps the camera still and simply crossfades the cases", () => {
  const reducedPass = { reducedMotion: true, narrow: false };
  assert.deepEqual(getButterflyPassState(0.3, reducedPass).cameraPosition, getButterflyPassState(0.9, reducedPass).cameraPosition);
  assert.equal(getButterflyPassState(0.95, reducedPass).caseThreeReveal, 1);
  assert.equal(getButterflyPassState(0.5, reducedPass).gather, 0);
});

test("the butterfly flies fast and banks through its turns, then comes to rest", () => {
  let fastest = 0;
  let steepestBank = 0;
  for (let progress = 0.22; progress <= 0.66; progress += 0.005) {
    const state = getButterflyPassState(progress, desktop);
    fastest = Math.max(fastest, state.butterflySpeed);
    steepestBank = Math.max(steepestBank, Math.abs(state.butterflyBank));
  }
  assert.ok(fastest > 0.6, `top speed ${fastest}`);
  assert.ok(steepestBank > 0.15, `steepest bank ${steepestBank}`);
  const landed = getButterflyPassState(0.8, desktop);
  assert.equal(landed.butterflySpeed, 0);
  assert.equal(landed.cameraRoll, 0);
});

test("case 02 folds away in place — to a line, then a point — before the camera moves", () => {
  const start = getButterflyPassState(0.001, desktop);
  const folded = getButterflyPassState(0.12, desktop);
  assert.ok(distance(folded.cameraPosition, start.cameraPosition) < 0.1, "camera holds while the screen folds");
  const line = getButterflyPassState(0.08, desktop).collapse;
  assert.ok(line[1] < 0.05 && line[0] > 0.9, `a line first: ${line}`);
  const point = getButterflyPassState(0.14, desktop).collapse;
  assert.ok(point[0] < 0.05 && point[1] < 0.05, `then a point: ${point}`);
});

test("the camera rises above the field and flies on, without backing off first", () => {
  const start = getButterflyPassState(0.001, desktop).cameraPosition;
  let highest = 0;
  for (let progress = 0.001; progress <= 1; progress += 0.005) {
    const [, y, z] = getButterflyPassState(progress, desktop).cameraPosition;
    highest = Math.max(highest, y);
    assert.ok(z <= start[2] + 0.6, `camera backs off at ${progress}`);
  }
  assert.ok(highest > 4.5, `highest ${highest}`);
});

test("the meadow pass starts on the full-screen case 03 pose", () => {
  assert.equal(getMeadowPassState(0, desktop).active, false);
  assert.ok(distance(getMeadowPassState(0.0001, desktop).cameraPosition, CASE_THREE_PORTAL) < 0.01);
  assert.ok(distance(getButterflyPassState(1, desktop).cameraPosition, CASE_THREE_PORTAL) < 1e-9);
});

test("case 03 folds away before the butterfly flies again", () => {
  const folded = getMeadowPassState(0.15, desktop);
  assert.ok(folded.collapse[0] < 0.05 && folded.collapse[1] < 0.05);
  assert.equal(folded.screenDissolve, 1);
  assert.equal(getMeadowPassState(0.26, desktop).gather, 1);
});

test("the road turns into one grass road early in the flight", () => {
  const bare = getMeadowPassState(0.15, desktop);
  assert.ok(bare.grassFront > MEADOW_NEAR_Z, "no grass before the butterfly is out");
  assert.equal(bare.grassAll, 0);
  const growing = getMeadowPassState(0.35, desktop);
  assert.ok(growing.grassFront < MEADOW_NEAR_Z && growing.grassFront > MEADOW_FAR_Z, "the wave is on the road");
  assert.ok(growing.grassFront < growing.cameraPosition[2], "the wave runs ahead of the camera");
  assert.equal(getMeadowPassState(0.62, desktop).grassAll, 1);
});

test("the camera flies low over the road with the butterfly ahead of it", () => {
  for (let progress = 0.3; progress <= 1; progress += 0.01) {
    const state = getMeadowPassState(progress, desktop);
    assert.ok(state.cameraPosition[1] < 1.6, `camera low at ${progress}`);
    assert.ok(state.butterflyPosition[2] < state.cameraPosition[2], `butterfly ahead at ${progress}`);
  }
});

test("meadow camera travel is continuous and block 04 opens at the end", () => {
  let previous = getMeadowPassState(0.001, desktop);
  for (let progress = 0.002; progress <= 1; progress += 0.001) {
    const next = getMeadowPassState(progress, desktop);
    assert.ok(distance(next.cameraPosition, previous.cameraPosition) < 0.2, `camera jumps at ${progress}`);
    assert.ok(distance(next.cameraTarget, previous.cameraTarget) < 0.3, `view jumps at ${progress}`);
    previous = next;
  }
  assert.equal(getMeadowPassState(0.8, desktop).processReveal, 0);
  assert.equal(getMeadowPassState(1, desktop).processReveal, 1);
});

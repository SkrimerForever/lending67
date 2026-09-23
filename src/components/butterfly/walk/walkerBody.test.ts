import assert from "node:assert/strict";
import test from "node:test";
import { sampleWalkerBody, WALKER_BONE_COUNT } from "./walkerBody.ts";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test("returns the requested number of points", () => {
  const body = sampleWalkerBody(5000, seeded(1));
  assert.equal(body.local.length, 5000 * 3);
  assert.equal(body.bone.length, 5000);
  assert.equal(body.seed.length, 5000);
});

test("every bone receives points", () => {
  const body = sampleWalkerBody(5000, seeded(2));
  const counts = new Array(WALKER_BONE_COUNT).fill(0);
  body.bone.forEach((bone) => { counts[bone] += 1; });
  counts.forEach((count, bone) => assert.ok(count > 10, `bone ${bone} has ${count}`));
});

test("limbs hang below their joints and feet point forward", () => {
  const body = sampleWalkerBody(5000, seeded(3));
  let footZ = 0;
  let feet = 0;
  for (let i = 0; i < body.bone.length; i += 1) {
    const bone = body.bone[i];
    const y = body.local[i * 3 + 1];
    if (bone === 10 || bone === 11 || bone === 4) assert.ok(y <= 0.09, `bone ${bone} y ${y}`);
    if (bone === 12 || bone === 15) { footZ += body.local[i * 3 + 2]; feet += 1; }
  }
  assert.ok(footZ / feet < -0.03);
});

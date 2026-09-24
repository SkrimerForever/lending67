import assert from "node:assert/strict";
import test from "node:test";
import { sampleWalkerBody, walkerBodyDistance, WALKER_BONE_COUNT, WALKER_MATERIALS } from "./walkerBody.ts";

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const body = sampleWalkerBody(6000, seeded(7));

test("returns the requested number of points", () => {
  assert.equal(body.rest.length, 6000 * 3);
  assert.equal(body.bones.length, 6000 * 2);
  assert.equal(body.weight.length, 6000);
  assert.equal(body.seed.length, 6000);
  assert.equal(body.shell.length, 6000);
});

test("every bone receives points and weights stay in range", () => {
  const counts = new Array(WALKER_BONE_COUNT).fill(0);
  for (let i = 0; i < 6000; i += 1) {
    counts[body.bones[i * 2]] += 1;
    assert.ok(body.weight[i] >= 0 && body.weight[i] <= 0.5);
  }
  counts.forEach((count, bone) => assert.ok(count > 5, `bone ${bone} has ${count}`));
});

test("points lie inside or on the one body surface", () => {
  for (let i = 0; i < 6000; i += 1) {
    const d = walkerBodyDistance(body.rest[i * 3], body.rest[i * 3 + 1], body.rest[i * 3 + 2]);
    // Shell band (0.004) plus up to 0.006 of hair fuzz.
    assert.ok(d <= 0.0101, `point ${i} is ${d} outside`);
  }
});

test("most points form the surface shell", () => {
  const shell = body.shell.reduce((sum, value) => sum + value, 0);
  assert.ok(shell / 6000 > 0.75, `shell share ${shell / 6000}`);
});

test("the legs stay separate below the crotch", () => {
  for (let i = 0; i < 6000; i += 1) {
    const x = body.rest[i * 3];
    const y = body.rest[i * 3 + 1];
    assert.ok(!(Math.abs(x) < 0.025 && y > 0.15 && y < 0.6), `point in leg gap at ${x}, ${y}`);
  }
});

test("the figure is about 1.85 m tall and stands on the ground", () => {
  let top = -Infinity;
  let bottom = Infinity;
  for (let i = 0; i < 6000; i += 1) {
    top = Math.max(top, body.rest[i * 3 + 1]);
    bottom = Math.min(bottom, body.rest[i * 3 + 1]);
  }
  assert.ok(top > 1.8 && top < 1.88, `top ${top}`);
  assert.ok(bottom > -0.02 && bottom < 0.03, `bottom ${bottom}`);
});

test("hands never merge with thighs", () => {
  assert.ok(walkerBodyDistance(0.2, 0.84, 0) > 0, "gap right");
  assert.ok(walkerBodyDistance(-0.2, 0.84, 0) > 0, "gap left");
});

test("the walker wears clothes and has hair", () => {
  const counts = new Map<number, number>();
  body.material.forEach((material) => counts.set(material, (counts.get(material) ?? 0) + 1));
  for (const [name, code] of Object.entries(WALKER_MATERIALS)) {
    assert.ok((counts.get(code) ?? 0) > 30, `${name} has ${counts.get(code) ?? 0} points`);
  }
  // Clothing covers most of the body; skin is only the face, neck and hands.
  assert.ok((counts.get(WALKER_MATERIALS.skin) ?? 0) / 6000 < 0.2);
});

import assert from "node:assert/strict";
import test from "node:test";
import { quadToMatrix3d, type ScreenPoint } from "./portalTransform.ts";

function apply(matrix: string, x: number, y: number): ScreenPoint {
  const m = matrix.slice(9, -1).split(",").map(Number);
  const w = m[3] * x + m[7] * y + m[15];
  return [(m[0] * x + m[4] * y + m[12]) / w, (m[1] * x + m[5] * y + m[13]) / w];
}

const close = (actual: ScreenPoint, expected: ScreenPoint) => {
  assert.ok(Math.abs(actual[0] - expected[0]) < 1e-3, `${actual} ≠ ${expected}`);
  assert.ok(Math.abs(actual[1] - expected[1]) < 1e-3, `${actual} ≠ ${expected}`);
};

test("a full-screen quad is the identity", () => {
  const matrix = quadToMatrix3d(1440, 900, [[0, 0], [1440, 0], [1440, 900], [0, 900]]);
  assert.equal(matrix, "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)");
});

test("element corners land on a perspective quad", () => {
  const corners: ScreenPoint[] = [[610, 380], [842, 372], [846, 512], [606, 522]];
  const matrix = quadToMatrix3d(1440, 900, corners);
  close(apply(matrix, 0, 0), corners[0]);
  close(apply(matrix, 1440, 0), corners[1]);
  close(apply(matrix, 1440, 900), corners[2]);
  close(apply(matrix, 0, 900), corners[3]);
});

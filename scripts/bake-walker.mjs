// Bakes the walker particle cloud from a Mixamo FBX character.
//
//   node scripts/bake-walker.mjs assets/character.fbx public/walker-points.bin [preview-dir]
//
// The character is posed mid-stride by rotating its skeleton, skinned on the
// CPU, sampled uniformly over its surface, and written as Float32 records
// [x, y, z, nx, ny, nz, tone, seed] in walk-scene space (metres, facing -Z,
// left = -X). The normal lets the shader hide points on the far side.
// With a preview dir it also writes back.pgm / side.pgm for a quick look.
import { readFileSync, writeFileSync } from "node:fs";

// FBXLoader asks the DOM for <img> elements when it meets textures; only the
// geometry is needed here, so it gets an inert stand-in.
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = {
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, style: {}, set src(value) {} }),
};
const THREE = await import("three");
const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");

const [input, output, previewDir] = process.argv.slice(2);
const POINT_COUNT = 28_000;
const SCALE = 0.01; // Mixamo units are centimetres.

// Brightness per clothing piece, so jacket, trousers, hair and shoes read apart.
const TONES = {
  Body: 1.0,
  Sweater: 0.95,
  Collar: 0.9,
  Pants: 0.42,
  Shoes: 0.25,
  Hair: 0.22,
};
const toneFor = (meshName) => {
  const key = Object.keys(TONES).find((name) => meshName.endsWith(`_${name}`));
  return key === undefined ? null : TONES[key];
};

// Mid-stride pose, as rotations about world axes (the model faces +Z, its left is +X).
// Arms come down from the T-pose, left leg forward, right heel lifting, arms in counter-swing.
const POSE = [
  // Arms hang with a slight gap from the torso, so the upper arm keeps its outline.
  ["LeftArm", "z", -1.3], ["RightArm", "z", 1.3],
  ["LeftArm", "x", 0.28], ["RightArm", "x", -0.3],
  ["LeftForeArm", "x", -0.18], ["RightForeArm", "x", -0.42],
  ["LeftUpLeg", "x", -0.26], ["LeftLeg", "x", 0.08], ["LeftFoot", "x", -0.08],
  ["RightUpLeg", "x", 0.2], ["RightLeg", "x", 0.34], ["RightFoot", "x", 0.24],
  ["Spine1", "x", 0.04], ["Head", "x", -0.04],
];

const file = readFileSync(input);
const root = new FBXLoader().parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), "");
root.updateMatrixWorld(true);

// Mixamo nests helper copies of each bone under the bone of the same name, and
// some clothing is bound to those copies. Rotate only the outermost copy; the
// nested ones follow it. Rotating every copy would compound the turn.
const boneName = (object) => object.name.replace(/^mixamorig\d*/, "");
const bonesByName = new Map();
root.traverse((object) => {
  if (!object.isBone) return;
  const name = boneName(object);
  if (object.parent?.isBone && boneName(object.parent) === name) return;
  if (!bonesByName.has(name)) bonesByName.set(name, []);
  bonesByName.get(name).push(object);
});

const axes = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
const parentWorld = new THREE.Quaternion();
const worldRotation = new THREE.Quaternion();
for (const [name, axis, angle] of POSE) {
  const bones = bonesByName.get(name);
  if (!bones) throw new Error(`bone ${name} not found`);
  for (const bone of bones) {
    // Rotate about a world axis: q_local' = inv(parentWorld) * R * parentWorld * q_local.
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(parentWorld);
    worldRotation.setFromAxisAngle(axes[axis], angle);
    const local = parentWorld.clone().invert().multiply(worldRotation).multiply(parentWorld);
    bone.quaternion.premultiply(local);
    bone.updateMatrixWorld(true);
  }
}
root.updateMatrixWorld(true);

// Skin every relevant mesh into world-space triangles.
const pieces = [];
root.traverse((object) => {
  if (!object.isSkinnedMesh) return;
  const tone = toneFor(object.name);
  if (tone === null) return;
  object.skeleton.update();
  const position = object.geometry.attributes.position;
  const posed = new Float32Array(position.count * 3);
  const vertex = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    object.getVertexPosition(i, vertex);
    vertex.applyMatrix4(object.matrixWorld);
    posed.set([vertex.x, vertex.y, vertex.z], i * 3);
  }
  const index = object.geometry.index
    ? object.geometry.index.array
    : Uint32Array.from({ length: position.count }, (_, i) => i);
  pieces.push({ name: object.name, tone, posed, index });
});

function sampleSurface({ posed, index }, count) {
  const areas = [];
  let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < index.length; t += 3) {
    a.fromArray(posed, index[t] * 3); b.fromArray(posed, index[t + 1] * 3); c.fromArray(posed, index[t + 2] * 3);
    total += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    areas.push(total);
  }
  const points = [];
  for (let n = 0; n < count; n += 1) {
    const pick = Math.random() * total;
    let lo = 0, hi = areas.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (areas[mid] < pick) lo = mid + 1; else hi = mid; }
    const t = lo * 3;
    a.fromArray(posed, index[t] * 3); b.fromArray(posed, index[t + 1] * 3); c.fromArray(posed, index[t + 2] * 3);
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const point = a.clone().add(b.clone().sub(a).multiplyScalar(u)).add(c.clone().sub(a).multiplyScalar(v));
    point.normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    points.push(point);
  }
  return { points, area: total };
}

// Oversample, then drop body skin that sits under clothing or hair (within ~3 cm).
const samples = pieces.map((piece) => ({ piece, ...sampleSurface(piece, POINT_COUNT) }));
const clothKeys = new Set();
const cell = 3;
const key = (p) => `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)},${Math.floor(p.z / cell)}`;
for (const { piece, points } of samples) {
  if (piece.name.endsWith("_Body")) continue;
  for (const p of points) clothKeys.add(key(p));
}
const covered = (p) => {
  const [x, y, z] = key(p).split(",").map(Number);
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
    if (clothKeys.has(`${x + dx},${y + dy},${z + dz}`)) return true;
  }
  return false;
};

const totalArea = samples.reduce((sum, s) => sum + s.area, 0);
const records = [];
for (const { piece, points, area } of samples) {
  // Keep density even across pieces: each piece contributes by its surface area.
  const share = Math.round(POINT_COUNT * 1.6 * area / totalArea);
  let kept = 0;
  for (const p of points) {
    if (kept >= share) break;
    if (piece.name.endsWith("_Body") && covered(p)) continue;
    records.push([p, piece.tone]);
    kept += 1;
  }
}

// Shuffle so any prefix is a uniform subset (low-end devices draw fewer points).
for (let i = records.length - 1; i > 0; i -= 1) {
  const j = Math.floor(Math.random() * (i + 1));
  [records[i], records[j]] = [records[j], records[i]];
}
const kept = records.slice(0, POINT_COUNT);
let minY = Infinity;
for (const [p] of kept) minY = Math.min(minY, p.y);

const STRIDE = 8;
const data = new Float32Array(kept.length * STRIDE);
kept.forEach(([p, tone], i) => {
  // Turn to face -Z (left becomes -X), stand on y = 0, convert to metres.
  data.set([
    -p.x * SCALE, (p.y - minY) * SCALE, -p.z * SCALE,
    -p.normal.x, p.normal.y, -p.normal.z,
    tone, Math.random(),
  ], i * STRIDE);
});
writeFileSync(output, Buffer.from(data.buffer));
console.log(`wrote ${kept.length} points to ${output}`);

if (previewDir) {
  const W = 600, H = 800, f = 700, distance = 4;
  // back: camera behind the walker (+Z) looking -Z; side: camera on his left (-X) looking +X.
  const cameras = { back: [0, 1.1, distance], side: [-distance, 1.1, 0] };
  for (const view of ["back", "side"]) {
    const image = new Float32Array(W * H);
    const [cx, cy, cz] = cameras[view];
    for (let i = 0; i < kept.length; i += 1) {
      const o = i * STRIDE;
      const x = data[o], y = data[o + 1], z = data[o + 2], tone = data[o + 6];
      // Same look as the shader: hide the far side, light up the silhouette edge.
      const toCamera = Math.hypot(cx - x, cy - y, cz - z);
      const facing = ((cx - x) * data[o + 3] + (cy - y) * data[o + 4] + (cz - z) * data[o + 5]) / toCamera;
      const smooth = (e0, e1, v) => { const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
      const edge = smooth(0.55, 0.95, 1 - Math.abs(facing));
      const visible = Math.max(smooth(-0.15, 0.2, facing), 0.9 * edge);
      if (visible <= 0) continue;
      const [across, depth] = view === "back" ? [x, cz - z] : [z, x - cx];
      const u = Math.round(W / 2 + across * f / depth);
      const v = Math.round(H / 2 - (y - 0.95) * f / depth);
      for (const [du, dv] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const px = u + du, py = v + dv;
        if (px >= 0 && px < W && py >= 0 && py < H) image[py * W + px] += visible * (0.5 + 0.5 * tone) * (1 + 0.9 * edge) * 0.3;
      }
    }
    const bytes = Buffer.alloc(W * H);
    for (let k = 0; k < W * H; k += 1) bytes[k] = Math.min(255, Math.round(image[k] * 255));
    writeFileSync(`${previewDir}/${view}.pgm`, Buffer.concat([Buffer.from(`P5\n${W} ${H}\n255\n`), bytes]));
  }
  console.log(`previews in ${previewDir}`);
}

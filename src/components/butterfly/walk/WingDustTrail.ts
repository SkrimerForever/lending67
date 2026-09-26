import * as THREE from "three";

// The opening flight's wing dust: emitted into scene space, with inertia,
// drag, a little gravity and the same silver fade. No attached ribbon.
export function createWingDustTrail(count: number) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const life = new Float32Array(count);
  positions.fill(999);
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  const colorAttribute = new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", colorAttribute);
  const material = new THREE.PointsMaterial({
    size: 0.007,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  let wings = new Float32Array(0);
  const sources: number[] = [];
  const previousMatrix = new THREE.Matrix4();
  const previousPosition = new THREE.Vector3();
  const position = new THREE.Vector3();
  const movement = new THREE.Vector3();
  const heading = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const source = new THREE.Vector3();
  const previousSource = new THREE.Vector3();
  let initialized = false;
  let cleared = true;
  let cursor = 0;
  let accumulator = 0;
  let lastTime = 0;
  let previousFlap = 0;

  function reset() {
    if (cleared) return;
    cleared = true;
    life.fill(0);
    positions.fill(999);
    colors.fill(0);
    accumulator = 0;
    initialized = false;
    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  }

  return {
    points,
    reset,
    setWings(value: Float32Array) {
      wings = value;
      sources.length = 0;
      for (let i = 0; i < wings.length / 2; i += 1) {
        const x = Math.abs(wings[i * 2]);
        if (x > 0.14 && (x > 0.3 || wings[i * 2 + 1] > 0.025)) sources.push(i);
      }
    },
    update(matrix: THREE.Matrix4, flap: number, time: number, emit: boolean, fade: number) {
      position.setFromMatrixPosition(matrix);
      movement.subVectors(position, previousPosition);
      heading.set(0, 0, -1).transformDirection(matrix);
      const elapsed = time - lastTime;
      if (initialized && (elapsed > 0.25 || elapsed < 0 || movement.lengthSq() > 4 || movement.dot(heading) < -0.015)) reset();
      cleared = false;
      const delta = initialized ? Math.min(0.05, Math.max(0, elapsed)) : 0;
      const distance = initialized ? movement.length() : 0;
      velocity.copy(movement).divideScalar(Math.max(delta, 0.001)).clampLength(0, 5);
      const downstroke = delta > 0 ? THREE.MathUtils.clamp((previousFlap - flap) / delta / 10, 0, 1) : 0;
      if (emit && delta > 0 && distance > 0.0001 && sources.length > 0) {
        accumulator += delta * (260 + downstroke * 650) * Math.min(1, count / 900);
        const spawnCount = Math.min(64, Math.floor(accumulator));
        accumulator -= spawnCount;
        for (let spawn = 0; spawn < spawnCount; spawn += 1) {
          const particle = cursor;
          cursor = (cursor + 1) % count;
          const index = sources[Math.floor(Math.random() * sources.length)] * 2;
          const x = wings[index];
          const z = wings[index + 1];
          const lift = flap * THREE.MathUtils.smoothstep(Math.abs(x), 0.02, 0.16);
          const y = Math.abs(x) * Math.sin(lift);
          source.set(x * Math.cos(lift), y * Math.cos(0.95) - z * Math.sin(0.95), y * Math.sin(0.95) + z * Math.cos(0.95));
          previousSource.copy(source).applyMatrix4(previousMatrix);
          source.applyMatrix4(matrix).lerp(previousSource, 1 - (spawn + 1) / Math.max(1, spawnCount));
          const offset = particle * 3;
          positions[offset] = source.x;
          positions[offset + 1] = source.y;
          positions[offset + 2] = source.z;
          velocities[offset] = velocity.x * 0.22 + (Math.random() - 0.5) * 0.035;
          velocities[offset + 1] = velocity.y * 0.12 + (Math.random() - 0.5) * 0.032;
          velocities[offset + 2] = velocity.z * 0.1 + (Math.random() - 0.5) * 0.04;
          life[particle] = 0.72 + Math.random() * 0.82;
        }
      } else {
        accumulator = 0;
      }
      const drag = Math.exp(-delta * 1.45);
      for (let i = 0; i < count; i += 1) {
        if (life[i] <= 0) continue;
        const offset = i * 3;
        life[i] -= delta;
        velocities[offset + 1] -= delta * 0.015;
        for (let axis = 0; axis < 3; axis += 1) {
          velocities[offset + axis] *= drag;
          positions[offset + axis] += velocities[offset + axis] * delta;
          colors[offset + axis] = THREE.MathUtils.smoothstep(life[i], 0, 0.38) * 0.58;
          if (life[i] <= 0) positions[offset + axis] = 999;
        }
      }
      material.opacity = 0.72 * fade;
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
      previousMatrix.copy(matrix);
      previousPosition.copy(position);
      previousFlap = flap;
      lastTime = time;
      initialized = true;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

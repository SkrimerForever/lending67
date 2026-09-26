import * as THREE from "three";
import { MEADOW_GATE, type MeadowPassState } from "./walkFlightState";

// White surface particles retain the full depth of both columns.
export function createMeadowPortal(particleCount: number, pixelRatio: number) {
  const group = new THREE.Group();
  group.position.set(...MEADOW_GATE);
  group.visible = false;
  const geometries = new Set<THREE.BufferGeometry>();
  const uniforms = {
    uReveal: { value: 0 },
    uBuild: { value: 0 },
    uColor: { value: 0 },
    uTime: { value: 0 },
    uPixelRatio: { value: pixelRatio },
  };
  const particlesMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uPixelRatio;
      uniform float uBuild;
      attribute float aSeed;
      attribute vec3 aSurfaceNormal;
      varying float vAlpha;
      void main() {
        // A staggered construction front climbs from the plinth to the capital.
        // Each point rises out of a small loose cloud and locks into its surface.
        float front = mix(-0.4, 5.2, uBuild);
        float assembled = smoothstep(0.0, 0.6, front - position.y - aSeed * 0.22);
        float loose = 1.0 - assembled;
        float angle = aSeed * 62.83185;
        vec3 point = position;
        point.y -= loose * mix(0.18, 0.5, aSeed);
        point.xz += vec2(cos(angle), sin(angle)) * loose * 0.16;
        vec4 view = modelViewMatrix * vec4(point, 1.0);
        gl_Position = projectionMatrix * view;
        gl_PointSize = clamp(20.0 / max(1.0, -view.z), 0.7, 1.7)
          * uPixelRatio * mix(0.8, 1.1, aSeed);
        vec3 surfaceNormal = normalize(normalMatrix * aSurfaceNormal);
        float facing = max(dot(surfaceNormal, normalize(-view.xyz)), 0.0);
        float depth = mix(0.45, 1.0, exp(-max(0.0, -view.z - 5.0) * 0.045));
        float groundFade = smoothstep(-0.03, 0.48, position.y);
        float capital = 1.0 - 0.25 * smoothstep(3.55, 4.2, position.y);
        vAlpha = mix(0.25, 0.66, aSeed) * mix(0.3, 1.0, facing)
          * depth * groundFade * capital * assembled;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      varying float vAlpha;
      void main() {
        float radius = length(gl_PointCoord - 0.5);
        if (radius > 0.5) discard;
        float dotAlpha = 1.0 - smoothstep(0.12, 0.5, radius);
        gl_FragColor = vec4(vec3(1.0), dotAlpha * vAlpha * uReveal);
      }
    `,
  });
  // This construction group is only used to sample surfaces, never rendered.
  const columnSurfaces = new THREE.Group();
  const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, y: number) => {
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, particlesMaterial);
    mesh.position.y = y;
    parent.add(mesh);
    return mesh;
  };
  const shaft = new THREE.CylinderGeometry(0.245, 0.31, 3.1, 128, 20);
  const positions = shaft.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const radius = Math.hypot(x, z);
    if (radius < 0.01) continue;
    const y = positions.getY(i);
    const angle = Math.atan2(z, x);
    const flute = 0.025 * Math.pow(0.5 + 0.5 * Math.cos(angle * 20), 2);
    const entasis = 0.012 * Math.sin(((y + 1.55) / 3.1) * Math.PI);
    const scale = (radius - flute + entasis) / radius;
    positions.setXYZ(i, x * scale, y, z * scale);
  }
  shaft.computeVertexNormals();
  const leafGeometry = new THREE.SphereGeometry(1, 8, 6);
  const voluteGeometry = new THREE.TorusGeometry(0.115, 0.036, 6, 20, Math.PI * 1.8);
  for (const side of [-1, 1]) {
    const column = new THREE.Group();
    column.position.x = side * 1.65;
    columnSurfaces.add(column);
    add(column, new THREE.BoxGeometry(0.88, 0.14, 0.88), 0.07);
    add(column, new THREE.BoxGeometry(0.73, 0.12, 0.73), 0.2);
    add(column, new THREE.CylinderGeometry(0.35, 0.41, 0.12, 48), 0.32);
    add(column, new THREE.CylinderGeometry(0.31, 0.35, 0.12, 48), 0.44);
    add(column, shaft, 2.05);
    add(column, new THREE.CylinderGeometry(0.29, 0.265, 0.1, 48), 3.63);
    add(column, new THREE.CylinderGeometry(0.43, 0.28, 0.4, 48), 3.88);
    // Two tiers of carved leaves and curled corners echo the source capitals.
    for (let tier = 0; tier < 2; tier++) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + tier * Math.PI / 8;
        const leaf = add(column, leafGeometry, 3.76 + tier * 0.17);
        leaf.position.x = Math.sin(angle) * (0.29 + tier * 0.06);
        leaf.position.z = Math.cos(angle) * (0.29 + tier * 0.06);
        leaf.rotation.set(-0.28, angle, 0);
        leaf.scale.set(0.075, 0.18, 0.055);
      }
    }
    for (const x of [-0.31, 0.31]) {
      for (const z of [-0.31, 0.31]) {
        const curl = add(column, voluteGeometry, 4.03);
        curl.position.set(x, 4.03, z);
        curl.rotation.y = z < 0 ? Math.PI : 0;
      }
    }
    add(column, new THREE.BoxGeometry(0.86, 0.13, 0.86), 4.16);
    add(column, new THREE.BoxGeometry(0.93, 0.07, 0.93), 4.26);
  }

  columnSurfaces.updateMatrixWorld(true);
  const triangles: Array<{ a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; end: number }> = [];
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let totalArea = 0;
  columnSurfaces.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    const vertices = geometry.getAttribute("position");
    const index = geometry.getIndex();
    const count = index ? index.count : vertices.count;
    for (let i = 0; i < count; i += 3) {
      const vertex = (offset: number) => new THREE.Vector3()
        .fromBufferAttribute(vertices, index ? index.getX(i + offset) : i + offset)
        .applyMatrix4(object.matrixWorld);
      const a = vertex(0);
      const b = vertex(1);
      const c = vertex(2);
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
      if (area < 1e-8) continue;
      totalArea += area;
      triangles.push({ a, b, c, end: totalArea });
    }
  });
  let seed = 7319;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const dots = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  const surfaceNormals = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const area = random() * totalArea;
    let low = 0;
    let high = triangles.length - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (triangles[middle].end < area) low = middle + 1;
      else high = middle;
    }
    const { a, b, c } = triangles[low];
    const root = Math.sqrt(random());
    const u = 1 - root;
    const v = random() * root;
    const w = 1 - u - v;
    dots[i * 3] = a.x * u + b.x * v + c.x * w;
    dots[i * 3 + 1] = a.y * u + b.y * v + c.y * w;
    dots[i * 3 + 2] = a.z * u + b.z * v + c.z * w;
    ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize();
    surfaceNormals.set([ab.x, ab.y, ab.z], i * 3);
    seeds[i] = random();
  }
  geometries.forEach((geometry) => geometry.dispose());
  geometries.clear();
  columnSurfaces.clear();
  const dotsGeometry = new THREE.BufferGeometry();
  dotsGeometry.setAttribute("position", new THREE.BufferAttribute(dots, 3));
  dotsGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  dotsGeometry.setAttribute("aSurfaceNormal", new THREE.BufferAttribute(surfaceNormals, 3));
  geometries.add(dotsGeometry);
  group.add(new THREE.Points(dotsGeometry, particlesMaterial));

  const veilMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uReveal;
      uniform float uColor;
      uniform float uTime;
      uniform float uBuild;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * vec2(3.1, 4.4);
        vec2 q = abs(p) - vec2(0.91, 1.51);
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - 0.39;
        float edge = exp(-abs(d) * 85.0);
        float halo = exp(-abs(d) * 11.0);
        float inside = 1.0 - smoothstep(-0.04, 0.0, d);
        float current = sin(p.y * 4.0 - uTime * 0.48 + sin(p.x * 4.0 + uTime * 0.25));
        vec3 tint = mix(vec3(0.48, 0.76, 0.7), vec3(0.9, 0.67, 0.4), vUv.y);
        tint = mix(vec3(0.78), tint, uColor);
        float groundFade = smoothstep(0.015, 0.16, vUv.y);
        float alpha = (edge * 0.28 + halo * 0.065 + inside * (0.012 + 0.008 * current)) * groundFade;
        float built = smoothstep(0.0, 0.6, mix(-0.4, 5.2, uBuild) - (p.y + 2.05));
        gl_FragColor = vec4(tint, alpha * uReveal * built);
      }
    `,
  });
  const veilGeometry = new THREE.PlaneGeometry(3.1, 4.4);
  geometries.add(veilGeometry);
  const veil = new THREE.Mesh(veilGeometry, veilMaterial);
  veil.position.set(0, 2.05, 0);
  group.add(veil);

  return {
    group,
    update(state: MeadowPassState, time: number) {
      const build = 1 - THREE.MathUtils.smoothstep(state.cameraPosition[2], -51, -37);
      const reveal = state.roadReveal;
      group.visible = state.active && reveal > 0.001 && build > 0;
      uniforms.uReveal.value = reveal;
      uniforms.uBuild.value = build;
      uniforms.uColor.value = 1 - THREE.MathUtils.smoothstep(state.cameraPosition[2], -53, -34);
      uniforms.uTime.value = time;
    },
    setPixelRatio(value: number) {
      uniforms.uPixelRatio.value = value;
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      particlesMaterial.dispose();
      veilMaterial.dispose();
    },
  };
}

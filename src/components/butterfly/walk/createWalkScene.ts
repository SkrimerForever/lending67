import * as THREE from "three";
import type { PerformanceProfile } from "../performance-profile";
import { createWalkEnvironment } from "./walkEnvironment";
import { createWalkerFigure } from "./WalkerFigure";
import { quadToMatrix3d, type ScreenPoint } from "./portalTransform";
import { LIGHT_Y, LIGHT_Z, PORTAL_HEIGHT, type WalkFlightState } from "./walkFlightState";

export type WalkScene = {
  group: THREE.Group;
  update(state: WalkFlightState, time: number, camera: THREE.PerspectiveCamera): void;
  setPixelRatio(value: number): void;
  // CSS transform that lays a full-viewport DOM layer onto the light panel.
  portalTransform(camera: THREE.PerspectiveCamera, width: number, height: number): string;
  dispose(): void;
};

// Far away from the butterfly and columns world, which is hidden after 1.22.
export const WALK_ORIGIN = new THREE.Vector3(0, 0, -200);

export function createWalkScene(profile: PerformanceProfile, pixelRatio: number): WalkScene {
  const group = new THREE.Group();
  group.position.copy(WALK_ORIGIN);
  group.visible = false;
  const walker = createWalkerFigure(profile.walkerParticleCount, pixelRatio);
  const environment = createWalkEnvironment(
    { ground: profile.walkGroundParticleCount, dust: profile.walkDustParticleCount },
    pixelRatio,
  );
  group.add(environment.group);
  group.add(walker.points);
  const target = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const portalCorners: Array<[number, number]> = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]];

  return {
    group,
    update(state, time, camera) {
      group.visible = state.active;
      if (!state.active) return;
      walker.points.position.z = state.walkerZ;
      walker.update(state.stride, time, state.walkerReveal);
      environment.setAspect(camera.aspect);
      environment.update(state, time);
      // The camera pose comes straight from scroll so reversal is exact.
      camera.position.set(...state.cameraPosition).add(WALK_ORIGIN);
      target.set(...state.cameraTarget).add(WALK_ORIGIN);
      camera.lookAt(target);
    },
    setPixelRatio(value) {
      walker.setPixelRatio(value);
      environment.setPixelRatio(value);
    },
    portalTransform(camera, width, height) {
      camera.updateMatrixWorld();
      const portalWidth = PORTAL_HEIGHT * camera.aspect;
      const screen = portalCorners.map(([u, v]): ScreenPoint => {
        corner.set(u * portalWidth, LIGHT_Y + v * PORTAL_HEIGHT, LIGHT_Z).add(WALK_ORIGIN).project(camera);
        return [(corner.x + 1) * 0.5 * width, (1 - corner.y) * 0.5 * height];
      });
      return quadToMatrix3d(width, height, screen);
    },
    dispose() {
      walker.dispose();
      environment.dispose();
    },
  };
}

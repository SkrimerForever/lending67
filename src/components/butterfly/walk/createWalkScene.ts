import * as THREE from "three";
import type { PerformanceProfile } from "../performance-profile";
import { createWalkEnvironment } from "./walkEnvironment";
import { createWalkerFigure } from "./WalkerFigure";
import type { WalkFlightState } from "./walkFlightState";

export type WalkScene = {
  group: THREE.Group;
  update(state: WalkFlightState, time: number, camera: THREE.PerspectiveCamera): void;
  setPixelRatio(value: number): void;
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

  return {
    group,
    update(state, time, camera) {
      group.visible = state.active;
      if (!state.active) return;
      walker.points.position.z = state.walkerZ;
      walker.update(state.stride, time, state.walkerReveal);
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
    dispose() {
      walker.dispose();
      environment.dispose();
    },
  };
}

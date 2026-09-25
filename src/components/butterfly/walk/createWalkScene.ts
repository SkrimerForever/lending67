import * as THREE from "three";
import type { PerformanceProfile } from "../performance-profile";
import { createWalkEnvironment } from "./walkEnvironment";
import { createWalkerFigure } from "./WalkerFigure";
import { quadToMatrix3d, type ScreenPoint } from "./portalTransform";
import { createPassButterfly } from "./PassButterfly";
import {
  CASE_THREE_SCREEN,
  LIGHT_Y,
  LIGHT_Z,
  PORTAL_HEIGHT,
  type ButterflyPassState,
  type Vec3,
  type WalkFlightState,
} from "./walkFlightState";

export type WalkScene = {
  group: THREE.Group;
  // After case 02 the butterfly pass, when active, owns the camera instead.
  update(state: WalkFlightState, time: number, camera: THREE.PerspectiveCamera, pass?: ButterflyPassState): void;
  setPixelRatio(value: number): void;
  // CSS transform that lays a full-viewport DOM layer onto a case screen.
  portalTransform(camera: THREE.PerspectiveCamera, width: number, height: number, screen: "caseTwo" | "caseThree"): string;
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
  const butterfly = createPassButterfly(profile.passButterflyParticleCount, pixelRatio);
  group.add(environment.group);
  group.add(walker.points);
  group.add(butterfly.points);
  const target = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const portalCorners: Array<[number, number]> = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]];
  const screenCenters: Record<"caseTwo" | "caseThree", Vec3> = {
    caseTwo: [0, LIGHT_Y, LIGHT_Z],
    caseThree: CASE_THREE_SCREEN,
  };

  return {
    group,
    update(state, time, camera, pass) {
      group.visible = state.active;
      if (!state.active) return;
      const passing = pass?.active ?? false;
      walker.points.position.z = state.walkerZ;
      walker.update(state.stride, time, state.walkerReveal);
      // The camera pose comes straight from scroll so reversal is exact.
      const pose = passing && pass ? pass : state;
      eye.set(...pose.cameraPosition);
      camera.position.copy(eye).add(WALK_ORIGIN);
      target.set(...pose.cameraTarget).add(WALK_ORIGIN);
      camera.lookAt(target);
      environment.setAspect(camera.aspect);
      environment.update(state, time, {
        // The case 02 screen gives its light to the butterfly as it dissolves.
        caseTwo: state.lightReveal * (1 - (passing && pass ? pass.screenDissolve : 0)),
        // Case 03 is a dark screen: its light is a soft glow, not a white panel.
        caseThree: passing && pass ? pass.caseThreeLight * 0.35 : 0,
      }, eye);
      if (pass) butterfly.update(pass, time);
      butterfly.setAspect(camera.aspect);
    },
    setPixelRatio(value) {
      walker.setPixelRatio(value);
      environment.setPixelRatio(value);
      butterfly.setPixelRatio(value);
    },
    portalTransform(camera, width, height, screen) {
      camera.updateMatrixWorld();
      const portalWidth = PORTAL_HEIGHT * camera.aspect;
      const [cx, cy, cz] = screenCenters[screen];
      const quad = portalCorners.map(([u, v]): ScreenPoint => {
        corner.set(cx + u * portalWidth, cy + v * PORTAL_HEIGHT, cz).add(WALK_ORIGIN).project(camera);
        return [(corner.x + 1) * 0.5 * width, (1 - corner.y) * 0.5 * height];
      });
      return quadToMatrix3d(width, height, quad);
    },
    dispose() {
      walker.dispose();
      environment.dispose();
      butterfly.dispose();
    },
  };
}

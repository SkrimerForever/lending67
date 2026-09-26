import * as THREE from "three";
import type { PerformanceProfile } from "../performance-profile";
import { createWalkEnvironment } from "./walkEnvironment";
import { createWalkerFigure } from "./WalkerFigure";
import { quadToMatrix3d, type ScreenPoint } from "./portalTransform";
import { createMeadow } from "./Meadow";
import { createMeadowPortal } from "./MeadowPortal";
import { createNightLife } from "./NightLife";
import { createPassButterfly } from "./PassButterfly";
import {
  CASE_THREE_SCREEN,
  CASE_FOUR_SCREEN,
  CASE_FOUR_HEIGHT,
  MEADOW_GATE,
  LIGHT_Y,
  LIGHT_Z,
  PORTAL_HEIGHT,
  type ButterflyPassState,
  type MeadowPassState,
  type Vec3,
  type WalkFlightState,
} from "./walkFlightState";

export type WalkScene = {
  group: THREE.Group;
  // After case 02 the butterfly pass, and after case 03 the meadow pass, own
  // the camera instead when active (the later one wins).
  update(
    state: WalkFlightState,
    time: number,
    camera: THREE.PerspectiveCamera,
    pass?: ButterflyPassState,
    meadow?: MeadowPassState,
  ): void;
  setPixelRatio(value: number): void;
  // CSS transform that lays a full-viewport DOM layer onto a case screen.
  // scale folds the screen about its centre (width, height).
  portalTransform(
    camera: THREE.PerspectiveCamera,
    width: number,
    height: number,
    screen: "caseTwo" | "caseThree" | "caseFour",
    scale?: [number, number],
  ): string;
  gateClip(camera: THREE.PerspectiveCamera, width: number, height: number): string;
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
  const caseTwoCenter: Vec3 = [0, LIGHT_Y, LIGHT_Z];
  const butterfly = createPassButterfly(profile.passButterflyParticleCount, pixelRatio, caseTwoCenter, CASE_THREE_SCREEN);
  // The same butterfly again, bursting out of case 03 and flying over the meadow.
  const meadowButterfly = createPassButterfly(profile.passButterflyParticleCount, pixelRatio, CASE_THREE_SCREEN, CASE_THREE_SCREEN);
  const meadowField = createMeadow(profile.meadowParticleCount, CASE_THREE_SCREEN[0], pixelRatio);
  const meadowPortal = createMeadowPortal(profile.passButterflyParticleCount * 2, pixelRatio);
  const nightLife = createNightLife({
    milkyWay: profile.nightMilkyWayCount,
    forest: profile.nightForestCount,
    fireflies: profile.nightFireflyCount,
    mist: profile.nightMistCount,
  }, pixelRatio);
  group.add(environment.group);
  group.add(walker.points);
  group.add(butterfly.points, meadowButterfly.points, meadowField.points, nightLife.group, meadowPortal.group);
  const target = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const corner = new THREE.Vector3();
  const portalCorners: Array<[number, number]> = [[-0.5, 0.5], [0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]];
  const screenCenters: Record<"caseTwo" | "caseThree" | "caseFour", Vec3> = {
    caseTwo: caseTwoCenter,
    caseThree: CASE_THREE_SCREEN,
    caseFour: CASE_FOUR_SCREEN,
  };

  return {
    group,
    update(state, time, camera, pass, meadow) {
      group.visible = state.active;
      if (!state.active) {
        camera.up.set(0, 1, 0);
        return;
      }
      const passing = pass?.active ?? false;
      const mowing = meadow?.active ?? false;
      walker.points.position.z = state.walkerZ;
      walker.update(state.stride, time, state.walkerReveal);
      // The camera pose comes straight from scroll so reversal is exact.
      const pose = mowing && meadow ? meadow : passing && pass ? pass : state;
      eye.set(...pose.cameraPosition);
      camera.position.copy(eye).add(WALK_ORIGIN);
      target.set(...pose.cameraTarget).add(WALK_ORIGIN);
      // The camera leans with the butterfly during the chase.
      const roll = mowing && meadow ? meadow.cameraRoll : passing && pass ? pass.cameraRoll : 0;
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      camera.lookAt(target);
      environment.setAspect(camera.aspect);
      environment.update(state, time, {
        // The case 02 screen's glow goes out as soon as the screen starts to
        // fold, so nothing shows behind it while it narrows to a line.
        caseTwo: state.lightReveal * (passing && pass ? Math.pow(pass.collapse[1], 8) : 1),
        // Case 03 is a dark screen: its light is a soft glow, not a white
        // panel; it goes out as case 03 folds away before the meadow.
        caseThree: (passing && pass ? pass.caseThreeLight * 0.35 : 0)
          * (mowing && meadow ? Math.pow(meadow.collapse[1], 8) : 1),
      }, eye);
      if (pass) butterfly.update(pass, time);
      butterfly.setAspect(camera.aspect);
      if (meadow) {
        meadowButterfly.update(meadow, time);
        meadowField.update(meadow, time);
        meadowPortal.update(meadow, time);
      }
      meadowButterfly.setAspect(camera.aspect);
      // The night comes alive with the butterfly and stays alive after it.
      const flyer = mowing && meadow ? meadow : passing && pass ? pass : null;
      nightLife.update({
        life: mowing ? 1 : passing && pass ? pass.life : 0,
        time,
        eye,
        butterfly: flyer ? flyer.butterflyPosition : [0, -100, 0],
        butterflyOn: flyer ? flyer.gather * (1 - flyer.vanish) : 0,
      });
    },
    setPixelRatio(value) {
      walker.setPixelRatio(value);
      environment.setPixelRatio(value);
      butterfly.setPixelRatio(value);
      meadowButterfly.setPixelRatio(value);
      meadowField.setPixelRatio(value);
      meadowPortal.setPixelRatio(value);
      nightLife.setPixelRatio(value);
    },
    portalTransform(camera, width, height, screen, scale = [1, 1]) {
      camera.updateMatrixWorld();
      const heightInWorld = screen === "caseFour" ? CASE_FOUR_HEIGHT : PORTAL_HEIGHT;
      const portalWidth = heightInWorld * camera.aspect * scale[0];
      const portalHeight = heightInWorld * scale[1];
      const [cx, cy, cz] = screenCenters[screen];
      const quad = portalCorners.map(([u, v]): ScreenPoint => {
        corner.set(cx + u * portalWidth, cy + v * portalHeight, cz).add(WALK_ORIGIN).project(camera);
        return [(corner.x + 1) * 0.5 * width, (1 - corner.y) * 0.5 * height];
      });
      return quadToMatrix3d(width, height, quad);
    },
    gateClip(camera, width, height) {
      if (camera.position.z - WALK_ORIGIN.z <= MEADOW_GATE[2] + 0.15) return "none";
      camera.updateMatrixWorld();
      const corners = portalCorners.map(([u, v]) => {
        corner.set(MEADOW_GATE[0] + u * 2.55, 2.05 + v * 3.8, MEADOW_GATE[2])
          .add(WALK_ORIGIN).project(camera);
        return `${(corner.x + 1) * 0.5 * width}px ${(1 - corner.y) * 0.5 * height}px`;
      });
      return `polygon(${corners.join(",")})`;
    },
    dispose() {
      walker.dispose();
      environment.dispose();
      butterfly.dispose();
      meadowButterfly.dispose();
      meadowField.dispose();
      meadowPortal.dispose();
      nightLife.dispose();
    },
  };
}

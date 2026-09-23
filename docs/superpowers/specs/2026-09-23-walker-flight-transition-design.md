# Walker Flight Transition — Design

## Goal

Continue the scroll story after the Flow Architect display turn. The camera moves forward into darkness, discovers a person made of particles walking away from the viewer in the lower right of the frame, overtakes them cinematically just above their left shoulder, and flies into a cool silver light that becomes the full-screen surface of case 02.

The transition must preserve the site concept: a true-black world, monochrome white/silver particles, one scroll-driven reversible camera, and the rhythm established by case 01 (a project first appears full-screen).

## Decisions

- Case 02 has no content yet. The flight ends on a DOM placeholder `04 / КЕЙС 02`; its real content is a separate stage.
- The walker is a procedural figure built in code (no external model).
- The walker stands on a particle ground strip in the style of the Hero landscape, with sparse floating dust.
- The flight ends by flying into a silver rectangular light that becomes the case 02 surface. No second physical display.
- The scene lives in the existing Three.js renderer as an isolated module; no second canvas or WebGL context.

## Scroll Sequence

The scroll range extends from `1.98` to `2.60`. All values are `scrollTravel` units.

| Range | Phase | What is visible |
| --- | --- | --- |
| 1.72–1.98 | Operator turn | Existing, unchanged |
| 1.98–2.06 | Forward into darkness | The turned display slides out left and fades. Sparse dust streams toward the camera. The ground strip emerges from black |
| 2.06–2.38 | Overtake | The walker is in the lower right, back to camera. The camera starts ~6 m behind, left, and above, and catches up. The walker completes 2.5 steps. Mid-phase the camera passes just above and left of the left shoulder; the figure exits large through the lower right |
| 2.30–2.50 | Light | A cool silver rectangle ahead, on the walking axis, brightens. The camera flies into it until it fills the frame |
| 2.50–2.60 | Case 02 | The DOM placeholder emerges from the light, then a short hold |

The walk is scroll-driven: when scrolling stops, the walker freezes mid-stride like a still frame, matching the Flow Architect behaviour. Every phase reverses cleanly.

### Preserving existing timing

Extending the range must not stretch earlier scenes:

- `scrollTween` target: `1.98 → 2.60`.
- `.study-shell` height: `1980svh → 2535svh`. Scroll distance is `height − 2.1vh`, so `17.7vh × 2.60 / 1.98 ≈ 23.24vh`, giving `25.34 → 2535svh`.
- GSAP `timelineClock` duration: `165.6 → 270.4`, so the scrubbed timeline total (`169 + duration`) keeps the same ratio to scroll (`334.6 × 2.60 / 1.98 ≈ 439.4`).

## Walker Figure

Module: `src/components/butterfly/walk/WalkerFigure.ts`.

- **Body:** 16 parts — head, neck, ribcage, pelvis, two upper arms, two forearms, two hands, two thighs, two shins, two feet. Each part is a capsule or ellipsoid with adult proportions for a height of ~1.8 m. Adjacent parts overlap so joints never tear.
- **Sampling:** points lie on part surfaces with a slight inward scatter, giving volume and a soft dusty edge like the Hero figures. Count by performance profile: HIGH 14 000, BALANCED 9 000, LOW 5 000.
- **Attributes:** `aBone` (part id), `aLocal` (position relative to the part's joint), `aSeed`.
- **Walk in the vertex shader:** forward kinematics from a single uniform `uStride` (walk phase, 1.0 = one full cycle of two steps). Hip and knee flexion follow a gait-like curve (knee flexes in swing, near-straight at heel strike), not a pure sine. Arms swing in counter-phase to the legs. Pelvis and shoulders counter-rotate slightly; the torso bobs ~3 cm per step. The root translates forward with the stride so feet do not skate.
- **Material:** white-silver, the densest and brightest form in frame, with restrained shimmer. No amber — amber belongs to case 01.

## Environment

Module: `src/components/butterfly/walk/walkEnvironment.ts`.

- **Ground:** a ~14 m wide point strip running ~60 m forward. Gentle noise hills; points arranged in flowing bands as in the Hero landscape. Fades out toward the horizon and the sides, with no hard edge.
- **Dust:** ~1 500 sparse floating points for parallax. During "forward into darkness" they stretch slightly into streaks along the motion direction.
- **Silver light:** a cool silver-white rectangle (`rgb(205, 218, 226)` family, matching the earlier beacon) with a soft halo, far ahead on the walking axis. Brightens during the Light phase.

## Architecture

```
src/components/butterfly/walk/
  walkFlightState.ts        pure: (scrollTravel, reducedMotion, narrow) -> state
  walkFlightState.test.ts   node:test boundary checks
  WalkerFigure.ts           geometry + shader material, update(stride, time)
  walkEnvironment.ts        ground, dust, light; update(state, time)
  createWalkScene.ts        assembles a THREE.Group; update(state, camera); dispose()
src/components/butterfly/SecondCaseStub.tsx   DOM placeholder
```

- `walkFlightState` returns: `active`, `darknessDive`, `groundReveal`, `stride`, `cameraPosition`, `cameraTarget`, `lightReveal`, `whiteout`, `caseReveal`, all derived from scroll only.
- The walk scene is placed far from the butterfly/columns world (which is already hidden after `1.22`) so they never overlap.
- From `1.98` the Three.js camera pose is set directly from `walkFlightState` (no `lerp`), so reversal is exact; GSAP scrub already smooths input.
- `ButterflyExperience` only wires the module: creates it with the performance profile, adds it to `scene`, calls `update` in the render loop, disposes it on unmount, and fades `case-world` out during `darknessDive`.
- `SecondCaseStub` reuses the `case-copy` typography: index `04 / КЕЙС 02`, a placeholder title, no interface.

## Responsive Behaviour

On narrow viewports:

- the walker starts closer to frame centre;
- the shoulder pass is wider so the head never covers the whole screen;
- fewer points (profile-driven) and a narrower ground strip.

## Reduced Motion

The existing loop forces `scrollTravel = 0` under reduced motion. The walk stage reads the raw scroll value with a `reducedMotion` flag instead, and shows three stable states with short crossfades:

1. the walker standing mid-stride on the ground;
2. the silver light;
3. the case 02 placeholder.

No camera travel, no stride animation, no dust streaking.

## Implementation Boundary

Included: forward dive, ground, dust, procedural walker with walk cycle, over-the-shoulder overtake, silver light, fly-in, case 02 placeholder, scroll-range extension, reduced motion, narrow viewports.

Not included: case 02 content, identity, or interface; footstep dust puffs; changes to anything before `1.98`; a pullback reveal for case 02.

## Verification

- `walkFlightState.test.ts` (`node --test`) checks: inactive before `1.98`; overtake starts only after the turn; the camera passes the walker's shoulder inside the overtake range; `caseReveal` reaches 1 by `2.60`; reduced motion returns the three stable states.
- `npm run lint` shows no new errors.
- Visual acceptance is done by the user in `npm run dev`, forward and backward.

## Acceptance Criteria

- Everything before `1.98` looks and times exactly as before.
- The camera visibly moves forward into darkness after the turn; dust gives a sense of speed.
- The walker reads as a human walking (not a mannequin sliding), completes 2–3 steps, and starts in the lower right, back to camera.
- The camera overtakes just above the left shoulder, and the figure exits through the lower right.
- The flight ends inside the silver light, which becomes the case 02 placeholder.
- The whole sequence reverses cleanly with scroll.

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

## Revision 1 — after first visual review (2026-09-23)

User feedback: the ground reads as a highway; the walker reads as circles and boxes instead of a human silhouette; the hand-off from case 01 is abrupt.

### Narrow path instead of a highway

- Ground strip width `~14 m → ~5.6 m` (`x ∈ [-2.8, 2.8]`), fading out from `|x| = 1.6`.
- A narrow walking path (`|x| < 0.45`) is slightly brighter; side hills are lower (`0.12` amplitude, banks rise `0.15`).
- Ground particle counts scale with the area: HIGH 12 000, BALANCED 8 000, LOW 4 500.

### One continuous human silhouette

- The body is one signed-distance shape (smooth union of anatomical round cones, spheres and ellipsoids) in rest pose: shoulders wider than waist, chest, buttocks, calves, head and neck, a jacket and trousers volume like the Hero figures. Limbs join the torso smoothly; arms never blend into legs.
- Points are rejection-sampled against that shape: dense in a thin shell at the surface (`-0.022 ≤ d ≤ 0.004`), sparse interior fill (12 %). No internal contours are possible because there is only one surface.
- Each point stores its rest position, its nearest bone, and an adjacent second bone with a blend weight (`≤ 0.5`), so joints bend without seams.
- The vertex shader poses 16 bones with the same gait curves as before and blends the two bone transforms per point. Shell points are brighter than fill points.
- Rest-pose joints: pelvis `0.95`, spine `1.08`, neck `1.50`, head `1.62`; shoulders `±0.2 @ 1.43`; hips `±0.1 @ 0.90`, knees `@ 0.48`, ankles `@ 0.08` (thigh `0.42`, shin `0.40`). Left is `-X`.

### Softer hand-off from case 01

- The walk stage starts at `1.90`, overlapping the end of the operator turn.
- Dust fades in `1.90–2.00`; a faint ground outline appears from `1.92`, full by `2.10`.
- The display fades over `1.92–2.08` while drifting back (`-480px` Z), slightly left (`-10vw`), and blurring up to `5px`.
- The camera path gains a slow first segment (`1.90–1.98`, ~3 m) before the dive, so it eases in.

### Fixes

- The silver light's halo fades to zero at its quad edges (no visible rectangle).

## Revision 2 — second visual review (2026-09-24)

- The walker holds one mid-stride pose (`uStride = 0.06`: left leg forward, right heel lifting) at `z = -0.9`; he no longer walks.
- After the shoulder pass (`2.24`) the flight reaches case 02 within one short scroll: light `2.22–2.31`, whiteout `2.31–2.35`, case reveal `2.35–2.38`, end `2.40`. Scroll range `2.60 → 2.40`: `.study-shell` `2355svh`, `timelineClock` duration `236.6`.
- Silhouette: shoulders slope from the neck (trapezius) instead of a flat bar, thinner neck, chest no longer domes up to the neck, slight waist, arms hang a little further from the body.
- Sky: a separate star layer (900 stars on a camera-following dome, a few large bright ones, gentle twinkle); floating dust is brighter.

## Revision 3 — shorter flight (2026-09-24)

- The whole walk stage is compressed: dive `1.90–2.00`, shoulder pass `2.10`, light `2.08–2.14`, whiteout `2.14–2.16`, case reveal `2.16–2.19`, end `2.22`. Scroll range `2.22`: `.study-shell` `2195svh`, `timelineClock` duration `206.2`.
- Shorter path: the light stands at `z = -14` (was `-40`); the ground runs `z ∈ [-16, 12]` and ends under the light; dust spans `z ∈ [-18, 16]`. Ground counts HIGH 6 000 / BALANCED 4 000 / LOW 2 200.

## Revision 4 — clothes and hair (2026-09-24)

- Each body primitive carries a material: skin, hair, jacket, trousers, shoes. A point takes the material of its nearest primitive; the shader tones them (skin 1.0, jacket 0.88, trousers 0.68, hair 0.6, shoes 0.52) so clothing edges read.
- Jacket: body over the hips with a collar at the neck; fuller sleeves with cuffs. Trousers: straight legs to the ankle. Shoes: larger, darker feet. Hair: a short cap over the crown and back of the head with slight fuzz.

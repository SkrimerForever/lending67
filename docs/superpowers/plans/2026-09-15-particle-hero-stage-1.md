# Particle Hero Stage 1 Implementation Plan

> **For agentic workers:** Implement inline and stop after the static scene is available for the user's visual review.

**Goal:** Build a full-screen static Three.js particle scene that closely reproduces the supplied reference composition.

**Architecture:** Keep the existing butterfly component unchanged. Add a separate client-side `ParticleHeroScene` that samples the supplied reference image into a GPU point cloud, adds shallow depth and quiet ambient movement in a shader, and temporarily render it from the home page for Stage 1 review.

**Tech Stack:** Next.js 16 App Router, React 19, Three.js 0.186, GLSL.

**Spec:** `docs/superpowers/specs/2026-09-15-particle-hero-scene-design.md`

## Global Constraints

- Do not display the reference bitmap directly.
- Do not add a vortex, blizzard, Hero text, or butterfly morph in Stage 1.
- Do not run tests, lint, builds, or autonomous visual checks.
- The user performs the visual review.

---

### Task 1: Preserve the reference asset

**Files:**
- Create: `public/hero-particle-reference.png`

- [ ] Copy the user-supplied PNG into `public/hero-particle-reference.png` so the browser can load it as a particle source map.

### Task 2: Create the static particle scene

**Files:**
- Create: `src/components/ParticleHeroScene.tsx`

**Interfaces:**
- Produces: `ParticleHeroScene(): JSX.Element`

- [ ] Load `/hero-particle-reference.png` into an offscreen canvas.
- [ ] Sample bright pixels with weighted randomness so figures and bright terrain receive higher density.
- [ ] Convert image coordinates to a viewport-fitted world-space composition.
- [ ] Add per-particle size, brightness, phase, and depth attributes.
- [ ] Render the particles with a circular soft-point fragment shader.
- [ ] Add restrained shader-only breathing and shimmer; keep the composition stable.
- [ ] Resize the renderer and camera responsively, preserving the joined hands near the focal center.
- [ ] Dispose WebGL resources when the component unmounts.

### Task 3: Present Stage 1 on the home page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] Render `ParticleHeroScene` as the current page.
- [ ] Add only the full-screen canvas shell styles needed by the scene.
- [ ] Leave the existing `ButterflyStudy` implementation available for Stage 2.
- [ ] Start the development server and stop for the user's visual review.

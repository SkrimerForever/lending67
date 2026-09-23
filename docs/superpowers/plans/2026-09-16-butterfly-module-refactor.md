# Butterfly Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `ButterflyStudy.tsx` into a small public entry point and move the actual experience, presentation scenes, and loading indicator into responsibility-focused modules without changing animation behavior.

**Architecture:** Keep the existing client-side animation runtime intact inside a deliberately named experience module so the confirmed Three.js/GSAP timings are not rewritten. Extract static React scenes and the loader into presentation components, leaving the public entry file as a stable import boundary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Three.js, GSAP.

**Spec:** `docs/superpowers/specs/2026-09-15-particle-hero-scene-design.md`

## Global Constraints

- Preserve the confirmed dissolve transition and captured velocity behavior.
- Preserve DOM class names because `globals.css` and GSAP selectors depend on them.
- Do not change copy, timings, shader source, or visual parameters during this refactor.
- Keep browser-only code below a Client Component boundary.

---

### Task 1: Extract the experience and presentation scenes

**Files:**
- Modify: `src/components/ButterflyStudy.tsx`
- Create: `src/components/butterfly/ButterflyExperience.tsx`
- Create: `src/components/butterfly/HeroIntro.tsx`
- Create: `src/components/butterfly/ProblemField.tsx`
- Create: `src/components/butterfly/ApproachScene.tsx`
- Create: `src/components/butterfly/LoadingLine.tsx`
- Move: `src/components/FlowArchitectCase.tsx` to `src/components/butterfly/FlowArchitectCase.tsx`

**Interfaces:**
- Consumes: existing refs and CSS class names.
- Produces: `ButterflyStudy`, a small stable public entry component; focused scene components with typed ref props.

- [ ] Move the existing runtime into `ButterflyExperience` without changing its behavior.
- [ ] Extract static JSX scenes while preserving class names, ref wiring, and accessibility attributes.
- [ ] Keep the public `ButterflyStudy` entry point focused on composition only.

### Task 2: Build the refactor

**Files:**
- Verify: all files touched above.

**Interfaces:**
- Consumes: the refactored module graph.
- Produces: a production build for the user's visual review.

- [ ] Run `npm run build`.
- [ ] Start the development server for user review.

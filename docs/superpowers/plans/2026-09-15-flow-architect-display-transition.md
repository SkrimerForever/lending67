# Flow Architect Display Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reveal the completed Flow Architect showcase as content inside a physical workstation display, pull the camera backward through layered parallax, hold, then turn right toward a second-project beacon.

**Architecture:** Keep Three.js responsible for the particle world and existing butterfly while a new CSS 3D `case-world` owns the readable DOM interface, display housing, editorial copy, and second-case beacon. A pure transition-state function converts `scrollTravel` into pullback, reveal, hold, and turn values; the render loop writes those values as CSS custom properties so all DOM layers share one deterministic virtual camera.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, GSAP ScrollTrigger, Three.js, CSS 3D transforms, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-15-flow-architect-display-transition-design.md`

## Global Constraints

- Preserve the accepted butterfly-to-Flow-Architect flight unchanged.
- Preserve the current Flow Architect prompt, workflow-generation, RUN, data-flow, and completion timings.
- Pull straight backward before applying any yaw or pitch.
- Use a 20-degree right turn and never exceed 24 degrees.
- Use a thin unbranded professional display; do not add a keyboard, logo, desk, or room.
- Keep the first display visible in left perspective when the second-project beacon appears.
- Use a cool silver-white beacon for project two; do not define the second project's content.
- Keep every phase reversible from scroll progress.

---

### Task 1: Deterministic display-transition state

**Files:**
- Create: `src/components/caseDisplayTransition.ts`
- Create: `src/components/caseDisplayTransition.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: normalized `scrollTravel: number` and `reducedMotion: boolean`.
- Produces: `getCaseDisplayTransition(scrollTravel, reducedMotion): CaseDisplayTransitionState` with `pullback`, `shellReveal`, `recognitionHold`, `turn`, and `beaconReveal`, each clamped to `0..1`.

- [ ] **Step 1: Add the failing state-boundary test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getCaseDisplayTransition } from "./caseDisplayTransition.ts";

test("pullback completes before the operator turn begins", () => {
  const pullingBack = getCaseDisplayTransition(1.68, false);
  assert.ok(pullingBack.pullback > 0);
  assert.equal(pullingBack.turn, 0);
  const turning = getCaseDisplayTransition(1.91, false);
  assert.equal(turning.pullback, 1);
  assert.ok(turning.turn > 0);
});

test("reduced motion returns stable reveal states", () => {
  assert.deepEqual(getCaseDisplayTransition(2, true), {
    pullback: 1, shellReveal: 1, recognitionHold: 1, turn: 1, beaconReveal: 1,
  });
});
```

- [ ] **Step 2: Add `"test": "node --test src/components/*.test.ts"` to `package.json` and run the test**

Run: `npm test`
Expected: FAIL because `caseDisplayTransition.ts` does not exist.

- [ ] **Step 3: Implement the pure progress mapping**

```ts
export type CaseDisplayTransitionState = {
  pullback: number;
  shellReveal: number;
  recognitionHold: number;
  turn: number;
  beaconReveal: number;
};

const smooth = (value: number, start: number, end: number) => {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

export function getCaseDisplayTransition(scroll: number, reducedMotion: boolean) {
  if (reducedMotion) return { pullback: 1, shellReveal: 1, recognitionHold: 1, turn: 1, beaconReveal: 1 };
  return {
    pullback: smooth(scroll, 1.58, 1.82),
    shellReveal: smooth(scroll, 1.66, 1.82),
    recognitionHold: smooth(scroll, 1.82, 1.88),
    turn: smooth(scroll, 1.88, 2.08),
    beaconReveal: smooth(scroll, 1.94, 2.08),
  };
}
```

- [ ] **Step 4: Run `npm test` and commit**

Expected: both tests PASS.

```bash
git add package.json src/components/caseDisplayTransition.ts src/components/caseDisplayTransition.test.ts
git commit -m "test: define display transition progress"
```

### Task 2: Establish the CSS 3D world and interface depth

**Files:**
- Modify: `src/components/ButterflyStudy.tsx:403-425,1636-1770`
- Modify: `src/app/globals.css:183-560`

**Interfaces:**
- Consumes: existing case copy and `.case-screen-plane` markup.
- Produces: `.case-world`, `.display-content`, and `.flow-depth-stage` with shared `--case-pullback` and per-layer `--layer-z` values.

- [ ] **Step 1: Wrap the existing case content without changing copy or child order**

```tsx
<div ref={caseWorldRef} className="case-world">
  <section className="case-copy">...</section>
  <div className="display-content">
    <div className="flow-depth-stage">...</div>
  </div>
</div>
```

- [ ] **Step 2: Add the perspective foundation**

```css
.case-world { position:absolute; inset:0; perspective:1400px; transform-style:preserve-3d; }
.display-content, .flow-depth-stage { position:absolute; inset:0; transform-style:preserve-3d; }
.flow-grid { --layer-z: 0px; }
.flow-edges { --layer-z: 12px; }
.flow-node--trigger { --layer-z: 24px; }
.flow-node--send { --layer-z: 30px; }
.flow-node--llm { --layer-z: 42px; }
.flow-prompt { --layer-z: 52px; }
.flow-toolbar { --layer-z: 60px; }
.flow-depth-stage > * { translate: 0 0 var(--layer-z); }
```

- [ ] **Step 3: Keep the existing inline reveal transforms unchanged; the individual CSS `translate` property composes the Z depth without overwriting them. Put `.case-copy` at `82px` and the display glass at `72px`.**

- [ ] **Step 4: Run `npm run lint`; expected: no new errors. Commit**

```bash
git add src/components/ButterflyStudy.tsx src/app/globals.css
git commit -m "feat: layer Flow Architect interface in 3d"
```

### Task 3: Build the workstation display housing

**Files:**
- Modify: `src/components/ButterflyStudy.tsx:1636-1770`
- Modify: `src/app/globals.css:281-560`

**Interfaces:**
- Consumes: `.display-content` from Task 2 and `shellReveal` from Task 1.
- Produces: `.display-shell`, `.display-glass`, `.display-bezel`, `.display-lower-edge`, and `.display-stand`.

- [ ] **Step 1: Add housing markup around, not inside, the clipped application content**

```tsx
<div className="display-shell" aria-hidden="true">
  <div className="display-bezel" />
  <div className="display-glass" />
  <div className="display-lower-edge" />
  <div className="display-stand" />
</div>
```

- [ ] **Step 2: Style an unbranded near-black housing with asymmetric amber reflection**

```css
.display-shell { position:absolute; inset:11vh 3vw 11vh 39vw; transform-style:preserve-3d; }
.display-bezel { position:absolute; inset:-18px; border-radius:10px; background:linear-gradient(145deg,#151210,#050505 44%,#010101); }
.display-glass { position:absolute; inset:0; transform:translateZ(8px); background:linear-gradient(125deg,rgba(255,190,112,.035),transparent 28%); }
.display-lower-edge { position:absolute; left:-18px; right:-18px; bottom:-24px; height:24px; background:#050505; transform:rotateX(-68deg); transform-origin:top; }
.display-stand { position:absolute; left:44%; bottom:-84px; width:12%; height:64px; background:linear-gradient(#080706,#020202); }
```

- [ ] **Step 3: Drive housing opacity with `--shell-reveal` while keeping the display content fully readable**

- [ ] **Step 4: Run `npm run lint`; expected: no new errors. Commit**

```bash
git add src/components/ButterflyStudy.tsx src/app/globals.css
git commit -m "feat: reveal workstation display housing"
```

### Task 4: Pull back the virtual camera with coherent parallax

**Files:**
- Modify: `src/components/ButterflyStudy.tsx:1428-1564`
- Modify: `src/app/globals.css:183-560`

**Interfaces:**
- Consumes: `getCaseDisplayTransition()` and `caseWorldRef`.
- Produces: CSS variables `--case-pullback`, `--shell-reveal`, `--case-turn`, plus a fixed straight-back camera phase.

- [ ] **Step 1: Import and evaluate transition state after Flow execution progress**

```ts
const displayTransition = getCaseDisplayTransition(scrollTravel, reduceMotion.matches);
caseWorldRef.current?.style.setProperty("--case-pullback", String(displayTransition.pullback));
caseWorldRef.current?.style.setProperty("--shell-reveal", String(displayTransition.shellReveal));
caseWorldRef.current?.style.setProperty("--case-turn", String(displayTransition.turn));
```

- [ ] **Step 2: Apply weighted pullback without yaw during `pullback < 1`**

```css
.case-world {
  transform: translateZ(calc(var(--case-pullback) * -720px))
    rotateY(calc(var(--case-turn) * -20deg));
  transform-origin: 68% 50%;
}
```

- [ ] **Step 3: Keep the editorial copy on one `translateZ(82px)` plane and verify no individual heading line gets a separate transform**

- [ ] **Step 4: Run `npm test && npm run lint`; expected: state tests pass and no new lint errors. Commit**

```bash
git add src/components/ButterflyStudy.tsx src/app/globals.css
git commit -m "feat: add weighted display pullback"
```

### Task 5: Recognition hold, operator turn, and second-project beacon

**Files:**
- Modify: `src/components/ButterflyStudy.tsx:430-490,1428-1564,1636-1770`
- Modify: `src/app/globals.css:10,183-560`

**Interfaces:**
- Consumes: `recognitionHold`, `turn`, and `beaconReveal` from Task 1.
- Produces: the final left-perspective display composition and `.second-case-beacon` at screen right.

- [ ] **Step 1: Extend `scrollRef` from `1.58` to `2.08`, change `.study-shell` from `1580svh` to `2080svh`, and extend `timelineClock` from `98` to `182.5` so all pre-existing thresholds retain their current physical timing**

- [ ] **Step 2: Add the beacon markup**

```tsx
<div className="second-case-beacon" aria-hidden="true">
  <span className="second-case-beacon__light" />
  <span className="second-case-beacon__silhouette" />
</div>
```

- [ ] **Step 3: Reveal a cool silver-white light before its dark silhouette**

```css
.second-case-beacon { position:absolute; inset:12vh -34vw 12vh auto; width:52vw; opacity:var(--beacon-reveal); transform:translateZ(-180px); }
.second-case-beacon__light { position:absolute; inset:8%; background:radial-gradient(ellipse,rgba(205,218,226,.12),transparent 68%); filter:blur(36px); }
.second-case-beacon__silhouette { position:absolute; inset:14% 5%; background:#030405; box-shadow:0 0 80px rgba(205,218,226,.025); }
```

- [ ] **Step 4: Ensure the turn begins only after pullback and hold are complete; keep the first display visible at the left with `rotateY(-20deg)`**

- [ ] **Step 5: Add the reduced-motion three-state CSS path and run `npm test && npm run lint`**

Expected: state tests pass, no new lint errors, and reduced motion contains no deep Z translation.

- [ ] **Step 6: Start `npm run dev`, inspect the full transition forward and backward, and ask the user for visual acceptance**

Verify: unchanged butterfly flight; unchanged Flow execution; straight pullback; distinct node/UI/text parallax; recognizable display; readable hold; 20-degree turn; first display retained left; cool second beacon right.

- [ ] **Step 7: Commit**

```bash
git add src/components/ButterflyStudy.tsx src/app/globals.css
git commit -m "feat: reveal display and discover next case"
```

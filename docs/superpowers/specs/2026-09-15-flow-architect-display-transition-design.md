# Flow Architect Display Reveal — Design

## Goal

Extend the Flow Architect case ending into a cinematic transition that reveals the current showcase has been playing inside a physical workstation display. The camera pulls straight back first, exposing real depth between interface layers, then turns right after a short hold to discover the light and silhouette of a second project.

The transition must preserve the current monochrome-and-amber visual language. It must not look like a generic laptop mockup, a carousel, or a flat scale animation.

## Chosen Physical Metaphor

The containing object is a thin professional workstation display rather than a branded laptop.

Only the details needed to establish physical reality are shown:

- dark glass around the active image;
- a narrow asymmetric bezel;
- a lower housing edge with slightly more mass;
- a restrained hinge or stand connection;
- faint edge reflections from the amber interface light.

There is no logo, keyboard, desk setup, or decorative product-render treatment. The projects remain the subject.

## Scene Architecture

The final case becomes a CSS 3D world synchronized to the existing GSAP scroll progress. DOM remains the rendering method for interface text and nodes so typography stays sharp. Three.js continues to render the butterfly and existing particle world.

The new DOM hierarchy is:

1. `case-world` — the virtual world transformed by the case camera.
2. `display-shell` — bezel, glass, lower edge, and stand connection.
3. `display-content` — current Flow Architect screen clipped inside the glass.
4. `flow-depth-stage` — perspective container for the interface layers.
5. `second-case-beacon` — initially only a distant light and dark silhouette to the right.

All motion is derived from scroll progress. No independent timeout or autoplay timeline controls the reveal.

## Depth Layout

The interface is separated into restrained Z layers:

| Layer | Relative Z | Purpose |
| --- | ---: | --- |
| Grid and canvas haze | 0 | Stable application surface |
| Bezier connections | 12 | Separate data paths from the grid |
| Telegram Trigger | 24 | First workflow stage |
| Telegram Send | 30 | Final workflow stage |
| LLM Call | 42 | Visual and logical core |
| Prompt | 52 | Source of the generated workflow |
| Toolbar | 60 | Closest application chrome |
| Display glass reflection | 72 | Physical surface cue |
| Left case copy | 82 | Editorial foreground plane |

The depth range stays narrow enough to preserve a coherent UI. The pullback makes separation visible through parallax without turning the interface into floating cards.

## Scroll Sequence

### Phase 1 — Settle

The existing workflow execution completes. `EXECUTION / COMPLETE` remains visible for a short hold. The camera angle and target do not change.

### Phase 2 — Straight Pullback

The virtual camera moves backward along Z with no yaw or pitch change. The movement is clearly visible and longer than the previous camera advances.

During the pullback:

- toolbar and prompt move fastest because they are closest;
- the LLM node separates slightly more than the Telegram nodes;
- connections move less than nodes;
- the grid remains closest to the screen surface;
- the left editorial copy moves as one foreground plane rather than breaking into independent lines.

The motion uses an acceleration-to-coast curve so the camera feels weighted. It does not use a simple CSS scale ease.

### Phase 3 — Display Reveal

As the active image occupies roughly 62–68% of the viewport width, the display glass and bezel become readable. The lower edge appears last, confirming that the scene is inside a physical screen.

Amber interface light creates asymmetric reflections on the upper-right bezel. The left and lower edges remain close to black. The stand connection is visible only enough to establish depth.

### Phase 4 — Recognition Hold

The camera pauses briefly after the display becomes legible. No new content appears during this hold. This gives the reveal time to register.

### Phase 5 — Operator Turn

The camera begins a controlled rightward turn of approximately 20 degrees. The first display shifts into left perspective and remains visible as an object in space.

The second project is not shown as a finished screen in this stage. Its reveal begins with:

- a weak project-specific light source;
- a dark rectangular or object silhouette;
- shallow environmental reflection;
- enough empty space for the next case composition.

The camera does not snap to the second project and does not center it before its own reveal sequence begins.

## Visual Treatment

- Background remains true black with very low reflected light.
- Display housing uses near-black values rather than visible grey outlines.
- Bezel readability comes from edge lighting and occlusion, not a uniform border.
- Existing amber is the only active color during the first display reveal.
- Depth blur is minimal. Scale, relative displacement, occlusion, and light establish depth.
- The second-project beacon uses a restrained cool silver-white light so it is distinct from Flow Architect's amber without defining the next case's final palette.

## Responsive Behavior

Desktop receives the full pullback, physical display reveal, recognition hold, and right turn.

On narrow viewports:

- Z separation is reduced;
- the display remains centered during pullback;
- the right turn is shortened;
- the stand may be omitted if it competes with the interface;
- the left case copy stays attached to the display composition and never overlaps its bezel.

## Reduced Motion

Reduced-motion mode uses three stable states with short crossfades:

1. completed Flow Architect interface;
2. revealed workstation display;
3. display shifted left with the second-project light visible.

No large Z travel, deep parallax, or sweeping camera turn is used.

## Implementation Boundary

This stage includes:

- conversion of the Flow Architect screen into a layered CSS 3D scene;
- physical workstation display shell;
- straight camera pullback;
- interface and editorial-copy parallax;
- recognition hold;
- rightward camera turn;
- second-project cool light and dark silhouette beacon.

This stage does not include:

- the identity, copy, interface, or animation of project two;
- a keyboard, branded laptop, desk, room, or environmental set;
- changes to the accepted butterfly-to-Flow-Architect flight;
- changes to the existing Flow Architect workflow-generation sequence.

## Acceptance Criteria

- During the first part of the pullback, the camera angle is visibly unchanged.
- Nodes, connections, prompt, toolbar, grid, and case copy show distinct but coherent parallax.
- The viewer can recognize a physical display without a logo or literal laptop keyboard.
- The bezel is asymmetric and lit by the existing amber scene.
- The reveal contains a readable pause before the camera turns.
- The camera turn does not exceed 24 degrees.
- The first display remains visible in left perspective when the second-project light appears.
- The entire sequence reverses cleanly with scroll.

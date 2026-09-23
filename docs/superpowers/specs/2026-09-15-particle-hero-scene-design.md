# Particle Hero Scene Design

## Goal

Turn the existing butterfly preloader into the opening movement of a full-screen Hero scene. The final frame should reproduce the supplied monochrome particle reference as closely as practical: two human figures holding hands on a layered flowing landscape, surrounded by sparse distant particles.

## Visual Direction

- Black full-screen background.
- White and silver particles with varied density and luminance.
- The human figures are the sharpest and densest forms.
- The foreground road and terrain use layered flowing bands of points.
- The distant field is sparse and soft, creating depth without a snowstorm effect.
- The final scene remains subtly alive through restrained drift and shimmer.

## Rendering Approach

The supplied reference image is used as a target map rather than displayed as a visible background. Bright pixels are sampled into particle positions. Pixel brightness controls particle selection, size, and luminance. Region and luminance heuristics add shallow Z-depth so the foreground, figures, and distant field occupy separate spatial planes.

The existing Three.js renderer and GSAP timeline remain the foundation. No additional animation framework is required. The final implementation will extend the current shader and particle attributes with a second set of target positions and a morph progress uniform.

## Sequence

1. Butterfly particles assemble and fly as they do now.
2. The existing vortex and blizzard-like breakup are removed.
3. The butterfly begins to lose its silhouette while retaining forward momentum.
4. Particles separate into directed streams and settle into their assigned Hero targets.
5. The camera eases outward to reveal the complete landscape.
6. The loading line fades as the Hero scene becomes stable.
7. Hero typography and navigation are added only after the visual scene is accepted.

## Delivery Stages

### Stage 1: Static scene

Create the final particle composition from the reference image. Keep the existing butterfly code intact. The user reviews composition, silhouettes, density, scale, and depth.

### Stage 2: Butterfly-to-scene morph

Replace the vortex breakup with directed particle redistribution. Preserve continuity: every visible butterfly particle travels toward a scene target instead of disappearing and being replaced.

### Stage 3: Camera and ambient motion

Tune the reveal, focal hierarchy, slow residual motion, and responsive framing.

### Stage 4: Hero interface

Add headline, supporting copy, navigation, and calls to action as a separate DOM layer over the WebGL canvas.

## Responsive Behavior

Desktop preserves the wide cinematic composition. Mobile uses a cropped target map centered on the joined hands and figures, with the landscape extending beyond the viewport. Particle size and count adapt to pixel ratio and viewport area.

## Constraints

- Do not display the reference bitmap directly in the finished scene.
- Do not reintroduce the vortex or blizzard effect.
- Do not add Hero text during Stage 1.
- Do not add automated tests, lint runs, builds, or autonomous visual acceptance checks. The user is the sole visual reviewer after each stage.
- Respect reduced-motion preferences in the final transition.

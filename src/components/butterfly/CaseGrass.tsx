"use client";

import { useEffect, useRef } from "react";

type Blade = { x: number; y: number; tipX: number; tipY: number; width: number; depth: number; phase: number; flower: boolean };

export function CaseGrass({ variant = "corner" }: { variant?: "corner" | "trailing" }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!root || !canvas || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let seed = variant === "trailing" ? 837 : 219;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const blades: Blade[] = Array.from({ length: variant === "corner" ? 145 : 0 }, (_, index) => {
      const depth = random();
      const height = 0.2 + Math.pow(random(), 0.65) * 0.62;
      return {
        x: variant === "corner" ? 0.73 + random() * 0.2 : 0.38 + random() * 0.3,
        y: 0.89 + random() * 0.07,
        tipX: variant === "corner" ? 0.06 + random() * 0.73 : 0.12 + random() * 0.76,
        tipY: 0.92 - height,
        width: 0.0018 + random() * 0.0042,
        depth,
        phase: random() * Math.PI * 2,
        flower: index % 24 === 0,
      };
    }).sort((a, b) => a.depth - b.depth);
    let width = 1;
    let height = 1;
    let frame = 0;
    let clock = 0;
    let previousTime = 0;
    let disposed = false;

    function draw(time: number) {
      if (!context) return;
      context.clearRect(0, 0, width, height);
      if (variant === "trailing") {
        // Long, low arcs emerge from behind the screen; the tips droop
        // rather than forming another upright tuft.
        for (let branch = 0; branch < 3; branch += 1) {
          const wind = Math.sin(time * 0.55 + branch * 1.8) * height * 0.018;
          const rootX = width * (0.88 - branch * 0.04);
          const rootY = height * 0.97;
          const controlX = width * (0.62 - branch * 0.08);
          const controlY = height * (0.03 + branch * 0.08) + wind;
          const tipX = width * (0.08 + branch * 0.16);
          const tipY = height * (0.68 - branch * 0.13) + wind;
          context.strokeStyle = `rgba(96, 118, 70, ${0.4 + branch * 0.08})`;
          context.lineWidth = Math.max(0.6, width * 0.0022);
          context.beginPath();
          context.moveTo(rootX, rootY);
          context.quadraticCurveTo(controlX, controlY, tipX, tipY);
          context.stroke();
          for (let leaf = 0; leaf < 10; leaf += 1) {
            const t = 0.17 + leaf * 0.079;
            const inv = 1 - t;
            const x = inv * inv * rootX + 2 * inv * t * controlX + t * t * tipX;
            const y = inv * inv * rootY + 2 * inv * t * controlY + t * t * tipY;
            const tangent = Math.atan2(inv * (controlY - rootY) + t * (tipY - controlY), inv * (controlX - rootX) + t * (tipX - controlX));
            const side = leaf % 2 ? -1 : 1;
            const length = width * (0.035 + 0.012 * Math.sin(leaf * 2.3 + branch)) * (1 - t * 0.35);
            context.save();
            context.translate(x, y);
            context.rotate(tangent + side * (0.65 + Math.sin(time * 0.7 + leaf) * 0.035));
            const tone = context.createLinearGradient(0, -length * 0.25, length, length * 0.25);
            tone.addColorStop(0, "rgba(44, 66, 38, .7)");
            tone.addColorStop(0.55, "rgba(83, 111, 63, .85)");
            tone.addColorStop(1, "rgba(124, 146, 88, .65)");
            context.fillStyle = tone;
            context.beginPath();
            context.moveTo(0, 0);
            context.quadraticCurveTo(length * 0.45, -length * 0.42, length, 0);
            context.quadraticCurveTo(length * 0.45, length * 0.32, 0, 0);
            context.fill();
            context.restore();
          }
        }
        return;
      }
      for (const blade of blades) {
        const x = blade.x * width;
        const y = blade.y * height;
        const sway = (Math.sin(time * 0.7 + blade.phase) * 0.009
          + Math.sin(time * 0.38 + blade.depth * 2) * 0.012) * width;
        const tipX = blade.tipX * width + sway;
        const tipY = blade.tipY * height + Math.sin(time * 0.5 + blade.phase) * height * 0.003;
        const controlX = x + (tipX - x) * 0.3;
        const controlY = tipY + (y - tipY) * 0.14;
        const thickness = blade.width * width;
        const light = blade.depth;
        const gradient = context.createLinearGradient(x, y, tipX, tipY);
        gradient.addColorStop(0, "rgba(28, 47, 29, 0)");
        gradient.addColorStop(0.25, `rgba(43, 69, 40, ${0.26 + light * 0.28})`);
        gradient.addColorStop(0.76, `rgba(${68 + light * 32}, ${102 + light * 38}, ${57 + light * 28}, ${0.38 + light * 0.4})`);
        gradient.addColorStop(1, `rgba(145, 161, 103, ${0.25 + light * 0.3})`);
        context.fillStyle = gradient;
        context.beginPath();
        context.moveTo(x - thickness, y);
        context.quadraticCurveTo(controlX - thickness * 0.55, controlY, tipX, tipY);
        context.quadraticCurveTo(controlX + thickness * 0.55, controlY + thickness, x + thickness, y);
        context.closePath();
        context.fill();

        // Sparse flecks retain the meadow's particle texture on solid blades.
        context.fillStyle = `rgba(156, 177, 117, ${0.14 + light * 0.22})`;
        for (let dot = 1; dot < 6; dot += 1) {
          const t = dot / 6;
          const inverse = 1 - t;
          const px = inverse * inverse * x + 2 * inverse * t * controlX + t * t * tipX;
          const py = inverse * inverse * y + 2 * inverse * t * controlY + t * t * tipY;
          context.fillRect(px, py, 0.7, 0.7);
        }
        if (blade.flower) {
          const radius = width * (0.0038 + light * 0.002);
          context.fillStyle = light > 0.55 ? "rgba(219, 205, 151, .8)" : "rgba(190, 203, 177, .7)";
          for (let petal = 0; petal < 5; petal += 1) {
            const angle = petal * Math.PI * 2 / 5;
            context.beginPath();
            context.ellipse(tipX + Math.cos(angle) * radius * 1.4, tipY + Math.sin(angle) * radius,
              radius, radius * 0.65, angle, 0, Math.PI * 2);
            context.fill();
          }
          context.fillStyle = "#9b8952";
          context.beginPath();
          context.arc(tipX, tipY, radius * 0.6, 0, Math.PI * 2);
          context.fill();
        }
      }
    }

    const isActive = () => root.dataset.active === "true" && !document.hidden && !motion.matches;
    function tick(time: number) {
      frame = 0;
      if (disposed || !isActive()) { previousTime = 0; return; }
      if (previousTime) clock += Math.min(0.05, (time - previousTime) / 1000);
      previousTime = time;
      draw(clock);
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      if (isActive()) frame = requestAnimationFrame(tick);
      else draw(clock);
    }
    const resize = new ResizeObserver(() => {
      const bounds = root.getBoundingClientRect();
      width = root.clientWidth || bounds.width;
      height = root.clientHeight || bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(clock);
    });
    const visibility = new MutationObserver(sync);
    resize.observe(root);
    visibility.observe(root, { attributes: true, attributeFilter: ["data-active"] });
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
    };
  }, [variant]);

  return <div ref={rootRef} className={`case-three__grass case-three__grass--${variant}`} data-active="false" aria-hidden="true"><canvas ref={canvasRef} /></div>;
}

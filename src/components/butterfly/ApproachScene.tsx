import type { RefObject } from "react";

type ApproachSceneProps = {
  approachRef: RefObject<HTMLElement | null>;
  calloutRefs: RefObject<Array<HTMLSpanElement | null>>;
  principleRefs: RefObject<Array<HTMLSpanElement | null>>;
  resolutionRef: RefObject<HTMLDivElement | null>;
};

const LABELS = ["ЗАДАЧА", "АРХИТЕКТУРА", "ПРОДУКТ"] as const;

export function ApproachScene({
  approachRef,
  calloutRefs,
  principleRefs,
  resolutionRef,
}: ApproachSceneProps) {
  return (
    <section ref={approachRef} className="approach-scene" aria-label="Наш подход">
      <span className="approach-index">02 / ПОДХОД</span>
      <div className="approach-beats" aria-hidden="true">
        <p className="approach-beat">НЕ AI.</p>
        <p className="approach-beat">НЕ АВТОМАТИЗАЦИЯ.</p>
        <p className="approach-beat">НЕ КОД.</p>
      </div>
      <div className="column-callouts" aria-hidden="true">
        {LABELS.map((label, index) => (
          <span
            key={label}
            ref={(element) => { calloutRefs.current[index] = element; }}
            className="column-callout"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="column-principles" aria-label="Принципы работы">
        {LABELS.map((label, index) => (
          <span
            key={label}
            ref={(element) => { principleRefs.current[index] = element; }}
            className={`column-principle column-principle--${["task", "architecture", "product"][index]}`}
          >
            <span className="column-principle__number">0{index + 1}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>
      <div ref={resolutionRef} className="approach-resolution">
        <h2>
          <span>СНАЧАЛА — РЕЗУЛЬТАТ.</span>
          <span>ПОТОМ — ТЕХНОЛОГИЯ.</span>
        </h2>
        <p className="approach-note">
          Разбираем бизнес-задачу, проектируем решение и собираем продукт под неё — от AI и автоматизации до backend, data и ML.
        </p>
      </div>
    </section>
  );
}

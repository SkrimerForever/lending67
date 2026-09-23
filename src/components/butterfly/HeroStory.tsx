const PROCESS_FRICTION = [
  { label: "РУЧНАЯ РАБОТА", depth: "near" },
  { label: "РАЗРОЗНЕННЫЕ ДАННЫЕ", depth: "mid" },
  { label: "МЕДЛЕННЫЕ ПРОЦЕССЫ", depth: "far" },
  { label: "НЕМАСШТАБИРУЕМАЯ ЛОГИКА", depth: "mid" },
  { label: "AI БЕЗ ПОНЯТНОГО ROI", depth: "far" },
  { label: "РУЧНЫЕ СОГЛАСОВАНИЯ", depth: "near" },
  { label: "ДАННЫЕ В ТАБЛИЦАХ", depth: "mid" },
  { label: "ПОВТОРЯЮЩИЕСЯ ОПЕРАЦИИ", depth: "far" },
  { label: "РАЗРЫВЫ МЕЖДУ СИСТЕМАМИ", depth: "mid" },
  { label: "НЕПРОЗРАЧНЫЕ ПРОЦЕССЫ", depth: "near" },
] as const;

export function HeroStory() {
  return (
    <>
      <div className="hero-plane">
        <h1 className="hero-title">
          <span>Сложные задачи.</span>
          <span>Системные решения.</span>
        </h1>
        <div className="hero-index" aria-label="Секция 01, Hero">
          <span className="hero-index__section">01 / HERO</span>
          <span className="hero-index__studio">TECHNOLOGY STUDIO — 2026</span>
        </div>
        <p className="hero-capabilities">
          AI <span>·</span> АВТОМАТИЗАЦИЯ <span>·</span> DATA <span>·</span> SOFTWARE
        </p>
        <a className="hero-contact" href="#contacts">
          <span>Обсудить проект</span>
          <span className="hero-contact__arrow" aria-hidden="true">↘</span>
        </a>
      </div>

      <div className="problem-field" aria-hidden="true">
        {PROCESS_FRICTION.map((problem, index) => (
          <span key={problem.label} className={`problem-word problem-word--${index + 1} problem-word--${problem.depth}`}>
            {problem.label}
          </span>
        ))}
      </div>

      <div className="architecture-map" aria-hidden="true">
        <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet">
          <path d="M105 176 C260 176 300 300 475 300" pathLength="1" />
          <path d="M116 444 C270 444 316 320 475 320" pathLength="1" />
          <path d="M475 300 C612 300 654 164 842 164" pathLength="1" />
          <path d="M475 320 C630 320 684 458 872 458" pathLength="1" />
          <path d="M475 310 L800 310" pathLength="1" />
        </svg>
        <span className="architecture-label architecture-label--data">DATA</span>
        <span className="architecture-label architecture-label--process">PROCESS</span>
        <span className="architecture-label architecture-label--core">SYSTEM</span>
        <span className="architecture-label architecture-label--ai">AI</span>
        <span className="architecture-label architecture-label--api">API</span>
        <span className="architecture-label architecture-label--product">PRODUCT</span>
      </div>
    </>
  );
}

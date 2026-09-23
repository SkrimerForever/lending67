import type { RefObject } from "react";

type ElementRef<T> = RefObject<T | null>;
type ElementListRef<T> = RefObject<Array<T | null>>;

type FlowArchitectCaseProps = {
  caseGlowRef: ElementRef<HTMLDivElement>;
  caseWorldRef: ElementRef<HTMLDivElement>;
  caseSurfaceRef: ElementRef<HTMLDivElement>;
  caseCopyPlaneRef: ElementRef<HTMLElement>;
  caseScreenRef: ElementRef<HTMLDivElement>;
  flowGridRef: ElementRef<HTMLDivElement>;
  flowPromptRef: ElementRef<HTMLDivElement>;
  flowPromptTextRef: ElementRef<HTMLSpanElement>;
  flowNodeRefs: ElementListRef<HTMLDivElement>;
  flowEdgeRefs: ElementListRef<SVGPathElement>;
  flowPulseRefs: ElementListRef<SVGCircleElement>;
  flowToolbarRef: ElementRef<HTMLDivElement>;
  flowRunRef: ElementRef<HTMLButtonElement>;
  flowResultRef: ElementRef<HTMLDivElement>;
  caseIndexRef: ElementRef<HTMLSpanElement>;
  caseTitleRef: ElementRef<HTMLHeadingElement>;
  caseDescriptionRef: ElementRef<HTMLParagraphElement>;
  caseMetaRef: ElementRef<HTMLSpanElement>;
};

export function FlowArchitectCase({
  caseGlowRef,
  caseWorldRef,
  caseSurfaceRef,
  caseCopyPlaneRef,
  caseScreenRef,
  flowGridRef,
  flowPromptRef,
  flowPromptTextRef,
  flowNodeRefs,
  flowEdgeRefs,
  flowPulseRefs,
  flowToolbarRef,
  flowRunRef,
  flowResultRef,
  caseIndexRef,
  caseTitleRef,
  caseDescriptionRef,
  caseMetaRef,
}: FlowArchitectCaseProps) {
  return (
    <>
      <div ref={caseGlowRef} className="case-glow" aria-hidden="true" />
      <div className="case-transition">
        <div ref={caseWorldRef} className="case-world">
          <div className="display-shell" aria-hidden="true">
            <div className="display-back" />
            <div className="display-bezel" />
            <div className="display-lower-edge" />
            <div className="display-neck" />
            <div className="display-foot" />
          </div>

          <div ref={caseSurfaceRef} className="case-surface">
          <div className="case-content">
          <section ref={caseCopyPlaneRef} className="case-copy" aria-label="Кейс Flow Architect">
            <span ref={caseIndexRef} className="case-copy__index">03 / КЕЙС 01</span>
            <div className="case-copy__body">
              <h2 ref={caseTitleRef} className="case-copy__title">
                <span>ОПИСЫВАЕТЕ ЗАДАЧУ.</span>
                <span>СИСТЕМА СОБИРАЕТ ПРОЦЕСС.</span>
              </h2>
            </div>
            <div className="case-copy__footer">
              <p ref={caseDescriptionRef} className="case-copy__description">
                Flow Architect превращает обычное текстовое описание в готовую автоматизацию — от логики процесса до запуска.
              </p>
              <span ref={caseMetaRef} className="case-copy__meta">AI · АВТОМАТИЗАЦИЯ · GO · NEXT.JS</span>
            </div>
          </section>

          <div className="display-rig">
            <div ref={caseScreenRef} className="case-screen-plane" aria-label="Flow Architect showcase">
              <div className="display-content">
                <div className="flow-depth-stage">
                  <div ref={flowGridRef} className="flow-grid" aria-hidden="true" />

                  <div ref={flowToolbarRef} className="flow-toolbar">
                    <span className="flow-toolbar__brand">FLOW ARCHITECT</span>
                    <span className="flow-toolbar__status" aria-hidden="true" />
                    <span className="flow-toolbar__spacer" />
                    <button ref={flowRunRef} className="flow-run" type="button" tabIndex={-1}>RUN</button>
                    <button type="button" tabIndex={-1}>SAVE</button>
                  </div>

                  <svg className="flow-edges" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
                    <path
                      ref={(element) => { flowEdgeRefs.current[0] = element; }}
                      className="flow-edge flow-edge--violet"
                      pathLength="1"
                      d="M 292 346 C 360 346, 360 260, 438 260"
                    />
                    <path
                      ref={(element) => { flowEdgeRefs.current[1] = element; }}
                      className="flow-edge flow-edge--cyan"
                      pathLength="1"
                      d="M 608 260 C 688 260, 666 354, 744 354"
                    />
                    {[0, 1, 2].map((index) => (
                      <circle
                        key={`violet-pulse-${index}`}
                        ref={(element) => { flowPulseRefs.current[index] = element; }}
                        className="flow-pulse flow-pulse--violet"
                        r={index === 1 ? 3.2 : 2.5}
                      />
                    ))}
                    {[0, 1, 2].map((index) => (
                      <circle
                        key={`cyan-pulse-${index}`}
                        ref={(element) => { flowPulseRefs.current[index + 3] = element; }}
                        className="flow-pulse flow-pulse--cyan"
                        r={index === 1 ? 3.2 : 2.5}
                      />
                    ))}
                  </svg>

                  <div ref={(element) => { flowNodeRefs.current[0] = element; }} className="flow-node flow-node--trigger">
                    <span className="flow-node__ambient" aria-hidden="true" />
                    <div className="flow-node__header"><span className="flow-node__icon">↯</span><span>Telegram Trigger</span><span className="flow-node__activity" /></div>
                    <span className="flow-node__label">Event</span>
                    <div className="flow-node__field">New message</div>
                    <div className="flow-node__port flow-node__port--out" />
                  </div>

                  <div ref={(element) => { flowNodeRefs.current[1] = element; }} className="flow-node flow-node--llm">
                    <span className="flow-node__ambient" aria-hidden="true" />
                    <div className="flow-node__header"><span className="flow-node__icon">AI</span><span>LLM Call</span><span className="flow-node__activity" /></div>
                    <span className="flow-node__label">Model</span>
                    <div className="flow-node__field">GPT-4o mini</div>
                    <span className="flow-node__label">Instruction</span>
                    <div className="flow-node__field flow-node__field--multiline">Process incoming message</div>
                    <div className="flow-node__port flow-node__port--in" />
                    <div className="flow-node__port flow-node__port--out" />
                  </div>

                  <div ref={(element) => { flowNodeRefs.current[2] = element; }} className="flow-node flow-node--send">
                    <span className="flow-node__ambient" aria-hidden="true" />
                    <div className="flow-node__header"><span className="flow-node__icon">➤</span><span>Telegram Send</span><span className="flow-node__activity" /></div>
                    <span className="flow-node__label">Chat</span>
                    <div className="flow-node__field">message.chat.id</div>
                    <span className="flow-node__label">Message</span>
                    <div className="flow-node__field flow-node__field--multiline">output.text</div>
                    <div className="flow-node__port flow-node__port--in" />
                  </div>

                  <div ref={flowPromptRef} className="flow-prompt">
                    <span className="flow-prompt__spark" aria-hidden="true">✦</span>
                    <span className="flow-prompt__content">
                      <span className="flow-prompt__label">PROMPT / 01</span>
                      <span ref={flowPromptTextRef} className="flow-prompt__text" />
                    </span>
                    <span className="flow-prompt__cursor" aria-hidden="true" />
                  </div>

                  <div ref={flowResultRef} className="flow-result">
                    <span>EXECUTION / COMPLETE</span>
                    <span>3 NODES · 2 EDGES · VALID</span>
                  </div>
                  <div className="flow-glass" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

import type { RefObject } from "react";

type FourthCaseStubProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

// Case 04 opens over the grass road the butterfly has just sown. Its content is
// a separate stage; for now only its index and a placeholder title stand over
// the scene.
export function FourthCaseStub({ sectionRef }: FourthCaseStubProps) {
  return (
    <section ref={sectionRef} className="case-four-stub" aria-label="Кейс 04">
      <span className="case-four-stub__index">06 / КЕЙС 04</span>
      <h2 className="case-four-stub__title">
        <span>КЕЙС 04.</span>
      </h2>
    </section>
  );
}

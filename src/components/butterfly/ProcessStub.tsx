import type { RefObject } from "react";

type ProcessStubProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

// Block 04 opens over the meadow the butterfly has just sown. Its content is a
// separate stage; for now only its index and title stand over the scene.
export function ProcessStub({ sectionRef }: ProcessStubProps) {
  return (
    <section ref={sectionRef} className="process-stub" aria-label="Процесс">
      <span className="process-stub__index">06 / ПРОЦЕСС</span>
      <h2 className="process-stub__title">
        <span>ПРОЦЕСС.</span>
      </h2>
    </section>
  );
}

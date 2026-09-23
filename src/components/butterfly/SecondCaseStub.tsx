import type { RefObject } from "react";

type SecondCaseStubProps = {
  veilRef: RefObject<HTMLDivElement | null>;
  stubRef: RefObject<HTMLElement | null>;
};

export function SecondCaseStub({ veilRef, stubRef }: SecondCaseStubProps) {
  return (
    <>
      <div ref={veilRef} className="walk-light-veil" aria-hidden="true" />
      <section ref={stubRef} className="case-two" aria-label="Кейс 02">
        <div className="case-copy">
          <span className="case-copy__index">04 / КЕЙС 02</span>
          <div className="case-copy__body">
            <h2 className="case-copy__title">
              <span>СЛЕДУЮЩИЙ ПРОЕКТ.</span>
              <span>СКОРО ЗДЕСЬ.</span>
            </h2>
          </div>
        </div>
      </section>
    </>
  );
}

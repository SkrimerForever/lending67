"use client";

import { useImperativeHandle, useRef, type RefObject } from "react";

export type MortgagePlayback = { update(progress: number, reducedMotion: boolean): void };
const money = (n: number) => Math.round(n).toLocaleString("ru-RU");
const checks = [
  { title: "Семейная ипотека", status: "Нужно подтвердить право", description: "Возраст детей и состав семьи сопоставляются с актуальными правилами программы. Затем проверяются требования к выбранной квартире. В этом примере право на льготу не подтверждено." },
  { title: "Условия банка", status: "Нужны документы", description: "Сравниваем полную стоимость кредита, страховку, дополнительные услуги и условия изменения ставки. Без предложения банка эти условия остаются неизвестными." },
  { title: "Льготы и первый взнос", status: "Нужна проверка совместимости", description: "Учитываем сертификаты и меры поддержки отдельно от собственных средств. Для каждой программы проверяется право на участие и возможность сочетать её с другими льготами." },
];

export function MortgagePanel({ playbackRef }: { playbackRef: RefObject<MortgagePlayback | null> }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLSpanElement>(null);
  const depositRef = useRef<HTMLElement>(null);
  const principalRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<Array<HTMLParagraphElement | null>>([]);
  const checkRefs = useRef<Array<HTMLElement | null>>([]);
  useImperativeHandle(playbackRef, () => ({
    update(progress, reducedMotion) {
      const ramp = (a: number, b: number) => {
        const t = Math.max(0, Math.min(1, (progress - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      panelRef.current?.style.setProperty("--calc-reveal", String(ramp(0.645, 0.7)));
      panelRef.current?.style.setProperty("--checks-reveal", String(ramp(0.755, 0.81)));
      panelRef.current?.style.setProperty("--calc-shift", `${reducedMotion ? 0 : 20 * (1 - ramp(0.645, 0.7))}px`);
      panelRef.current?.style.setProperty("--checks-shift", `${reducedMotion ? 0 : 22 * (1 - ramp(0.755, 0.81))}px`);
      const raw = Math.min(1, Math.max(0, (progress - 0.69) / 0.13));
      const t = raw * raw * (3 - 2 * raw);
      const deposit = Math.round((4_000_000 + 1_200_000 * t) / 1000) * 1000;
      const principal = 12_800_000 - deposit;
      const rate = 0.14 / 12;
      const payment = principal * rate / (1 - (1 + rate) ** -240);
      if (paymentRef.current) paymentRef.current.textContent = money(payment);
      if (depositRef.current) depositRef.current.textContent = `${money(deposit)} ₽`;
      if (principalRef.current) principalRef.current.textContent = `${money(principal)} ₽`;
      panelRef.current?.style.setProperty("--deposit-progress", String((deposit - 2_600_000) / 7_400_000));
      const active = progress < 0.84 ? -1 : progress < 0.90 ? 0 : progress < 0.96 ? 1 : 2;
      checkRefs.current.forEach((element, index) => {
        if (!element) return;
        const open = index === active;
        element.dataset.active = String(open);
        const start = 0.83 + index * 0.06;
        const entry = ramp(start, start + 0.018);
        const fade = index === 2 ? 1 : 1 - ramp(start + 0.047, start + 0.06);
        const description = detailsRef.current[index];
        if (description) {
          description.style.opacity = String(entry * fade);
          description.style.transform = `translateY(${reducedMotion ? 0 : 12 * (1 - entry)}px)`;
          description.setAttribute("aria-hidden", String(!open));
        }
        element.style.setProperty("--check-progress", String(ramp(start, start + 0.045)));
        const mark = element.querySelector<HTMLElement>(".habitus-expand");
        if (mark) mark.textContent = open ? "−" : "+";
      });
    },
  }), []);
  return <div ref={panelRef} className="habitus-finance-panel">
    <div className="habitus-finance-heading"><span>Финансовый сценарий</span><h3>Условия, в которых<br />можно разобраться.</h3><p>Стоимость квартиры — только начало. Посмотрим на платёж и то, что стоит за ним.</p></div>
    <div className="habitus-finance-grid">
      <div className="habitus-calculator"><span className="habitus-muted">Ежемесячный платёж</span><div className="habitus-payment"><span ref={paymentRef} className="habitus-payment-number">109 430</span> <span>₽</span></div><p className="habitus-calc-caption">Расчёт при условной ставке 14%</p>
        <div className="habitus-slider"><span>Первый взнос <strong ref={depositRef}>4 000 000 ₽</strong></span><div className="habitus-slider-track"><span /></div></div>
        <div className="habitus-slider"><span>Срок кредита <strong>20 лет</strong></span><div className="habitus-slider-track habitus-slider-track--term"><span /></div></div>
        <div className="habitus-loan-total"><span>Сумма кредита</span><strong ref={principalRef}>8 800 000 ₽</strong></div>
        <p className="habitus-fineprint">Демонстрационный аннуитетный расчёт. Не предложение банка. Страховка и дополнительные расходы не включены.</p>
      </div>
      <div className="habitus-checks"><span className="habitus-muted">До решения о покупке</span>{checks.map((check, index) => <article key={check.title} ref={node => { checkRefs.current[index] = node; }}><div className="habitus-check-heading"><span><strong>{check.title}</strong><small>{check.status}</small></span><span className="habitus-expand" aria-hidden="true">+</span></div></article>)}<div className="habitus-check-details">{checks.map((check, index) => <p key={check.title} ref={node => { detailsRef.current[index] = node; }} aria-hidden="true">{check.description}</p>)}</div><div className="habitus-check-note"><span className="habitus-status-dot" />Расчёт готов. Льготы ещё не подтверждены.</div></div>
    </div>
  </div>;
}

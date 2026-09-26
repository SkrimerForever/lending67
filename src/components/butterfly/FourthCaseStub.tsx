"use client";

import { useState, useRef, useImperativeHandle, type RefObject } from "react";
import { FamilyMap, type FamilyRoute, type MapPlayback } from "./habitus/FamilyMap";
import { MortgagePanel, type MortgagePlayback } from "./habitus/MortgagePanel";

export type HabitusPlayback = { update(progress: number, reducedMotion: boolean): void };
type FourthCaseStubProps = { sectionRef: RefObject<HTMLElement | null>; screenRef: RefObject<HTMLDivElement | null>; playbackRef: RefObject<HabitusPlayback | null> };

function FloorPlan() {
  return <svg viewBox="0 0 320 244" role="img" aria-label="Пример планировки: кухня-гостиная, две спальни, санузел и лоджия">
    <defs><pattern id="habitus-floor" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0h12v12" fill="none" stroke="#dce0d6" strokeWidth=".6" /></pattern></defs>
    <path d="M39 25h242v175H39Z" fill="#f8f9f5" />
    <path d="M43 29h110v115H43Z M177 29h100v77H177Z M177 113h100v83H177Z" fill="url(#habitus-floor)" />
    <g fill="#e0e5d9" stroke="#bdc8b2" strokeWidth="1"><rect x="192" y="37" width="54" height="52" rx="2" /><rect x="196" y="41" width="20" height="12" rx="2" /><rect x="222" y="41" width="20" height="12" rx="2" /><rect x="220" y="127" width="45" height="59" rx="2" /><rect x="224" y="131" width="37" height="12" rx="2" /><rect x="55" y="86" width="21" height="50" rx="3" /><rect x="83" y="99" width="30" height="28" rx="6" /><rect x="53" y="37" width="80" height="17" /><circle cx="110" cy="73" r="14" /></g>
    <g stroke="#687363" fill="none" strokeWidth="4"><path d="M39 25h242v175H181m-27 0H39V25M158 25v69m0 26v26H39M176 25v83h105M176 108v33m0 23v36M116 146v54" /></g>
    <g stroke="#aeb8a7" fill="none" strokeWidth="1"><path d="M158 94a26 26 0 0 0-26 26h26M176 141a23 23 0 0 0-23 23h23M154 200a27 27 0 0 1 27-27v27" /><rect x="53" y="158" width="29" height="17" rx="7" /><rect x="91" y="154" width="16" height="30" rx="3" /></g>
    <g stroke="#f8f9f5" strokeWidth="6"><path d="M68 25h61M203 25h53M281 139v41" /></g><g stroke="#aebaaa" strokeWidth="1.5"><path d="M68 25h61M203 25h53M281 139v41" /></g>
    <path d="M199 201v23h82v-23" fill="none" stroke="#b7c2b0" strokeWidth="2" />
    <g fill="#89947f" fontFamily="Arial, sans-serif" fontSize="9"><text x="92" y="133" textAnchor="middle">26,4</text><text x="252" y="98">16,2</text><text x="195" y="188">12,8</text><text x="71" y="193">5,6</text></g>
  </svg>;
}

export function FourthCaseStub({ sectionRef, screenRef, playbackRef }: FourthCaseStubProps) {
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);
  const mortgageRef = useRef<MortgagePlayback>(null);
  const mapRef = useRef<MapPlayback>(null);
  const future = phase >= 2;
  const view = phase >= 3 ? "mortgage" : "life";
  const route: FamilyRoute = phase === 0 ? "alex" : phase === 1 ? "maria" : "all";
  const saved = phase >= 3;
  useImperativeHandle(playbackRef, () => ({
    update(progress, reducedMotion) {
      const nextPhase = progress < 0.2 ? 0 : progress < 0.4 ? 1 : progress < 0.62 ? 2 : 3;
      if (nextPhase !== phaseRef.current) {
        phaseRef.current = nextPhase;
        setPhase(nextPhase);
      }
      const ramp = (start: number, end: number) => {
        const t = Math.min(1, Math.max(0, (progress - start) / (end - start)));
        return t * t * (3 - 2 * t);
      };
      screenRef.current?.style.setProperty("--alex-reveal", String(ramp(0.025, 0.175)));
      screenRef.current?.style.setProperty("--maria-reveal", String(ramp(0.225, 0.375)));
      screenRef.current?.style.setProperty("--school-reveal", String(ramp(0.435, 0.575)));
      const screen = screenRef.current;
      const handoff = ramp(0.59, 0.665);
      screen?.style.setProperty("--life-opacity", String(1 - ramp(0.59, 0.635)));
      screen?.style.setProperty("--finance-opacity", String(ramp(0.625, 0.675)));
      screen?.style.setProperty("--life-shift", `${reducedMotion ? 0 : -32 * handoff}px`);
      screen?.style.setProperty("--finance-shift", `${reducedMotion ? 0 : 36 * (1 - handoff)}px`);
      screen?.style.setProperty("--chapter-progress", String(progress));
      screen?.style.setProperty("--summary-alex", String(ramp(0.10, 0.18)));
      screen?.style.setProperty("--summary-maria", String(ramp(0.28, 0.38)));
      // Text swaps at the trough of this fade, never in a fully visible frame.
      screen?.style.setProperty("--period-copy", String(1 - ramp(0.38, 0.4) + ramp(0.4, 0.43)));
      mapRef.current?.update(progress, reducedMotion);
      mortgageRef.current?.update(progress, reducedMotion);
    },
  }), [screenRef]);
  return <section ref={sectionRef} className="case-four-stub" aria-label="Кейс 04 — Habitus" aria-hidden="true" inert>
    <div ref={screenRef} className="habitus-screen">
      <header className="habitus-header">
        <span className="habitus-wordmark"><svg width="23" height="27" viewBox="0 0 23 27" fill="none" aria-hidden="true"><path d="M2 25V8L11.5 2 21 8v17M8 25V13h7v12" stroke="currentColor" strokeWidth="1.5" /></svg>habitus<span>Место для жизни</span></span>
        <span className="habitus-case-label">04 / Недвижимость</span>
        <div className="habitus-household"><span className="habitus-avatar">АМ</span><span>Семья Морозовых<small>Двое взрослых и ребёнок</small></span></div>
      </header>
      <div className="habitus-workspace">
        <aside className="habitus-listing">
          <div className="habitus-listing-heading"><span>В вашей подборке</span><button className="habitus-bookmark" aria-label={saved ? "Убрать квартиру из сохранённых" : "Сохранить квартиру"} aria-pressed={saved}><svg width="18" height="21" viewBox="0 0 18 21" aria-hidden="true"><path d="M3 2h12v17l-6-4-6 4Z" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" /></svg></button></div>
          <h2>Место для<br />следующей главы.</h2><p className="habitus-listing-subtitle">Квартира, которая подходит<br />не только по метражу.</p>
          <div className="habitus-floorplan"><FloorPlan /><span>Пример планировки</span></div>
          <div className="habitus-property-heading"><h3>3-комнатная, 74 м²</h3><span>ЖК «Тихий парк»</span></div>
          <dl className="habitus-specs"><div><dt>Этаж</dt><dd>6 из 12</dd></div><div><dt>Комнаты</dt><dd>2 спальни</dd></div><div><dt>Двор</dt><dd>Без машин</dd></div></dl>
          <div className="habitus-price">12 800 000 <span>₽</span></div>
          <button className="habitus-primary"><span>{view === "mortgage" ? "Вернуться к маршрутам" : "Посмотреть ипотеку"}</span><svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3 9h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.5" /></svg></button>
          <p className="habitus-listing-note" aria-live="polite">{saved ? "Квартира сохранена в этой демонстрации." : "Дом, маршруты и суммы — демонстрационный пример."}</p>
        </aside>
        <div className="habitus-main">
          <nav className="habitus-navigation" aria-label="Раздел карточки"><div className="habitus-view-tabs"><button aria-pressed={view === "life"}>Жизнь здесь</button><button aria-pressed={view === "mortgage"}>Ипотека и льготы</button></div><span className="habitus-demo-label">Демонстрация продукта</span></nav>
          <div className="habitus-scenes"><div className="habitus-life-view" aria-hidden={view !== "life"}>
            <div className="habitus-map-heading"><div><span>Ваш повседневный маршрут</span><h3>{future ? "Новый учебный год. Тот же дом." : "У каждого свой день. Дом — один."}</h3></div><div className="habitus-period"><button aria-pressed={!future}>Сейчас</button><button aria-pressed={future}>Через год</button></div></div>
            <div className="habitus-map-stage"><FamilyMap future={future} route={route} playbackRef={mapRef} />
              <div className="habitus-map-context"><span className="habitus-status-dot" /><span>{future ? "Школа с математическим классом" : "Садик по дороге на работу"}<small>{future ? "Условия поступления требуют проверки" : "Отвозите ребёнка к 08:00"}</small></span></div>
              <div className="habitus-route-picker" aria-label="Показать маршрут"><button aria-pressed={route === "all"}>Все</button><button aria-pressed={route === "alex"}>Алексей</button><button aria-pressed={route === "maria"}>Мария</button></div>
            </div>
            <div className="habitus-route-summary"><button className={route === "alex" ? "is-selected" : ""} aria-pressed={route === "alex"}><span className="habitus-route-number">01</span><span><strong>Алексей <small>Пешком и метро</small></strong><span>Дом — офис</span></span><b>38 <small>мин</small></b></button><button className={route === "maria" ? "is-selected" : ""} aria-pressed={route === "maria"}><span className="habitus-route-number">02</span><span><strong>Мария <small>На машине</small></strong><span>{future ? "Дом — школа — работа" : "Дом — садик — работа"}</span></span><b>{future ? "32" : "41"} <small>мин</small></b></button></div>
          </div><div className="habitus-mortgage-playback" aria-hidden={view !== "mortgage"}><MortgagePanel playbackRef={mortgageRef} /></div></div>
          <div className="habitus-story-progress" aria-hidden="true"><span /></div><footer className="habitus-bottomline"><span>Сначала ваша жизнь. Потом адрес.</span><span>Habitus / 04</span></footer>
        </div>
      </div>
    </div>
  </section>;
}

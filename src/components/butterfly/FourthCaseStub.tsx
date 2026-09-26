"use client";

import { useState, type RefObject } from "react";

type FourthCaseStubProps = {
  sectionRef: RefObject<HTMLElement | null>;
  screenRef: RefObject<HTMLDivElement | null>;
};

const blocks = [
  [42, 42, 98, 62], [164, 40, 62, 104], [256, 42, 110, 60], [396, 42, 72, 80],
  [508, 44, 110, 68], [660, 42, 94, 90], [52, 174, 110, 64], [208, 192, 74, 58],
  [326, 150, 114, 76], [514, 166, 88, 80], [656, 178, 88, 60], [54, 310, 94, 84],
  [194, 316, 76, 62], [334, 300, 94, 60], [506, 320, 106, 72], [656, 310, 86, 104],
  [46, 462, 116, 64], [206, 454, 94, 86], [348, 458, 110, 66], [526, 458, 84, 82],
];

function FamilyMap({ future }: { future: boolean }) {
  return (
    <div className="habitus-map" data-future={future}>
      <svg viewBox="0 0 800 580" role="img" aria-label={future ? "Сценарий через год: маршруты семьи из дома в школу и на работу" : "Маршруты семьи из дома в детский сад и на работу"}>
        <rect width="800" height="580" fill="#e9eef0" />
        <path d="M610 -20 C565 115 701 165 659 285 S701 445 820 490 L850 -20Z" fill="#cedfe7" />
        <path d="M0 405 Q104 381 164 420 L164 580 H0Z M300 0 H488 V117 H300Z M662 455 H800 V580 H662Z" fill="#d4dfd3" />
        <g fill="none" stroke="#fbfcfa" strokeWidth="21" strokeLinejoin="round">
          <path d="M0 272 H800 M182 0 V580 M480 0 V580 M0 430 H800 M0 128 H620" />
          <path d="M310 128 V430 M630 0 V430" strokeWidth="13" />
        </g>
        <g fill="#d8dfe2" stroke="#c6cfd4" strokeWidth="1.2">
          {blocks.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="3" />)}
        </g>
        <g fill="#bdcebf">
          {Array.from({ length: 15 }, (_, i) => <circle key={i} cx={32 + (i % 5) * 27} cy={453 + Math.floor(i / 5) * 37} r={8 + i % 3} />)}
        </g>
        <g className="habitus-map__street" fill="#82929b" fontSize="10" letterSpacing="2">
          <text x="34" y="264">ПАРКОВАЯ УЛИЦА</text><text x="346" y="423">ТИХИЙ ПРОСПЕКТ</text>
          <text x="464" y="240" transform="rotate(-90 464 240)">САДОВАЯ УЛИЦА</text>
        </g>
        <rect x="336" y="301" width="91" height="59" rx="4" fill="#52736d" stroke="#fff" strokeWidth="3" />
        <path d="M348 314 H414 M348 326 H414 M348 338 H414" stroke="#a9c2b8" strokeWidth="3" />
        <g fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path className="habitus-map__route habitus-map__route--work" pathLength="1" d="M382 330 V272 H480 V128 H551 V82" stroke="#577fa2" />
          <path className="habitus-map__route habitus-map__route--now" pathLength="1" d="M382 330 V272 H182 V215 H110 V272 H182 V430 H565 V497" stroke="#aa8661" />
          <path className="habitus-map__route habitus-map__route--future" pathLength="1" d="M382 330 V430 H250 V492 M250 492 V430 H565 V497" stroke="#aa8661" />
        </g>
        <g className="habitus-map__destinations" fontFamily="Arial, sans-serif">
          <g transform="translate(338 365)"><rect width="90" height="31" rx="15" fill="#2e4e49" /><text x="45" y="20" textAnchor="middle" fill="white" fontSize="12">Ваш дом</text></g>
          <g transform="translate(487 41)"><rect width="132" height="32" rx="5" fill="#fff" /><text x="66" y="21" textAnchor="middle" fill="#446581" fontSize="12">Офис · 08:48</text></g>
          <g className="habitus-map__now" transform="translate(43 172)"><rect width="134" height="32" rx="5" fill="#fff" /><text x="67" y="21" textAnchor="middle" fill="#846544" fontSize="12">Садик · 07:55</text></g>
          <g className="habitus-map__future" transform="translate(172 508)"><rect width="155" height="32" rx="5" fill="#fff" /><text x="77" y="21" textAnchor="middle" fill="#846544" fontSize="12">Школа · маткласс</text></g>
          <g transform="translate(505 511)"><rect width="130" height="32" rx="5" fill="#fff" /><text x="65" y="21" textAnchor="middle" fill="#846544" fontSize="12">Работа · 08:35</text></g>
          {[ [382,330], [551,82], [565,497] ].map(([x,y]) => <circle key={x} cx={x} cy={y} r="6" fill="#fff" stroke="#52736d" strokeWidth="3" />)}
        </g>
      </svg>
      <div className="habitus-map__caption"><span>Маршруты вашей семьи</span><span>Схема района</span></div>
      <div className="habitus-map__legend"><span><i />Пешком + транспорт</span><span><i />На машине</span></div>
    </div>
  );
}

function ApartmentDrawing() {
  return <svg viewBox="0 0 320 200" aria-label="Схематичный фасад выбранного дома" role="img">
    <rect width="320" height="200" fill="#dfe7e8" />
    <path d="M0 174 H320 V200 H0Z" fill="#c8d6cf" />
    <path d="M70 175 V43 H218 V175Z" fill="#eef0eb" />
    <path d="M218 43 L261 64 V175 H218Z" fill="#b6c6c6" />
    <path d="M70 43 L113 24 H261 L218 43Z" fill="#d1dad6" />
    {Array.from({length: 20}, (_,i) => <rect key={i} x={84+i%5*26} y={58+Math.floor(i/5)*27} width="13" height="18" fill={i===12 ? "#c4a46d" : "#799396"} />)}
    <path d="M125 175 V153 H162 V175" fill="#466467" />
    <g fill="#789480"><circle cx="43" cy="142" r="25" /><circle cx="282" cy="152" r="22" /></g>
    <g stroke="#62796b" strokeWidth="3"><path d="M43 148 V185 M282 157 V185" /></g>
  </svg>;
}

export function FourthCaseStub({ sectionRef, screenRef }: FourthCaseStubProps) {
  const [future, setFuture] = useState(false);
  const [tab, setTab] = useState<"life" | "mortgage">("life");
  const [saved, setSaved] = useState(false);
  const monthlyRate = 0.14 / 12;
  const payment = Math.round(8_800_000 * monthlyRate / (1 - Math.pow(1 + monthlyRate, -240)));
  return (
    <section ref={sectionRef} className="case-four-stub" aria-label="Кейс 04. Habitus — жильё под вашу жизнь" aria-hidden="true" inert>
      <div ref={screenRef} className="habitus-screen">
        <header className="habitus-topbar">
          <a href="#habitus-home" className="habitus-brand" onClick={(event) => { event.preventDefault(); setTab("life"); }}>habitus<span>Место для вашей жизни</span></a>
          <span className="habitus-demo">Кейс 04 / Демонстрационный сценарий</span>
          <span className="habitus-profile">А + М<span>Семья из трёх человек</span></span>
        </header>
        <div className="habitus-content" id="habitus-home">
          <div className="habitus-intro"><div><p>Подборка для вашей семьи / Квартира 03</p><h2>Здесь складывается ваш день.</h2></div><button className="habitus-save" aria-pressed={saved} onClick={() => setSaved(!saved)}>{saved ? "✓ В сравнении" : "+ В сравнение"}</button></div>
          <article className="habitus-property">
            <div className="habitus-property__visual"><ApartmentDrawing /><span>Вариант из подборки</span></div>
            <div className="habitus-property__description"><span>Жилой квартал «Тихий парк»</span><h3>3-комнатная, 74 м²</h3><p>Кухня-гостиная и две спальни · 6 этаж из 12</p><div className="habitus-property__tags"><span>Двор без машин</span><span>Парк рядом</span><span>Место для детской</span></div></div>
            <div className="habitus-property__price"><strong>12 800 000 ₽</strong><span>Все объекты и суммы — пример</span><button onClick={() => setTab("mortgage")}>Разобрать ипотеку ↗</button></div>
          </article>
          <div className="habitus-tabs" role="tablist" aria-label="Разбор квартиры">
            <button id="habitus-life-tab" role="tab" aria-selected={tab === "life"} aria-controls="habitus-life" onClick={() => setTab("life")}>Жизнь в этом доме <span>01</span></button>
            <button id="habitus-mortgage-tab" role="tab" aria-selected={tab === "mortgage"} aria-controls="habitus-mortgage" onClick={() => setTab("mortgage")}>Ипотека и льготы <span>02</span></button>
            <span>Смотрим дальше квадратных метров</span>
          </div>
          <div id="habitus-life" role="tabpanel" aria-labelledby="habitus-life-tab" hidden={tab !== "life"} className="habitus-life">
            <FamilyMap future={future} />
            <aside className="habitus-routine">
              <div className="habitus-period" aria-label="Период жизни"><button aria-pressed={!future} onClick={() => setFuture(false)}>Сейчас</button><button aria-pressed={future} onClick={() => setFuture(true)}>Через год</button></div>
              <h3>{future ? "Дом тот же. Жизнь меняется." : "Обычный вторник."}</h3>
              <p>{future ? "Учитываем школу заранее, чтобы снова не менять адрес." : "У каждого свой маршрут. Здесь они сходятся."}</p>
              <div className="habitus-journey"><span className="habitus-person">А</span><div><strong>Алексей <small>без машины</small></strong><p>Дом → пешком → метро → офис</p><span>38 минут · к 09:00 успеваете</span></div></div>
              <div className="habitus-journey habitus-journey--car"><span className="habitus-person">М</span><div><strong>Мария <small>на машине</small></strong><p>{future ? "Дом → школа → работа" : "Дом → детский сад → работа"}</p><span>{future ? "Новый маршрут · 32 минуты" : "Садик к 08:00 · работа в 08:35"}</span></div></div>
              <div className="habitus-next"><span>{future ? "Следующий этап" : "С учётом будущего"}</span><strong>{future ? "Школа с математическим классом" : "Через год — в первый класс"}</strong><p>{future ? "12 минут пешком. Условия поступления и наличие мест нужно подтвердить." : "Рядом есть школа. Программу и условия поступления проверяем отдельно."}</p></div>
              <p className="habitus-footnote">Время в пути иллюстративное. Это пример сценария, а не расчёт по реальным адресам.</p>
            </aside>
          </div>
          <div id="habitus-mortgage" role="tabpanel" aria-labelledby="habitus-mortgage-tab" hidden={tab !== "mortgage"} className="habitus-mortgage">
            <div className="habitus-finance"><p>Покупка без белых пятен</p><h3>Понятно, сколько.<br />Понятно, на каких условиях.</h3><div className="habitus-payment"><strong>{payment.toLocaleString("ru-RU")} ₽<small> / месяц</small></strong><span>Аннуитетный платёж в учебном примере</span></div><dl><div><dt>Первый взнос</dt><dd>4 000 000 ₽</dd></div><div><dt>Сумма кредита</dt><dd>8 800 000 ₽</dd></div><div><dt>Срок / условная ставка</dt><dd>20 лет / 14%</dd></div></dl><p className="habitus-footnote">Не предложение банка. Без страховки и дополнительных расходов. Ставка задана для демонстрации расчёта.</p></div>
            <div className="habitus-conditions"><h3>Что нужно проверить</h3><p>Отделяем расчёт от права на льготу.</p><article><span>01</span><div><strong>Семейная программа</strong><p>Возраст детей, требования к объекту и действующие правила программы.</p><small>Нужны данные семьи и актуальные условия</small></div></article><article><span>02</span><div><strong>Условия выбранного банка</strong><p>Полная стоимость кредита, страховка и изменение ставки при отказе от услуг.</p><small>Нужен документ с условиями</small></div></article><article><span>03</span><div><strong>Льготы и первый взнос</strong><p>Возможность использовать сертификаты и сочетать доступные меры поддержки.</p><small>Нужно подтвердить право и совместимость</small></div></article><div className="habitus-condition-note">В демонстрации льготы не подтверждены. Решение появляется после проверки данных и документов.</div></div>
          </div>
          <footer className="habitus-footer"><span>Жильё под жизнь. Сейчас и на следующий её этап.</span><span>{saved ? "1 квартира в сравнении" : "Habitus / Сценарий семьи"}</span></footer>
        </div>
      </div>
    </section>
  );
}

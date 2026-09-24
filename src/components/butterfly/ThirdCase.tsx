import type { RefObject } from "react";

type ThirdCaseProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

const history = [
  { title: "ТЗ проектора.docx", detail: "Веб-поиск товаров для ТЗ", active: true },
  { title: "ТЗ проектора.docx", detail: "Найдено 10 товаров" },
  { title: "ТЗ проектора.docx", detail: "Анализ требований" },
  { title: "ТЗ проектора.docx", detail: "Найдено 10 товаров" },
];

export function ThirdCase({ sectionRef }: ThirdCaseProps) {
  return (
    <section ref={sectionRef} className="case-three" aria-label="Кейс поиска товаров по техническому заданию">
      <div className="case-three__frame">
        <div className="case-three__rail" aria-hidden="true">
          <span className="case-three__mark">T<span /></span>
          <span className="case-three__rail-icon">▢</span>
          <span className="case-three__rail-icon is-active">◧</span>
          <span className="case-three__rail-icon">▱</span>
          <span className="case-three__rail-icon">♙</span>
        </div>
        <aside className="case-three__history" aria-label="История поиска">
          <div className="case-three__history-head"><strong>История</strong><span>＋</span></div>
          <div className="case-three__search">⌕ <span>Поиск...</span></div>
          <div className="case-three__history-list">
            {history.map((item, index) => (
              <div className={`case-three__history-item${item.active ? " is-active" : ""}`} key={index}>
                <span className="case-three__history-symbol">{index % 2 ? "⬡" : "◎"}</span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <time>{index === 0 ? "00:14" : "2 мар."}</time>
              </div>
            ))}
          </div>
        </aside>
        <div className="case-three__workspace">
          <div className="case-three__project-index">05 / КЕЙС 03 <span>ПОИСК ТОВАРОВ ПО ТЗ</span></div>
          <div className="case-three__heading">
            <span className="case-three__globe">◎</span>
            <div><h2>Результаты веб-поиска</h2><p>ТЗ проектора.docx</p></div>
            <span className="case-three__mode">◎ &nbsp; Веб-поиск</span>
          </div>
          <div className="case-three__stats">
            <div><span>⬡</span><small>ПОЗИЦИЙ</small><strong>1</strong></div>
            <div><span>▱</span><small>НАЙДЕНО</small><strong>10</strong></div>
            <div><span>◷</span><small>ВРЕМЯ</small><strong>66.4с</strong></div>
          </div>
          <div className="case-three__section-title"><span>✦</span> Найденные товары <b>1</b></div>
          <div className="case-three__result-head"><span className="case-three__result-number">1</span><div><strong>Проектор</strong><small>✓ &nbsp; Найдено 10 товаров</small></div><span className="case-three__best">ЛУЧШИЙ<br /><strong>1 079 880 ₽</strong></span><span className="case-three__collapse">⌃</span></div>
          <div className="case-three__result-card"><div className="case-three__card-top"><span className="case-three__match">⊖ &nbsp; Возможно · 62%</span><strong>1 079 880 ₽</strong></div><h3>Проекторы Epson L серии</h3><p>Яндекс Маркет</p><div className="case-three__tags"><span>контрастность: 2500000</span><span>технология проектора: 3LCD</span><span>яркость: 6000 лм</span><span>+2</span></div><div className="case-three__card-foot"><span>⌄ &nbsp; Подробнее</span><span>Перейти ↗</span></div></div>
          <div className="case-three__result-card case-three__result-card--secondary"><div className="case-three__card-top"><span className="case-three__match">⊖ &nbsp; Возможно · 41%</span><strong>Цена не указана</strong></div><h3>Проектор для переговорных комнат</h3><p>Яндекс Маркет</p></div>
          <div className="case-three__input">♧ &nbsp; Уточните детали... <span>↑</span></div>
        </div>
      </div>
    </section>
  );
}

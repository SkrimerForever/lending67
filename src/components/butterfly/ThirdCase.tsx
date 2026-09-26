import type { RefObject } from "react";
import { BidflowScreens } from "./BidflowScreens";
import { CaseGrass } from "./CaseGrass";

type ThirdCaseProps = {
  sectionRef: RefObject<HTMLElement | null>;
};

const priorities = [
  {
    status: "СРОЧНО", deadline: "ДО 27 ИЮЛ., 16:00", title: "Решить по заявке до 16:00",
    text: "В требованиях к вакуумной станции остаётся одно неподтверждённое значение по предельному давлению.",
    action: "Проверить требование", tone: "urgent",
  },
  {
    status: "НУЖНА ПРОВЕРКА", deadline: "ДО 29 ИЮЛ., 11:00", title: "Сверить предложенный аналог",
    text: "Для сухого насоса найден близкий SKU, но материал уплотнений указан только в приложении заказчика.",
    action: "Открыть сопоставление", tone: "review",
  },
  {
    status: "ИЗМЕНЕНИЕ", deadline: "БЕЗ СРОКА", title: "Появилось разъяснение заказчика",
    text: "Срок поставки увеличен с 45 до 60 календарных дней. Остальные условия извещения не изменились.",
    action: "Прочитать изменение", tone: "change",
  },
];

export function ThirdCase({ sectionRef }: ThirdCaseProps) {
  return (
    <section ref={sectionRef} className="case-three" aria-label="Bidflow — обзор рабочего пространства">
      <div className="case-three__chapter" aria-hidden="true"><span>ИЗБРАННЫЕ ПРОЕКТЫ</span><span>03 / BIDFLOW</span></div>
      <CaseGrass />
      <CaseGrass variant="trailing" />
      <div className="case-three__copy">
        <p className="case-three__copy-label"><span>03</span> BIDFLOW</p>
        <h2><span>От потока закупок —</span><span className="case-three__copy-accent">к решению</span><span>об участии.</span></h2>
        <p className="case-three__copy-description">Система отбирает подходящие тендеры, сопоставляет требования и выделяет вопросы, которые требуют внимания.</p>
        <div className="case-three__copy-foot"><span>Тендерная аналитика</span><span>Отбор / Сопоставление / Решение</span></div>
      </div>
      <div className="case-three__caption" aria-hidden="true"><span>01 / СИГНАЛЬНЫЙ ЦЕНТР</span><span>ОБЗОР РАБОЧЕГО ПРОСТРАНСТВА</span></div>
      <div className="case-three__frame">
        <aside className="bidflow-sidebar">
          <div className="bidflow-brand">Bidflow</div>
          <nav className="bidflow-nav" aria-label="Разделы Bidflow">
            <span className="is-active bidflow-nav-overview">Обзор</span>
            <span className="bidflow-nav-tenders">Тендеры</span>
          </nav>
          <div className="bidflow-demo"><strong>Демо-режим</strong><p>Учебные данные рабочего пространства</p></div>
        </aside>
        <div className="bidflow-app">
          <header className="bidflow-topbar">
            <div><span>Рабочее пространство</span><strong className="bidflow-breadcrumb"><span className="bidflow-crumb-overview">Обзор</span><span className="bidflow-crumb-tenders">Тендеры</span></strong></div>
            <span className="bidflow-disabled">Поиск пока недоступен</span>
          </header>
          <div className="bidflow-content bidflow-overview">
            <main className="bidflow-main">
              <section className="bidflow-signal" aria-label="Сигнальный центр">
                <header className="bidflow-signal-heading">
                  <div><div className="bidflow-eyebrow">ОБЗОР ПОТОКА</div><h2>Сигнальный центр</h2></div>
                  <span className="bidflow-updated">Обновлено 27 июля в 08:42</span>
                </header>
                <div className="bidflow-signal-body">
                  <div className="bidflow-metrics">
                    <div><i aria-hidden="true" /><strong>1 847</strong><span>проверено</span></div>
                    <div><i aria-hidden="true" /><strong>5</strong><span>отобрано</span></div>
                    <div className="is-gold"><i aria-hidden="true" /><strong>2</strong><span>требуют решения</span></div>
                  </div>
                  <div className="bidflow-monitor">
                    <div><span className="bidflow-label">МОНИТОРИНГ</span><p className="bidflow-running">Работает</p></div>
                    <div><span className="bidflow-label">БЛИЖАЙШИЙ КРИТИЧЕСКИЙ СРОК</span><strong>27 июл., 16:00</strong><small>Решить по заявке до 16:00</small></div>
                  </div>
                </div>
                <footer className="bidflow-checks">
                  <span className="bidflow-label">ПОСЛЕДНИЕ ПРОВЕРКИ</span>
                  {[['08:42', '412', '2'], ['06:18', '563', '1'], ['00:36', '872', '2']].map(([time, checked, selected]) => (
                    <div key={time}><time>{time}</time><span>{checked} проверено<small>{selected} отобрано</small></span></div>
                  ))}
                </footer>
              </section>
              <div className="bidflow-search">
                <div><h3>Поиск конкретной закупки</h3><p>По реестровому номеру, заказчику или ключевым словам.</p></div>
                <span className="bidflow-disabled">Пока недоступен</span>
              </div>
              <section className="bidflow-tenders" aria-label="Рекомендуемые тендеры">
                <header><div><div className="bidflow-eyebrow">ПОДБОРКА СИСТЕМЫ</div><h3>Рекомендуемые тендеры</h3></div><span>5 закупок</span></header>
                <table>
                  <colgroup><col className="bidflow-col-name" /><col className="bidflow-col-match" /><col /><col /></colgroup>
                  <thead><tr><th>ЗАКУПКА</th><th>СОВПАДЕНИЕ</th><th>НМЦК</th><th>СРОК ПОДАЧИ</th></tr></thead>
                  <tbody><tr>
                    <td><small>№ 0373100031926000142</small><h4>Поставка вакуумной насосной станции для исследовательского стенда</h4><p>Федеральный научно-исследовательский центр</p></td>
                    <td><span className="bidflow-match">Проверить</span><strong>18/19 требований</strong><p>BDF-VP 320/12</p><span className="bidflow-unknown">1 неизвестное</span><p>Высокое совпадение: требуется проверка</p></td>
                    <td className="bidflow-number">18 473 620 ₽</td><td className="bidflow-number">30 июл., 09:00</td>
                  </tr></tbody>
                </table>
              </section>
            </main>
            <aside className="bidflow-priority" aria-label="Требует внимания">
              <header><div><div className="bidflow-eyebrow">ПРИОРИТЕТ</div><h3>Требует внимания</h3></div><span>3 пункта</span></header>
              <div className="bidflow-priority-list">
                {priorities.map((item) => (
                  <article className={`bidflow-priority-item is-${item.tone}`} key={item.title}>
                    <div className="bidflow-priority-meta"><span>{item.status}</span><time>{item.deadline}</time></div>
                    <h4>{item.title}</h4><p>{item.text}</p><span className="bidflow-priority-action">{item.action} · недоступно</span>
                  </article>
                ))}
              </div>
            </aside>
          </div>
          <BidflowScreens />
        </div>
        <div className="bidflow-demo-click bidflow-demo-click--nav" aria-hidden="true" />
        <div className="bidflow-demo-click bidflow-demo-click--row" aria-hidden="true" />
        <div className="bidflow-demo-flash" aria-hidden="true" />
        <div className="bidflow-demo-cursor" aria-hidden="true"><svg viewBox="0 0 24 30"><defs><linearGradient id="bidflow-cursor-surface" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#dfe8e2" /></linearGradient></defs><path d="M2.5 1.5 2.5 24.5 8.3 19.2 12.7 28 16.2 26.3 11.9 17.7 21.5 17.4Z" /></svg></div>
      </div>
    </section>
  );
}

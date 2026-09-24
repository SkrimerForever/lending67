import type { RefObject } from "react";

type SecondCaseStubProps = {
  veilRef: RefObject<HTMLDivElement | null>;
  stubRef: RefObject<HTMLElement | null>;
};

const positions = [
  { ticker: "GMKN", quantity: "300", price: "155,00", result: "+2 200", positive: true, trend: "M0 29 L12 27 23 28 35 20 45 22 54 17 66 21 78 13 89 18 101 12 112 16 120 11" },
  { ticker: "MOEX", quantity: "1 200", price: "230,00", result: "+3 400", positive: true, trend: "M0 27 L12 30 23 24 35 28 46 20 57 25 69 19 81 23 93 14 105 17 120 9" },
  { ticker: "PIKK", quantity: "400", price: "600,00", result: "−1 200", positive: false, trend: "M0 12 L12 14 23 11 35 19 47 15 59 22 71 18 83 26 95 21 108 31 120 34" },
  { ticker: "PLZL", quantity: "50", price: "3 000,00", result: "+2 450", positive: true, trend: "M0 28 L12 25 24 27 36 21 48 24 60 19 72 22 84 15 96 18 108 12 120 16" },
  { ticker: "ROSN", quantity: "300", price: "450,00", result: "+1 750", positive: true, trend: "M0 27 L12 24 24 29 36 22 48 26 60 19 72 21 84 15 96 20 108 12 120 16" },
  { ticker: "VTBR", quantity: "700", price: "75,00", result: "−670", positive: false, trend: "M0 13 L12 17 24 14 36 20 48 18 60 24 72 19 84 27 96 25 108 30 120 32" },
  { ticker: "TATN", quantity: "100", price: "650,00", result: "+520", positive: true, trend: "M0 29 L12 26 24 28 36 24 48 26 60 20 72 23 84 18 96 21 108 15 120 17" },
  { ticker: "NVTK", quantity: "50", price: "1 200,00", result: "−310", positive: false, trend: "M0 12 L12 15 24 14 36 21 48 18 60 20 72 25 84 22 96 27 108 25 120 31" },
];

const watchlist = [
  { ticker: "SBER", price: "312,45", change: "+1.41%", positive: true, trend: "M0 31 L10 23 18 26 27 14 36 20 44 18 53 24 62 20 72 29 81 25 90 31 101 17 110 21 120 13" },
  { ticker: "GAZP", price: "142,88", change: "−1.60%", positive: false, trend: "M0 16 L10 23 20 19 30 26 40 18 50 24 60 20 70 26 80 17 90 19 101 15 111 22 120 30" },
  { ticker: "LKOH", price: "7 268,50", change: "+1.23%", positive: true, trend: "M0 26 L11 25 21 27 30 24 40 29 50 25 61 28 71 24 81 30 91 27 101 31 111 23 120 12" },
  { ticker: "YNDX", price: "4 192,00", change: "+2.49%", positive: true, trend: "M0 30 L10 27 20 31 30 29 40 28 50 31 60 25 70 28 81 20 91 24 101 19 111 22 120 10" },
];

export function SecondCaseStub({ veilRef, stubRef }: SecondCaseStubProps) {
  return (
    <>
      <div ref={veilRef} className="walk-light-veil" aria-hidden="true" />
      <section ref={stubRef} className="case-two" aria-label="Кейс MOEX Bot">
        <div className="moex-layout">
          <div className="moex-terminal" aria-label="Визуализация интерфейса MOEX Bot">
            <aside className="moex-sidebar">
              <div className="moex-sidebar__brand"><span><strong>MOEX Bot</strong><small>CONSOLE / v0.4.1</small></span></div>
              <span className="moex-sidebar__heading">WORKSPACE</span>
              <nav aria-label="Разделы консоли">
                {[["⌂", "Overview", ""], ["⌕", "Perception", "500"], ["◁", "Reasoning", "1,000"], ["≡", "Action", "12"], ["▱", "Portfolio", "8"], ["♢", "Risk", "T2"], ["›_", "Logs", "1,000"], ["▤", "RAG", ""], ["⊙", "Experiments", ""], ["▽", "Methodology", ""]].map(([icon, label, count]) => <div className={`${label === "Overview" ? "is-active " : ""}${label === "Action" ? "moex-sidebar__action " : ""}${label === "Reasoning" ? "moex-sidebar__reasoning" : ""}`} key={label}><span className="moex-sidebar__icon">{icon}</span><span>{label}</span><small>{count}</small></div>)}
              </nav>
              <div className="moex-sidebar__footer"><span className="moex-sidebar__online" /> supabase realtime <span>4 ch</span><div>◯ guest</div></div>
            </aside>
            <div className="moex-dashboard">
              <div className="moex-dashboard__bar"><span>WORKSPACE <b>›</b> <span className="moex-crumb"><strong className="moex-crumb-overview">Overview</strong><strong className="moex-crumb-trades">Action · trades</strong><strong className="moex-crumb-trace">Trace · MOEX</strong></span></span><span>MOEX session CLOSED&nbsp; · &nbsp;DEMO SNAPSHOT</span></div>
              <div className="moex-heartbeats"><span><i /> SYSTEM ACTIVE</span><span>LAST DECISION&nbsp; 15:02:50</span><span>SNAPSHOT&nbsp; 14:59:54</span></div>
              <div className="moex-dashboard__summary">
                <div className="moex-panel moex-portfolio"><div className="moex-panel__head">PORTFOLIO VALUE <span>DEMO / 14:59:54</span></div><div className="moex-portfolio__content"><span>TOTAL VALUE</span><strong>1 173 620 ₽</strong><div className="moex-portfolio__change">▲ +9 210 ₽ <span>+0.79%</span> <em>today</em></div><div className="moex-portfolio__split"><span>CASH<strong>148 620 ₽</strong><em>12.7%</em></span><span>STOCKS<strong>1 025 000 ₽</strong><em>87.3% · 8 tickers</em></span></div></div></div>
                <div className="moex-panel moex-risk"><div className="moex-panel__head">RISK TIER</div><div><strong>2</strong><span>LOW<br />/10</span></div></div>
                <div className="moex-panel moex-open"><div className="moex-panel__head">OPEN POSITIONS</div><div><strong>8</strong><span>tickers held</span><em>TRADES TODAY<strong>12</strong><small>▲ 7 buy · ▼ 5 sell</small></em></div></div>
              </div>
              <div className="moex-dashboard__main">
                <div className="moex-panel moex-chart"><div className="moex-panel__head">INTRADAY P&amp;L <span>1D&nbsp; 1W&nbsp; All</span></div><div className="moex-chart__plot"><div className="moex-chart__axis"><span>1.175M</span><span>1.17M</span><span>1.165M</span><span>1.16M</span></div><svg viewBox="0 0 700 240" preserveAspectRatio="none" aria-hidden="true"><path className="moex-chart__grid" d="M0 30H700 M0 90H700 M0 150H700 M0 210H700" /><path className="moex-chart__fill" d="M0 205 H75 V190 H150 V176 H225 V185 H300 V145 H375 V132 H450 V115 H525 V145 H600 V78 H655 V39 H700 V50 V240 H0Z" /><path className="moex-chart__line" d="M0 205 H75 V190 H150 V176 H225 V185 H300 V145 H375 V132 H450 V115 H525 V145 H600 V78 H655 V39 H700 V50" /></svg><div className="moex-chart__times"><span>13:34</span><span>13:51</span><span>14:08</span><span>14:25</span><span>14:42</span><span>14:59</span></div></div></div>
                <div className="moex-panel moex-activity"><div className="moex-panel__head">RECENT TRADES <span>VIEW ALL ↗</span></div><div className="moex-activity__rows">{[["14:41", "BUY", "MOEX", "240 × 229,80"], ["14:16", "SELL", "PIKK", "80 × 602,40"], ["13:52", "BUY", "ROSN", "40 × 448,20"], ["13:35", "SELL", "VTBR", "120 × 75,10"]].map(([time, side, ticker, value]) => <div key={time}><time>{time}</time><span className={side === "BUY" ? "is-buy" : "is-sell"}>{side}</span><strong>{ticker}</strong><small>{value}</small></div>)}</div><div className="moex-activity__note">7 BUY <span>·</span> 5 SELL TODAY</div></div>
              </div>
              <div className="moex-dashboard__bottom">
                <div className="moex-panel moex-dashboard__footer">
                  <div className="moex-panel__head">OPEN POSITIONS <span>8 HELD</span></div>
                  <div className="moex-open-list">{positions.map(({ ticker, quantity, price, result, positive, trend }) => <div className={positive ? "is-positive" : "is-negative"} key={ticker}><strong>{ticker}</strong><span>×{quantity} · {price} ₽</span><svg viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><path d={trend} /></svg><em>{result} ₽</em></div>)}</div>
                </div>
                <div className="moex-panel moex-watchlist">
                  <div className="moex-panel__head">WATCHLIST <span>4 TICKERS</span></div>
                  <div className="moex-watchlist__rows">{watchlist.map(({ ticker, price, change, positive, trend }) => <div className={positive ? "is-positive" : "is-negative"} key={ticker}><strong>{ticker}</strong><svg viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true"><path d={trend} /></svg><span>{price}</span><em>{change}</em></div>)}</div>
                </div>
              </div>
              <div className="moex-trades-view" aria-hidden="true">
              <div className="moex-trades-view__toolbar"><span className="moex-trades-view__search">⌕&nbsp; Search by ticker or order ID</span><span>SIDE</span><span className="moex-trades-view__filter">BUY</span><span className="moex-trades-view__filter">SELL</span><span>STATUS</span><span className="moex-trades-view__filter">FILLED</span><span className="moex-trades-view__count">12 trades · today</span></div>
              <div className="moex-trades-view__columns"><span>TIME</span><span>TICKER</span><span>SIDE</span><span>QTY</span><span>PRICE</span><span>STATUS</span></div>
              <div className="moex-trades-view__rows">
                {[["14:41:08", "MOEX", "BUY", "240", "229,80", "FILLED"], ["14:16:32", "PIKK", "SELL", "80", "602,40", "FILLED"], ["13:52:17", "ROSN", "BUY", "40", "448,20", "FILLED"], ["13:35:49", "VTBR", "SELL", "120", "75,10", "FILLED"], ["12:48:03", "SBER", "BUY", "60", "311,90", "FILLED"], ["11:36:22", "PLZL", "BUY", "5", "2 986,00", "FILLED"], ["10:22:14", "GMKN", "SELL", "30", "154,80", "FILLED"], ["10:04:51", "MOEX", "BUY", "120", "228,60", "FILLED"]].map(([time, ticker, side, quantity, price, status], index) => <div className={`moex-trades-view__row${index === 0 ? " moex-trades-view__selected" : ""}`} key={time}><time>{time}</time><strong>{ticker}</strong><span className={side === "BUY" ? "is-buy" : "is-sell"}>{side}</span><span>{quantity}</span><span>{price}</span><span className="is-filled">{status}</span></div>)}
              </div>
                <div className="moex-trades-view__foot">ACTION LOG <span>·</span> ORDERS RECORDED <span>·</span> 7 BUY / 5 SELL</div>
              </div>
              <div className="moex-trace-view" aria-hidden="true">
                <div className="moex-trace-view__hero">
                  <div><span>ТРЕЙС РЕШЕНИЯ · 14:41:08</span><strong>Почему бот купил MOEX</strong><small>240 акций по 229,80 ₽ · заявка исполнена</small></div>
                  <div className="moex-trace-view__confidence"><span>УВЕРЕННОСТЬ МОДЕЛИ</span><strong>0,82</strong><small>Порог входа — 0,68</small></div>
                </div>
                <div className="moex-trace-view__body">
                  <div className="moex-trace-view__steps">
                    <div className="moex-trace-step"><span className="moex-trace-step__number">01</span><div><h3>Рыночный сигнал</h3><div className="moex-trace-step__row"><span>Рост за 20 минут</span><strong>+0,46%</strong></div><div className="moex-trace-step__row"><span>Объём к среднему</span><strong>1,34×</strong></div><div className="moex-trace-step__row"><span>Спред</span><strong>0,07%</strong></div></div></div>
                    <div className="moex-trace-step"><span className="moex-trace-step__number">02</span><div><h3>Оценка модели</h3><div className="moex-trace-step__row"><span>Тренд подтверждён</span><strong>ДА</strong></div><div className="moex-trace-step__row"><span>Уверенность</span><strong>0,82 / 1,00</strong></div><div className="moex-trace-step__row"><span>Негативные новости</span><strong>НЕ НАЙДЕНЫ</strong></div></div></div>
                    <div className="moex-trace-step"><span className="moex-trace-step__number">03</span><div><h3>Риск и исполнение</h3><div className="moex-trace-step__row"><span>Сумма заявки</span><strong>55 152 ₽</strong></div><div className="moex-trace-step__row"><span>Доля после покупки</span><strong>23,5% / лимит 25%</strong></div><div className="moex-trace-step__row"><span>Уровень риска</span><strong>2 / 10 · низкий</strong></div></div></div>
                  </div>
                  <div className="moex-trace-view__aside">
                    <div className="moex-trace-card"><span>ОБЪЯСНЕНИЕ РЕШЕНИЯ</span><h3>Сигнал подтвердился</h3><p>Цена росла вместе с объёмом торгов. Спред оставался узким, негативных новостей не было. Размер покупки уложился в лимиты позиции и риска.</p></div>
                    <div className="moex-trace-card moex-trace-card--checks"><span>ПРОВЕРКИ ПЕРЕД СДЕЛКОЙ</span><div><i /> Ликвидность <strong>Пройдена</strong></div><div><i /> Лимит позиции <strong>Пройден</strong></div><div><i /> Риск-бюджет <strong>Соблюдён</strong></div></div>
                  </div>
                </div>
                <div className="moex-trace-view__foot">ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ <span>·</span> MOEX BOT</div>
              </div>
            </div>
            <div className="moex-demo-flash" aria-hidden="true" />
            <div className="moex-demo-click" aria-hidden="true" />
            <div className="moex-demo-cursor" aria-hidden="true"><svg viewBox="0 0 24 30"><defs><linearGradient id="moex-cursor-surface" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#dfe8e2" /></linearGradient></defs><path d="M2.5 1.5 2.5 24.5 8.3 19.2 12.7 28 16.2 26.3 11.9 17.7 21.5 17.4Z" /></svg></div>
          </div>
          <div className="moex-copy">
            <span className="moex-copy__index">04 / КЕЙС 02</span>
            <div className="moex-copy__body">
              <span className="moex-copy__eyebrow">MOEX BOT</span>
              <h2>РЫНОК В ДАННЫХ.<br />РЕШЕНИЕ В СИСТЕМЕ.</h2>
            </div>
            <div className="moex-copy__footer">
              <p>Торговый бот и консоль: от рыночного сигнала до исполнения сделки и объяснения решения модели.</p>
              <span>АЛГОТРЕЙДИНГ · АНАЛИТИКА · MOEX</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

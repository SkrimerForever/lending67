const tenders = [
  { id: "0373100031926000142", title: "Поставка вакуумной насосной станции для исследовательского стенда", customer: "ФГБУ «Институт прикладной криофизики» · ИНН 7724873169", model: "BDF-VP 320/12", product: "Вакуумная станция с пластинчато-роторным форвакуумным насосом", match: "Совпали 18 обязательных параметров, включая быстроту откачки и тип фланца.", price: "18 473 620,00 ₽", deadline: "30 июл., 09:00", venue: "РТС-тендер", risk: "Существенные риски не выявлены" },
  { id: "0173200001426000169", title: "Поставка турбомолекулярных насосов и контроллеров для измерительного комплекса", customer: "ГБУ «Лаборатория точных измерений Восток» · ИНН 7719384526", model: "BDF-TM 700", product: "Турбомолекулярный насос с контроллером", match: "Подтверждены 21 характеристика насоса и совместимость штатного контроллера.", price: "9 356 712,40 ₽", deadline: "6 авг., 12:00", venue: "ЭТП", risk: "Срок поставки 45 дней требует подтверждения склада." },
];

export function BidflowScreens() {
  return <>
    <section className="bidflow-register bidflow-demo-view" aria-label="Реестр тендеров">
      <header className="bidflow-register-heading"><div><div className="bidflow-eyebrow">АКТИВНЫЕ ЗАКУПКИ</div><h2>Реестр тендеров</h2></div><div><p>5 закупок в работе</p><span className="bidflow-updated">Обновлено 27 июля в 08:42</span></div></header>
      <div className="bidflow-register-toolbar"><div className="bidflow-filter-tabs"><span className="is-selected">К участию <small>2</small></span><span>Нужно проверить <small>2</small></span><span>Не подходят <small>1</small></span><span>Все <small>5</small></span></div><div className="bidflow-register-search"><span>Поиск по реестру</span><div>Номер, заказчик, ИНН или оборудование</div></div></div>
      <div className="bidflow-register-columns"><span>РЕШЕНИЕ И ЗАКУПКА</span><span>ЛУЧШЕЕ СООТВЕТСТВИЕ</span><span>НМЦК</span><span>ПОДАЧА ДО</span><span>РИСК</span></div>
      {tenders.map((tender, i) => <article className={`bidflow-register-row${i === 0 ? " bidflow-demo-target" : ""}`} key={tender.id}>
        <div className="bidflow-register-purchase"><span className="bidflow-eligible">К участию</span><small>{tender.id} / 44-ФЗ / Москва</small><h3 className={i === 0 ? "bidflow-demo-tender-title" : undefined}>{tender.title}</h3><p>{tender.customer}</p></div>
        <div><strong className="bidflow-register-model">{tender.model}</strong><p className="bidflow-register-product">{tender.product}</p><p>{tender.match}</p></div>
        <div className="bidflow-register-price">{tender.price}</div><div><strong className="bidflow-register-date">{tender.deadline}</strong><small>{tender.venue}</small></div><p>{tender.risk}</p>
      </article>)}
    </section>
    <section className="bidflow-detail bidflow-demo-view" aria-label="Условия участия в тендере">
      <div className="bidflow-detail-tabs"><span>Обзор</span><span>Комплект поставки</span></div>
      <div className="bidflow-detail-layout"><div className="bidflow-decision">
        <section className="bidflow-decision-intro"><div className="bidflow-eyebrow">РЕШЕНИЕ ПО УЧАСТИЮ</div><h2>Участие возможно с условием</h2><p>Из 9 обязательных позиций 8 закрыты каталогом. Для комплекта переходников позиции №7 требуется внешний поставщик.</p></section>
        <div className="bidflow-decision-metrics">{[['9', 'позиций'], ['8', 'закрыты каталогом'], ['1', 'внешний поставщик'], ['2', 'требования не подтверждены']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
        <section className="bidflow-conditions"><div className="bidflow-eyebrow">ТРЕБУЕТ ВНИМАНИЯ</div><h2>Условия до подачи заявки</h2>
          <article><h3>Позиция №7 требует внешнего поставщика</h3><p>В каталоге нет полного комплекта переходников с требуемыми фланцами ISO-K 100 и CF 63.</p><p><span>Что сделать:</span> До подачи заявки нужно подтвердить поставщика, цену и срок комплекта.</p></article>
          <article><h3>Материал уплотнений подтверждён не для всех позиций</h3><p>В приложении заказчика нет однозначного требования для двух вспомогательных узлов.</p><p><span>Что сделать:</span> Проверить приложение №3 и запросить разъяснение при необходимости.</p></article>
        </section>
      </div><aside className="bidflow-contract">
        <div className="bidflow-eyebrow">КОММЕРЧЕСКИЕ УСЛОВИЯ</div><h3>Обязательства по контракту</h3>
        <dl><div><dt>ОБЕСПЕЧЕНИЕ ЗАЯВКИ</dt><dd>184 736 ₽</dd></div><div><dt>ОБЕСПЕЧЕНИЕ ИСПОЛНЕНИЯ</dt><dd>923 681 ₽</dd></div><div><dt>МЕСТО ПОСТАВКИ</dt><dd>Москва, территория исследовательского комплекса заказчика</dd></div><div><dt>СРОК ПОСТАВКИ</dt><dd>60 календарных дней с даты заключения контракта</dd></div></dl>
        <section className="bidflow-documents"><div className="bidflow-eyebrow">ГОТОВНОСТЬ ДОКУМЕНТОВ</div><h3>Рабочий комплект</h3><div><header>Техническое задание <span>Доступен</span></header><p>Исходный документ доступен для просмотра и скачивания</p></div><div><header>Отчёт Bidflow <span>Сформирован</span></header><p>Системный Excel сформирован по текущей закупке</p></div></section>
      </aside></div>
    </section>
  </>;
}

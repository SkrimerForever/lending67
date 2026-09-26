"use client";

import { useImperativeHandle, useRef, type RefObject } from "react";

export type FamilyRoute = "all" | "alex" | "maria";

const courtyards = [
  [44, 25, 134, 86], [216, 24, 132, 90], [390, 20, 125, 88], [555, 25, 128, 87],
  [48, 166, 122, 84], [212, 169, 140, 86], [391, 164, 124, 90], [558, 169, 133, 86],
  [40, 314, 136, 99], [217, 316, 127, 92], [553, 316, 140, 88],
  [45, 473, 130, 92], [218, 473, 130, 90], [391, 474, 127, 90], [556, 476, 133, 89],
  [47, 625, 128, 90], [220, 622, 126, 86], [390, 624, 128, 88], [554, 623, 133, 86],
];

export type MapPlayback = { update(progress: number, reducedMotion: boolean): void };

export function FamilyMap({ future, route, playbackRef }: { future: boolean; route: FamilyRoute; playbackRef: RefObject<MapPlayback | null> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(playbackRef, () => {
    let tracks: Array<{ path: SVGPathElement; dot: SVGGElement; length: number }> | null = null;
    return { update(progress, reducedMotion) {
      const root = rootRef.current;
      if (!root) return;
      const ramp = (a: number, b: number) => {
        const t = Math.max(0, Math.min(1, (progress - a) / (b - a)));
        return t * t * (3 - 2 * t);
      };
      const amounts = [ramp(0.025, 0.175), ramp(0.225, 0.375), ramp(0.435, 0.575)];
      const next = ramp(0.395, 0.445);
      root.style.setProperty("--future-mix", String(next));
      root.style.setProperty("--office-arrival", String(ramp(0.15, 0.185)));
      root.style.setProperty("--nursery-arrival", String(ramp(0.265, 0.295) * (1 - next)));
      root.style.setProperty("--school-arrival", String(ramp(0.48, 0.515)));
      root.style.setProperty("--work-arrival", String(Math.max(ramp(0.35, 0.38) * (1 - next), ramp(0.55, 0.58))));
      root.style.setProperty("--map-scale", String(reducedMotion ? 1 : 1 + 0.045 * ramp(0, 0.13) - 0.045 * ramp(0.53, 0.60)));
      root.style.setProperty("--map-pan", `${reducedMotion ? 0 : -1.2 * ramp(0, 0.18) + 2.4 * ramp(0.2, 0.35) - 1.2 * ramp(0.43, 0.58)}%`);
      if (!tracks) tracks = ["alex", "now", "school"].map(name => {
        const path = root.querySelector<SVGPathElement>(`[data-travel-path="${name}"]`)!;
        const dot = root.querySelector<SVGGElement>(`[data-traveler="${name}"]`)!;
        return { path, dot, length: path.getTotalLength() };
      });
      tracks.forEach(({path, dot, length}, i) => {
        const t = amounts[i];
        const point = path.getPointAtLength(length * t);
        dot.setAttribute("transform", `translate(${point.x} ${point.y})`);
        const envelope = Math.min(1, t * 12) * Math.min(1, (1 - t) * 12);
        dot.style.opacity = String(reducedMotion ? 0 : envelope * (i === 1 ? 1 - next : 1));
      });
    }};
  }, []);
  return <div ref={rootRef} className="habitus-map" data-future={future} data-route={route}>
    <svg viewBox="0 0 900 760" role="img" aria-label="Условная карта: дом, маршруты семьи на работу, в садик и школу">
      <defs>
        <pattern id="habitus-trees" width="21" height="23" patternUnits="userSpaceOnUse"><circle cx="8" cy="10" r="3.4" fill="#b9c6b6" opacity=".65" /></pattern>
        <pattern id="habitus-water" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 7h14" stroke="#cbd4d1" strokeWidth=".6" /></pattern>
      </defs>
      <rect width="900" height="760" fill="#e9ece7" />
      <path d="M795-30C664 96 838 222 742 356S824 561 766 800H950V-30Z" fill="#d4ded9" />
      <path d="M795-30C664 96 838 222 742 356S824 561 766 800H950V-30Z" fill="url(#habitus-water)" />
      <g fill="none" stroke="#fafbf8" strokeWidth="22"><path d="M0 139H734M0 284H748M0 443H744M0 594H779M194 0V760M369 0V760M535 0V760M713 0V760" /></g>
      <g fill="none" stroke="#dce1db" strokeWidth="1"><path d="M0 130H734M0 148H734M185 0V760M203 0V760M360 0V760M378 0V760" /></g>
      <g fill="#f4f5f1" stroke="#cdd3ca" strokeWidth="1.2">
        {courtyards.map(([x,y,w,h],i) => <g key={i}><rect x={x} y={y} width={w} height={h} rx="2" /><rect x={x+13} y={y+15} width={w-26} height={h-30} rx="2" fill="#e4e9df" /><path d={`M${x+w/2} ${y+h-15}v15`} stroke="#e9ece7" strokeWidth="20" /></g>)}
      </g>
      <path d="M400 320h109v90H400Z" fill="#d0dcc8" /><path d="M400 320h109v90H400Z" fill="url(#habitus-trees)" />
      <path d="M784 445Q840 440 886 471V700H812Q840 568 784 445" fill="url(#habitus-trees)" />
      <g fill="#929e92" fontSize="9" letterSpacing="2.5" fontFamily="Arial, sans-serif">
        <text x="62" y="143">ПАРКОВАЯ</text><text x="394" y="289">ТИХИЙ ПРОСПЕКТ</text><text x="66" y="448">САДОВАЯ УЛИЦА</text><text x="549" y="599">УЛИЦА СОСЕН</text>
        <text x="456" y="367" textAnchor="middle" fontSize="8">СКВЕР</text><text x="843" y="283" transform="rotate(78 843 283)" fill="#98aaa0">НАБЕРЕЖНАЯ</text>
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="habitus-route habitus-route--alex" d="M275 361H369V139H621V69" stroke="#fff" strokeWidth="8" pathLength="1" />
        <path className="habitus-route habitus-route--alex" d="M275 361H369V139H621V69" stroke="#52705a" strokeWidth="3" pathLength="1" data-travel-path="alex" />
        <path className="habitus-route habitus-route--maria habitus-now" d="M275 361V284H194V207H111V284H194V594H618V659" stroke="#fff" strokeWidth="8" pathLength="1" />
        <path className="habitus-route habitus-route--maria habitus-now" d="M275 361V284H194V207H111V284H194V594H618V659" stroke="#8b9788" strokeWidth="3" pathLength="1" data-travel-path="now" />
        <path className="habitus-route habitus-route--maria habitus-future" d="M275 361V443H369V520H452V594H618V659" stroke="#fff" strokeWidth="8" pathLength="1" />
        <path className="habitus-route habitus-route--maria habitus-future" d="M275 361V443H369V520H452V594H618V659" stroke="#8b9788" strokeWidth="3" pathLength="1" data-travel-path="school" />
      </g>
      <rect x="240" y="327" width="71" height="63" rx="2" fill="#6e8468" stroke="#fff" strokeWidth="2" />
      <rect x="253" y="340" width="45" height="36" rx="1" fill="#c5d1bb" />
      <g className="habitus-map-labels" fontFamily="Arial, sans-serif" fontSize="12">
        <g transform="translate(231 399)"><rect width="92" height="34" rx="17" fill="#334836" /><text x="46" y="22" textAnchor="middle" fill="#fff">Ваш дом</text></g>
        <g className="habitus-arrival habitus-arrival--office" transform="translate(557 66)"><circle cx="64" cy="0" r="6" fill="#52705a" stroke="#fff" strokeWidth="3" /><rect x="0" y="-49" width="130" height="35" rx="7" fill="#fff" /><text x="65" y="-27" textAnchor="middle" fill="#455444">Офис · 08:48</text></g>
        <g className="habitus-arrival habitus-arrival--nursery" transform="translate(111 207)"><circle r="6" fill="#8b9788" stroke="#fff" strokeWidth="3" /><rect x="-68" y="-49" width="136" height="35" rx="7" fill="#fff" /><text x="0" y="-27" textAnchor="middle" fill="#455444">Садик · 07:55</text></g>
        <g className="habitus-arrival habitus-arrival--school" transform="translate(452 520)"><circle r="6" fill="#8b9788" stroke="#fff" strokeWidth="3" /><rect x="-77" y="-49" width="154" height="35" rx="7" fill="#fff" /><text x="0" y="-27" textAnchor="middle" fill="#455444">Школа · маткласс</text></g>
        <g className="habitus-arrival habitus-arrival--work" transform="translate(618 659)"><circle r="6" fill="#8b9788" stroke="#fff" strokeWidth="3" /><rect x="-68" y="19" width="136" height="35" rx="7" fill="#fff" /><text x="0" y="41" textAnchor="middle" fill="#455444">Работа · 08:35</text></g>
      </g>
      {["alex", "now", "school"].map(name => <g key={name} data-traveler={name} className="habitus-traveler" opacity="0"><circle r="14" fill="#52705a" fillOpacity=".12" /><circle r="6" fill="#52705a" stroke="#fff" strokeWidth="3" /></g>)}
    </svg>
    <span className="habitus-map-scale">200 м <span /></span>
    <span className="habitus-map-disclaimer">Схема района · маршруты иллюстративные</span>
  </div>;
}

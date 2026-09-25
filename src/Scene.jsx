import React, {useEffect, useRef} from 'react';
import {stores} from './stores';
import {storeStatus, sunPosition} from './hours';

// A panorama of the Bosphorus in scene units (1600 × 520). Every generated detail uses a fixed seed
// so the prerendered HTML and the hydrated client produce identical markup.
let seed = 7;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const round = value => Math.round(value * 10) / 10;

const hangers = [];
for (let x = 544; x < 608; x += 16) hangers.push([x, round(334 - (x - 526) * 184 / 84)]);
for (let x = 626; x < 990; x += 16) { const t = (x - 610) / 380; hangers.push([x, round(150 + 636 * t * (1 - t))]); }
for (let x = 1008; x < 1070; x += 16) hangers.push([x, round(150 + (x - 990) * 184 / 84)]);

const windows = [];
for (const [x, y, w, h] of [[322,222,40,166],[366,270,26,118],[398,160,44,228],[446,256,30,132],[496,254,32,74],[480,338,70,48],[1212,214,26,134],[1242,182,30,166],[1276,228,24,120],[1314,326,34,60],[1470,352,58,34],[14,356,108,30]]) {
  for (let wy = y + 6; wy < y + h - 6; wy += 10) for (let wx = x + 5; wx < x + w - 6; wx += 8) {
    if (rand() < .34) windows.push({x:wx, y:wy, flicker:rand() < .12, delay:round(-rand() * 5)});
  }
}

const starField = Array.from({length:90}, () => ({x:round(rand() * 1600), y:round(rand() * 560), r:round(.6 + rand() * 1.3), twinkle:rand() < .4, delay:round(-rand() * 3.4)}));

const wavePath = (y, amp, period) => { let d = `M-40 ${y}`; for (let x = -40; x < 1640; x += period) d += `q${period / 4} ${-amp} ${period / 2} 0t${period / 2} 0`; return d; };
const waves = [[418,3,60,''],[436,2.5,48,' slow'],[458,3.5,72,' rev'],[480,3,56,''],[502,4,80,' slow'],[516,3,64,' rev']].map(([y, amp, period, variant]) => ({d:wavePath(y, amp, period), variant, delay:round(-rand() * 9)}));

// The red line runs along the European quay, over the bridge deck and down the Anatolian quay.
const RAIL = 'M-60 397H458C500 397 494 336 536 336H1064C1106 336 1100 397 1142 397H1660';
const cubicY = (x, [p0, p1, p2, p3]) => {
  let best = p0;
  for (let i = 0; i <= 200; i++) {
    const t = i / 200, u = 1 - t;
    const point = [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
    if (Math.abs(point[0] - x) < Math.abs(best[0] - x)) best = point;
  }
  return round(best[1]);
};
const railY = x => {
  if (x <= 458 || x >= 1142) return 397;
  if (x >= 536 && x <= 1064) return 336;
  return x < 536 ? cubicY(x, [[458,397],[500,397],[494,336],[536,336]]) : cubicY(x, [[1064,336],[1106,336],[1100,397],[1142,397]]);
};

// Where each store sits on the skyline: a mall roof, towers along Büyükdere, Akasya's towers, Bağdat Caddesi.
const pinSpots = {istinyepark:[68,337], ozdilekpark:[342,204], mecidiyekoy:[420,122], cevahir:[512,246], akasya:[1257,174], bagdat:[1499,344]};
const pins = stores.map((store, i) => { const [x, y] = pinSpots[store.id]; return {store, i, x, y, stopY:railY(x)}; });

export function TrainSprite() {
  return <svg width="0" height="0" className="sprite" aria-hidden="true" focusable="false">
    <symbol id="train-sym" viewBox="-38 -9 76 18">
      <path d="M-35 -7.5H25Q36-7.5 36 0Q36 7.5 25 7.5H-35Q-37 7.5-37 5.5V-5.5Q-37-7.5-35-7.5Z" fill="#fff" stroke="#000" strokeWidth="2" />
      {[-31, -19, -7, 5].map(x => <rect key={x} x={x} y="-4.5" width="9" height="4.5" rx="1" fill="#000" />)}
      <path d="M18-4.5H27Q31-4.5 32.5-1V0H18Z" fill="#000" />
      <rect x="-35" y="2.5" width="62" height="2" fill="#e60000" />
    </symbol>
  </svg>;
}

export function Stars() {
  return <svg className="stars" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    {starField.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} className={s.twinkle ? 'tw' : undefined} style={{animationDelay:`${s.delay}s`}} />)}
  </svg>;
}

export default function Scene({now, nearestId}) {
  const svgRef = useRef(null);
  const tipRef = useRef(null);
  const nowRef = useRef(now);
  nowRef.current = now;
  const sun = sunPosition(now);

  // The train loops along the line; open stores ping as it passes their stop.
  useEffect(() => {
    const svg = svgRef.current, rail = svg.querySelector('.rail'), train = svg.querySelector('.scene-train');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const length = rail.getTotalLength();
    const place = d => {
      const p = rail.getPointAtLength(d), q = rail.getPointAtLength(Math.min(length, d + 3));
      train.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI).toFixed(2)})`);
    };
    if (reduce) { place(length / 2); train.style.opacity = 1; svg.pauseAnimations?.(); return undefined; }
    const pinEls = [...svg.querySelectorAll('.pin')];
    const stops = pinEls.map(g => {
      const x = Number(g.dataset.x);
      let best = 0;
      for (let d = 0; d <= length; d += 4) if (Math.abs(rail.getPointAtLength(d).x - x) < Math.abs(rail.getPointAtLength(best).x - x)) best = d;
      return best;
    });
    const speed = length / 15000;
    let raf = 0, last = 0, dist = 0, started = false, visible = true;
    const frame = ts => {
      if (!visible || document.hidden) { raf = 0; last = 0; return; }
      if (last) {
        const prev = dist;
        dist = (dist + (ts - last) * speed) % length;
        pinEls.forEach((g, i) => {
          if (prev < stops[i] && dist >= stops[i] && !g.classList.contains('is-closed')) { g.classList.add('ping'); setTimeout(() => g.classList.remove('ping'), 1150); }
        });
        place(dist);
      }
      last = ts;
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && started && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const timer = setTimeout(() => { started = true; train.style.opacity = 1; start(); }, 2300);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start(); });
    observer.observe(svg);
    document.addEventListener('visibilitychange', start);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener('visibilitychange', start); };
  }, []);

  // Mouse users get a label on each store; the list below remains the accessible version.
  const showTip = (event, store) => {
    const tip = tipRef.current, dot = event.currentTarget.querySelector('.pin-dot').getBoundingClientRect(), box = tip.parentElement.getBoundingClientRect();
    const open = nowRef.current === null || storeStatus(store, nowRef.current).open;
    tip.textContent = `${store.short}, ${open ? 'şu an açık' : 'şu an kapalı'}`;
    tip.style.left = `${dot.left + dot.width / 2 - box.left}px`;
    tip.style.top = `${dot.top - box.top}px`;
    tip.classList.add('is-on');
  };
  const goToStore = id => {
    const target = document.getElementById(`magaza-${id}`);
    if (target) target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center'});
  };

  return <div className="scene-wrap">
    <div className="pin-tip" ref={tipRef} aria-hidden="true" />
    <svg className="scene" ref={svgRef} viewBox="0 0 1600 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false" style={sun ? {'--sun':sun.low ? '#ff6a33' : '#ffc53d'} : undefined}>
      <g className="sun" transform={sun ? `translate(${sun.x} ${sun.y})` : 'translate(800 600)'} style={{opacity:sun ? 1 : 0}}><circle className="sun-glow" r="78" /><circle className="sun-glow" r="52" /><circle className="sun-disc" r="30" /></g>
      <g className="moon" transform="translate(1250 86)"><path d="M0-22A22 22 0 0 0 0 22A30 30 0 0 1 0-22Z" /></g>

      <path className="far fade" d="M0 318C90 290 170 300 250 286C340 270 420 282 500 300C560 312 600 330 640 372H0Z" />
      <path className="far fade" d="M930 372C990 330 1050 300 1130 288C1210 276 1260 236 1330 222C1400 208 1470 214 1600 246V372Z" />
      <rect className="sea" x="0" y="370" width="1600" height="150" />
      <line className="horizon" x1="560" y1="372" x2="1040" y2="372" />
      <g transform="translate(650 372)"><path className="ship" d="M0 0H38L34 5H4ZM9 0V-6H24V0ZM14-6V-11H18V-6Z" /></g>

      {/* Mid ground: Çamlıca hill with its mosque and TV tower, distant towers on the European side. */}
      <g className="mid fade">
        <rect x="236" y="302" width="18" height="70" /><rect x="530" y="282" width="16" height="90" /><rect x="552" y="304" width="12" height="68" />
        <path d="M1462 372L1466 134H1474L1478 372Z" /><path d="M1457 134Q1470 116 1483 134V150Q1470 162 1457 150Z" /><rect x="1468.5" y="54" width="3" height="68" /><rect x="1463" y="100" width="14" height="4" />
        <rect x="1300" y="222" width="84" height="150" /><rect x="1316" y="206" width="52" height="16" /><path d="M1314 208A28 28 0 0 1 1370 208Z" /><rect x="1341" y="168" width="2" height="14" />
        <path d="M1298 226A15 12 0 0 1 1328 226Z" /><path d="M1356 226A15 12 0 0 1 1386 226Z" />
        {[[1283,142,116],[1292,160,136],[1388,160,136],[1397,142,116]].map(([x, top, tip]) => <React.Fragment key={x}><rect x={x} y={top} width="5" height={372 - top} /><path d={`M${x - 1} ${top}L${x + 2.5} ${tip}L${x + 6} ${top}Z`} /></React.Fragment>)}
      </g>

      <g className="bridge">
        <g className="ink rise late">
          {[603, 983].map(x => <React.Fragment key={x}><rect x={x} y="146" width="14" height="254" /><rect x={x - 5} y="146" width="24" height="8" /><rect x={x - 5} y="226" width="24" height="6" /><rect x={x - 5} y="292" width="24" height="6" /></React.Fragment>)}
          <rect x="526" y="332" width="548" height="9" />
        </g>
        <g>{hangers.map(([x, y], i) => <line key={x} className="hanger" x1={x} y1={y} x2={x} y2="332" style={{'--d':i}} />)}</g>
        <path className="cable" pathLength="1" d="M526 334L610 150Q800 470 990 150L1074 334" />
        <circle className="beacon" cx="610" cy="142" r="3.2" /><circle className="beacon" cx="990" cy="142" r="3.2" />
      </g>

      {/* European shore: İstinyePark, a mosque, Galata Tower and the Büyükdere towers. */}
      <g className="ink rise">
        <rect x="0" y="366" width="16" height="26" />
        <path d="M14 392V352Q68 322 122 352V392Z" />
        <rect x="140" y="352" width="100" height="40" /><rect x="160" y="336" width="60" height="18" /><path d="M158 338A32 32 0 0 1 222 338Z" /><rect x="189" y="296" width="2" height="12" />
        <path d="M142 354A16 14 0 0 1 166 354Z" /><path d="M214 354A16 14 0 0 1 238 354Z" />
        {[130, 244].map(x => <React.Fragment key={x}><rect x={x} y="262" width="6" height="130" /><path d={`M${x - 1} 262L${x + 3} 236L${x + 7} 262Z`} /><rect x={x - 2} y="300" width="10" height="3" /></React.Fragment>)}
        <rect x="266" y="298" width="28" height="94" /><rect x="262" y="294" width="36" height="6" /><rect x="268" y="284" width="24" height="12" /><path d="M264 286L280 246L296 286Z" /><rect x="260" y="372" width="40" height="20" />
        <rect x="300" y="360" width="22" height="32" />
        <rect x="322" y="214" width="40" height="178" /><rect x="334" y="204" width="16" height="12" />
        <rect x="366" y="262" width="26" height="130" />
        <path d="M398 392V152L420 120L442 152V392Z" /><rect x="419" y="88" width="2" height="34" />
        <path d="M446 392V252L476 234V392Z" />
        <rect x="480" y="330" width="70" height="62" /><rect x="496" y="246" width="32" height="86" />
        <path d="M0 390H566L580 404H0Z" />
      </g>
      <circle className="beacon" cx="420" cy="88" r="2.6" />

      {/* Anatolian shore: Üsküdar, Akasya's towers, Bağdat Caddesi's trees. */}
      <g className="ink rise">
        <rect x="1048" y="366" width="28" height="26" /><rect x="1078" y="354" width="22" height="38" /><rect x="1102" y="372" width="34" height="20" />
        <rect x="1136" y="362" width="44" height="30" /><path d="M1140 364A18 18 0 0 1 1176 364Z" /><rect x="1184" y="312" width="5" height="80" /><path d="M1183 312L1186.5 292L1190 312Z" />
        <rect x="1204" y="350" width="106" height="42" /><rect x="1212" y="206" width="26" height="146" /><rect x="1242" y="174" width="30" height="178" /><rect x="1276" y="220" width="24" height="132" />
        <rect x="1314" y="318" width="34" height="74" /><rect x="1352" y="340" width="24" height="52" /><rect x="1380" y="354" width="36" height="38" />
        <circle cx="1428" cy="372" r="14" /><circle cx="1452" cy="366" r="16" /><rect x="1470" y="344" width="58" height="48" /><rect x="1466" y="340" width="66" height="6" />
        <circle cx="1546" cy="368" r="15" /><circle cx="1574" cy="372" r="12" /><circle cx="1598" cy="366" r="15" />
        <path d="M1034 404L1046 390H1600V404Z" />
      </g>
      <circle className="beacon" cx="1470" cy="54" r="2.6" />
      <g>{windows.map((w, i) => <rect key={i} className={w.flicker ? 'win tw' : 'win'} x={w.x} y={w.y} width="3.4" height="4.4" style={{animationDelay:`${w.delay}s`}} />)}</g>

      <g>{waves.map((w, i) => <path key={i} className={`wave${w.variant}`} d={w.d} style={{animationDelay:`${w.delay}s`}} />)}</g>
      <g className="glint" transform={`translate(${sun ? sun.x : 800} 0)`}>{[[404,40],[418,28],[432,44],[448,22],[464,34],[482,18]].map(([y, w]) => <rect key={y} x={-w / 2} y={y} width={w} height="2.4" rx="1.2" />)}</g>

      {/* Maiden's Tower on its rock. */}
      <g transform="translate(0 16)">
        <g className="ink"><path d="M1150 472Q1190 460 1230 472Z" /><rect x="1170" y="446" width="40" height="26" /><rect x="1184" y="420" width="14" height="28" /><path d="M1181 421L1191 402L1201 421Z" /><rect x="1190.5" y="394" width="1.2" height="10" /></g>
        <rect className="win" x="1176" y="452" width="4" height="5" /><rect className="win" x="1188" y="452" width="4" height="5" /><rect className="win" x="1200" y="452" width="4" height="5" /><rect className="win tw" x="1189" y="428" width="4" height="6" />
      </g>

      {/* A city-lines ferry crossing between the shores. */}
      <g transform="translate(0 488)"><g className="ferry-move"><g className="ferry ferry-bob">
        <path className="wake" d="M-70-2Q-92 2-118 0M-74 5Q-104 10-140 7" />
        <path className="ink" d="M-60-14H60L50 0H-52Z" />
        <rect className="deck" x="-50" y="-31" width="94" height="17" />
        <rect className="deck" x="-36" y="-42" width="62" height="11" />
        {[-44, -32, -20, -8, 4, 16, 28].map(x => <rect key={x} className="fw" x={x} y="-26" width="6" height="7" />)}
        <rect className="deck" x="-6" y="-58" width="14" height="16" /><rect className="ink" x="-6" y="-58" width="14" height="5" />
      </g></g></g>

      <g transform="translate(780 200)"><g className="gulls">
        <path className="gull" d="M-12 0Q-6-7 0 0Q6-7 12 0" />
        <g transform="translate(44 -20) scale(.8)"><path className="gull g2" d="M-12 0Q-6-7 0 0Q6-7 12 0" /></g>
        <g transform="translate(78 8) scale(.9)"><path className="gull g3" d="M-12 0Q-6-7 0 0Q6-7 12 0" /></g>
      </g></g>

      <path className="rail" pathLength="1" d={RAIL} />
      <g>{pins.map(p => <circle key={p.store.id} className="rail-stop" cx={p.x} cy={p.stopY} r="5" style={{'--i':p.i}} />)}</g>
      <g className="scene-train" transform="translate(800 336)" style={{opacity:0}}><use href="#train-sym" x="-38" y="-9" width="76" height="18" /></g>
      <g>
        {pins.map(p => {
          const closed = now !== null && !storeStatus(p.store, now).open;
          return <g key={p.store.id} className={`pin${closed ? ' is-closed' : ''}${p.store.id === nearestId ? ' is-nearest' : ''}`} transform={`translate(${p.x} ${p.y})`} data-x={p.x}
            onPointerEnter={event => showTip(event, p.store)} onPointerLeave={() => tipRef.current.classList.remove('is-on')} onClick={() => goToStore(p.store.id)}>
            <line className="pin-drop" x1="0" y1="10" x2="0" y2={round(p.stopY - p.y - 7)} style={{'--i':p.i}} />
            <g className="pin-body" style={{'--i':p.i}}>
              <circle className="pin-ring" r="7" /><circle className="pin-ring r2" r="7" /><circle className="pin-flash" r="7" /><circle className="pin-dot" r="7" />
            </g>
            <circle r="18" fill="transparent" />
          </g>;
        })}
      </g>
    </svg>
  </div>;
}

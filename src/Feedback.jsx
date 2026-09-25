import React, {useEffect, useRef, useState} from 'react';
import {stores, contact} from './stores';
import Icon, {ZMark, Z_PATH} from './Icon';
import {useRevealed, useOnScreen, prefersReducedMotion} from './motion';
import {FEEDBACK_ENDPOINT, ratings, topics, COMMENT_MAX, TRAP_FIELD} from './feedback-fields';

// Face parameters per mood: mouth (x1 y1 cx lowerY x2 y2 upperY), left brow (x1 y1 cx cy x2 y2), eye height, cheek opacity.
// While the mouth's two control points match it is one red stroke; pulled apart it opens into a filled smile.
const faces = {
  idle:[124,220,160,236,196,220,236, 104,134,122,128,140,134, 14,0],
  1:[124,236,160,204,196,236,204, 104,142,122,138,142,127, 13,0],
  2:[126,231,160,215,194,231,215, 104,138,122,136,142,132, 14,0],
  3:[126,225,160,225,194,225,225, 104,136,122,136,142,136, 14,0],
  4:[118,216,160,246,202,216,246, 104,132,122,125,142,132, 13,.16],
  5:[108,208,160,264,212,208,222, 104,128,122,116,142,128, 11,.32],
};
const r1 = value => Math.round(value * 10) / 10;
const mouthPath = f => `M${r1(f[0])} ${r1(f[1])}Q${r1(f[2])} ${r1(f[3])} ${r1(f[4])} ${r1(f[5])}Q${r1(f[2])} ${r1(f[6])} ${r1(f[0])} ${r1(f[1])}Z`;
const browPath = (f, mirror) => { const x = v => r1(mirror ? 320 - v : v); return `M${x(f[7])} ${r1(f[8])}Q${x(f[9])} ${r1(f[10])} ${x(f[11])} ${r1(f[12])}`; };

// Confetti for a five: dashes, dots and rings thrown out from the face.
const burstPieces = Array.from({length:18}, (_, i) => {
  const angle = i / 18 * Math.PI * 2 + (i % 3) * .12, distance = 128 + (i % 4) * 16;
  return {x:Math.round(Math.cos(angle) * distance), y:Math.round(Math.sin(angle) * distance), r:(i % 2 ? 1 : -1) * (120 + i * 17), kind:i % 3};
});
const HEART = 'M0 4C0-2-9-2-9 4C-9 9 0 13 0 16C0 13 9 9 9 4C9-2 0-2 0 4Z';

function Face({mood, burst, wink, hearts}) {
  const svgRef = useRef(null);
  const shape = useRef(faces.idle);
  const revealed = useRevealed(svgRef, .4);
  const onScreen = useOnScreen(svgRef);

  // Morph to the new mood with a slight overshoot; attributes are written directly, not re-rendered per frame.
  useEffect(() => {
    const svg = svgRef.current;
    const [browL, browR] = svg.querySelectorAll('.fb-brow'), eyes = svg.querySelectorAll('.fb-eye'), cheeks = svg.querySelectorAll('.fb-cheek'), mouth = svg.querySelector('.fb-mouth');
    const apply = f => {
      mouth.setAttribute('d', mouthPath(f));
      browL.setAttribute('d', browPath(f));
      browR.setAttribute('d', browPath(f, true));
      eyes.forEach(eye => eye.setAttribute('ry', r1(Math.max(2, f[13]))));
      cheeks.forEach(cheek => cheek.setAttribute('fill-opacity', Math.round(Math.min(1, Math.max(0, f[14])) * 100) / 100));
    };
    const from = shape.current, to = faces[mood];
    if (from === to) return undefined;
    if (prefersReducedMotion()) { shape.current = to; apply(to); return undefined; }
    let raf = 0;
    const start = performance.now();
    const step = time => {
      const t = Math.min(1, (time - start) / 520), eased = 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
      shape.current = t === 1 ? to : from.map((value, i) => value + (to[i] - value) * eased);
      apply(shape.current);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mood]);

  // Mouse users are watched: the eyes follow the pointer while the face is on screen.
  useEffect(() => {
    if (!onScreen || prefersReducedMotion() || !matchMedia('(hover:hover)').matches) return undefined;
    const svg = svgRef.current, eyes = svg.querySelector('.fb-eyes');
    let raf = 0, x = 0, y = 0;
    const look = () => {
      raf = 0;
      const box = svg.getBoundingClientRect();
      const dx = x - (box.left + box.width / 2), dy = y - (box.top + box.height * .57);
      const distance = Math.hypot(dx, dy) || 1, reach = Math.min(7, distance * 320 / box.width / 40);
      eyes.setAttribute('transform', `translate(${(dx / distance * reach).toFixed(1)} ${(dy / distance * reach).toFixed(1)})`);
    };
    const move = event => { x = event.clientX; y = event.clientY; if (!raf) raf = requestAnimationFrame(look); };
    addEventListener('pointermove', move, {passive:true});
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, [onScreen]);

  const f = faces.idle;
  return <svg ref={svgRef} className={`fb-face${revealed ? ' in-view' : ''}${onScreen ? '' : ' is-offscreen'}${wink ? ' is-wink' : ''}`} data-mood={mood} viewBox="0 0 320 320" aria-hidden="true" focusable="false">
    <g className="fb-rings">{[0, 1, 2].map(k => <circle key={k} cx="160" cy="182" r="106" style={{'--k':k}} />)}</g>
    <g className="fb-cloud"><g className="fb-cloud-body">
      <g className="fb-rain">{[192, 212, 232, 252].map((x, k) => <line key={x} x1={x} y1="72" x2={x - 4} y2="84" style={{'--k':k}} />)}</g>
      <path className="fb-cloud-shape" d="M180 62H258A18 18 0 0 0 256 26A26 26 0 0 0 208 20A20 20 0 0 0 180 62Z" />
    </g></g>
    <path className="fb-head" pathLength="1" d="M54 182A106 106 0 1 1 266 182A106 106 0 1 1 54 182Z" />
    <g className="fb-features">
      <circle className="fb-cheek" cx="98" cy="208" r="14" fillOpacity={f[14]} />
      <circle className="fb-cheek" cx="222" cy="208" r="14" fillOpacity={f[14]} />
      <path className="fb-brow" d={browPath(f)} />
      <path className="fb-brow" d={browPath(f, true)} />
      <g className="fb-eyes"><ellipse className="fb-eye" cx="124" cy="166" rx="11" ry={f[13]} /><ellipse className="fb-eye" cx="196" cy="166" rx="11" ry={f[13]} /></g>
      <path className="fb-mouth" d={mouthPath(f)} />
    </g>
    {burst > 0 && <g key={burst} className="fb-burst">{burstPieces.map((p, i) => {
      const style = {'--x':`${p.x}px`, '--y':`${p.y}px`, '--r':`${p.r}deg`};
      if (p.kind === 0) return <rect key={i} className="p0" x="153" y="179.5" width="14" height="5" rx="2.5" style={style} />;
      return <circle key={i} className={`p${p.kind}`} cx="160" cy="182" r={p.kind === 1 ? 4 : 5} style={style} />;
    })}</g>}
    {hearts && <g className="fb-hearts">{[[118, 74], [160, 58], [202, 74]].map(([x, y], k) => <g key={x} transform={`translate(${x} ${y})`}><path d={HEART} style={{'--k':k}} /></g>)}</g>}
  </svg>;
}

const StepNumber = ({n}) => <span className="fb-num" aria-hidden="true"><span>{n}</span><Icon name="check" /></span>;

// After sending: a train carries the note from the visitor's stop to Zanes, then the board flips to thanks.
function Sent({rating, storeId, doneRef, onAgain}) {
  const from = stores.find(store => store.id === storeId);
  return <div className="fb-done" ref={doneRef} tabIndex={-1} aria-labelledby="fb-done-title">
    <svg className="fb-trip" viewBox="0 0 520 130" aria-hidden="true" focusable="false">
      <path className="fb-trip-rail" pathLength="1" d="M40 66H480" />
      <circle className="fb-trip-stop" cx="56" cy="66" r="13" />
      <text className="fb-trip-label" x="56" y="118">{from ? from.short : 'Siz'}</text>
      <circle className="fb-trip-ring" cx="466" cy="66" r="30" />
      <g transform="translate(440 40)"><g className="fb-trip-z"><rect width="52" height="52" rx="12" fill="#e60000" /><path d={Z_PATH} transform="scale(.8125)" fill="#fff" /></g></g>
      <text className="fb-trip-label" x="466" y="118">Zanes</text>
      <g className="fb-trip-train">
        <use href="#train-sym" x="-1" y="52.5" width="114" height="27" />
        <g className="fb-letter"><rect x="41" y="27" width="30" height="21" rx="3" /><path d="M43 29.5 56 39l13-9.5" /></g>
      </g>
    </svg>
    <h3 id="fb-done-title" className="fb-thanks"><span className="sr-only">Teşekkürler!</span><span className="flaps fb-flaps" aria-hidden="true">{[...'TEŞEKKÜRLER'].map((ch, k) => <b key={k} data-d={ch} style={{'--k':k}} />)}</span></h3>
    <p className="fb-done-note">{rating <= 2 ? 'Görüşünüz bize ulaştı. Daha iyisi için çalışacağız.' : 'Görüşünüz bize ulaştı. Yine bekleriz!'}</p>
    <button className="btn" type="button" onClick={onAgain}>Yeni geribildirim</button>
  </div>;
}

export default function Feedback() {
  const formRef = useRef(null), doneRef = useRef(null), refocus = useRef(false);
  const [ready, setReady] = useState(false);
  const [rating, setRating] = useState(null);
  const [preview, setPreview] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [picked, setPicked] = useState([]);
  const [comment, setComment] = useState('');
  const [state, setState] = useState('idle');
  const [burst, setBurst] = useState(0);

  // Browsers validate natively until hydration; afterwards the page explains a missing rating itself.
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (state === 'sent') {
      doneRef.current.focus({preventScroll:true});
      doneRef.current.scrollIntoView({behavior:prefersReducedMotion() ? 'auto' : 'smooth', block:'center'});
    }
    if (state === 'idle' && refocus.current) { refocus.current = false; formRef.current.querySelector('input[name="puan"]').focus(); }
  }, [state]);

  const choose = value => {
    if (value === 5 && rating !== 5) setBurst(count => count + 1);
    setRating(value);
    if (state === 'missing') setState('idle');
  };
  const toggle = topic => setPicked(list => list.includes(topic) ? list.filter(t => t !== topic) : [...list, topic]);
  const submit = async event => {
    event.preventDefault();
    if (state === 'sending') return;
    if (rating === null) { setState('missing'); formRef.current.querySelector('input[name="puan"]').focus(); return; }
    setState('sending');
    const trap = formRef.current.elements[TRAP_FIELD].value;
    try {
      const body = {puan:rating, magaza:storeId, konular:picked, yorum:comment.trim(), ...(trap ? {[TRAP_FIELD]:trap} : {})};
      const response = await fetch(FEEDBACK_ENDPOINT, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setState('sent');
    } catch {
      setState('error');
    }
  };
  const again = () => { refocus.current = true; setRating(null); setStoreId(null); setPicked([]); setComment(''); setState('idle'); };

  const sent = state === 'sent';
  const mood = sent ? (rating >= 3 ? 5 : 3) : preview ?? rating ?? 'idle';
  const question = rating === null || rating === 3 ? 'Neler öne çıktı?' : rating <= 2 ? 'Neyi düzeltelim?' : 'Neyi beğendiniz?';

  return <section className="section feedback" id="geribildirim" aria-labelledby="feedback-title">
    <div className="wrap split">
      <div className="fb-intro">
        <h2 id="feedback-title">Ziyaretiniz nasıldı?</h2>
        <p className="fb-note">Mağazamızdaki deneyiminizi birkaç dokunuşla anlatın. İyisini de kötüsünü de duymak istiyoruz.</p>
        <Face mood={mood} burst={burst} wink={sent && rating >= 3} hearts={sent && rating >= 4} />
      </div>
      {sent ? <Sent rating={rating} storeId={storeId} doneRef={doneRef} onAgain={again} /> :
      <form ref={formRef} className="fb-form" action={FEEDBACK_ENDPOINT} method="post" noValidate={ready} onSubmit={submit}>
        <input className="fb-trap" type="text" name={TRAP_FIELD} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <ol className="fb-steps">
          <li className={`fb-step${rating !== null ? ' is-done' : ''}`}>
            <StepNumber n={1} />
            <fieldset className={`rate${state === 'missing' ? ' is-missing' : ''}`} aria-describedby={state === 'missing' ? 'fb-missing' : undefined}>
              <legend className="fb-q">Genel olarak nasıldı?</legend>
              <div className="rate-line" style={{'--p':rating === null ? 0 : (rating - 1) / 4}}>
                <span className="rate-fill" aria-hidden="true" />
                {ratings.map((label, i) => <label key={label} className="rate-stop" onPointerEnter={() => setPreview(i + 1)} onPointerLeave={() => setPreview(null)}>
                  <input type="radio" name="puan" value={i + 1} checked={rating === i + 1} onChange={() => choose(i + 1)} required />
                  <span className="rate-marker" aria-hidden="true" />
                  <span className="rate-label">{label}</span>
                </label>)}
              </div>
              {state === 'missing' && <p className="fb-alert" id="fb-missing" role="alert">Önce bir puan seçin.</p>}
              {rating !== null && rating <= 2 && <p className="fb-sorry">Üzgünüz. İsterseniz hemen konuşalım: <a href={contact.phoneHref}>{contact.phone}</a></p>}
            </fieldset>
          </li>
          <li className={`fb-step${storeId ? ' is-done' : ''}`}>
            <StepNumber n={2} />
            <fieldset>
              <legend className="fb-q">Hangi mağazamıza uğradınız?</legend>
              <div className="chip-row">{stores.map(store => <label key={store.id} className="chip">
                <input type="radio" name="magaza" value={store.id} checked={storeId === store.id} onChange={() => setStoreId(store.id)} />
                <span className="chip-face">{store.short}</span>
              </label>)}</div>
            </fieldset>
          </li>
          <li className={`fb-step${picked.length ? ' is-done' : ''}`}>
            <StepNumber n={3} />
            <fieldset>
              <legend className="fb-q" key={question}>{question}</legend>
              <div className="chip-row">{topics.map(topic => <label key={topic} className="chip chip-topic">
                <input type="checkbox" name="konu" value={topic} checked={picked.includes(topic)} onChange={() => toggle(topic)} />
                <span className="chip-face"><Icon name="toggle" />{topic}</span>
              </label>)}</div>
            </fieldset>
          </li>
          <li className={`fb-step${comment.trim() ? ' is-done' : ''}`}>
            <StepNumber n={4} />
            <label className="fb-field">
              <span className="fb-q">Eklemek istediğiniz bir şey var mı?</span>
              <textarea name="yorum" rows={4} maxLength={COMMENT_MAX} value={comment} onChange={event => setComment(event.target.value)} placeholder="İsteğe bağlı" />
            </label>
          </li>
          <li className={`fb-step fb-last${state === 'sending' ? ' is-done' : ''}`}>
            <ZMark className="fb-end" />
            <button className="btn btn-primary fb-send" type="submit" aria-busy={state === 'sending'}><Icon name="send" />{state === 'sending' ? 'Gönderiliyor…' : 'Gönder'}</button>
            {state === 'error' && <p className="fb-alert" role="alert">Gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin ya da bizi arayın: <a href={contact.phoneHref}>{contact.phone}</a></p>}
          </li>
        </ol>
      </form>}
    </div>
  </section>;
}

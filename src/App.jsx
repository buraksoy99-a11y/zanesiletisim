import React, {useEffect, useRef, useState} from 'react';
import {stores, sides, contact} from './stores';
import Icon, {ZMark} from './Icon';
import Scene, {Stars, TrainSprite} from './Scene';
import {serviceArt, Metro25} from './Art';
import {useIstanbulMinutes, storeStatus, clockDigits, openSummary, skyPhase, distanceKm, formatDistance} from './hours';
import {useRevealed, useOnScreen, prefersReducedMotion} from './motion';

const navigation = [['#magazalar', 'Mağazalar'], ['#hizmetler', 'Hizmetler'], ['#hakkimizda', 'Hakkımızda'], ['#iletisim', 'İletişim']];

function Brand() {
  return <a className="brand" href="#" aria-label="Zanes İletişim ana sayfa"><ZMark /><span>Zanes İletişim</span></a>;
}

function Header() {
  return <header className="header">
    <div className="wrap header-inner">
      <Brand />
      <nav className="nav" aria-label="Ana gezinme">{navigation.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</nav>
      <a className="call" href={contact.phoneHref}><Icon name="phone" /><span className="call-long">{contact.phone}</span><span className="call-short">Ara</span></a>
    </div>
  </header>;
}

const geoMessages = {
  loading: 'Konumunuz alınıyor…',
  denied: 'Konum izni kapalı. Tarayıcı ayarlarından izin verip tekrar deneyin ya da aşağıdaki listeden seçin.',
  failed: 'Konumunuz bulunamadı. Aşağıdaki listeden size uygun mağazayı seçebilirsiniz.',
};

function useNearestStore() {
  const [geo, setGeo] = useState({state:'idle'});
  const locate = event => {
    // Without geolocation the link simply scrolls to the store list.
    if (!('geolocation' in navigator)) return;
    event.preventDefault();
    setGeo({state:'loading'});
    navigator.geolocation.getCurrentPosition(position => {
      const here = {lat:position.coords.latitude, lng:position.coords.longitude};
      const [nearest] = stores.map(store => ({store, km:distanceKm(here, store)})).sort((a, b) => a.km - b.km);
      setGeo({state:'done', id:nearest.store.id, text:`Size en yakın mağaza ${nearest.store.short}, yaklaşık ${formatDistance(nearest.km)}.`});
      const target = document.getElementById(`magaza-${nearest.store.id}`);
      if (target) {
        target.scrollIntoView({behavior:prefersReducedMotion() ? 'auto' : 'smooth', block:'center'});
        target.focus({preventScroll:true});
      }
    }, error => setGeo({state:error.code === 1 ? 'denied' : 'failed'}), {timeout:10000, maximumAge:300000});
  };
  const message = geo.state === 'done' ? geo.text : geoMessages[geo.state] || '';
  return {nearestId:geo.state === 'done' ? geo.id : null, busy:geo.state === 'loading', message, locate};
}

// The hero is a live panorama of the Bosphorus: its sky and store signals follow the Istanbul clock.
function Hero({finder, now}) {
  const ref = useRef(null);
  const onScreen = useOnScreen(ref);
  return <section ref={ref} className={`hero${onScreen ? '' : ' is-offscreen'}`} data-phase={skyPhase(now)} aria-labelledby="hero-title">
    <Stars />
    <div className="wrap hero-grid">
      <h1 id="hero-title"><span>İki yaka,</span> <span>altı mağaza.</span></h1>
      <div className="hero-side">
        <p className="lede">Zanes İletişim bir Vodafone Business Partner. Telefon, aksesuar ve tüm Vodafone işlemleriniz için size en yakın mağazamıza uğrayın.</p>
        <div className="actions">
          <a className="btn btn-primary" href="#magazalar" onClick={finder.locate} aria-busy={finder.busy}><Icon name="locate" />En yakın mağazayı bul</a>
          <a className="btn" href={contact.phoneHref}><Icon name="phone" />Bizi arayın</a>
        </div>
        <p className="geo-message" role="status">{finder.message}</p>
      </div>
    </div>
    <Scene now={now} nearestId={finder.nearestId} />
  </section>;
}

function Station({store, index, now, nearest}) {
  const status = now === null ? null : storeStatus(store, now);
  return <li className={`station${nearest ? ' is-nearest' : ''}`} id={`magaza-${store.id}`} tabIndex={-1} style={{'--i':index}}>
    <span className="marker" aria-hidden="true" />
    <h3>{store.short}</h3>
    {nearest && <span className="nearest-tag">Size en yakın</span>}
    <p className={`status${status ? (status.open ? ' is-open' : ' is-closed') : ''}`}>{status ? status.text : ' '}</p>
    <p className="hours">{store.open} – {store.close}</p>
    <address>{store.street}<br />{store.area}</address>
    <a className="directions" href={`https://www.google.com/maps/dir/?api=1&destination=${store.maps}`} target="_blank" rel="noopener noreferrer" aria-label={`${store.name} için yol tarifi (yeni sekmede açılır)`}>Yol tarifi<Icon name="external" /></a>
  </li>;
}

// Departure-board digits; the digits live in CSS so the caption still reads as plain text.
function Flaps({digits}) {
  const tile = i => <b key={`${i}${digits[i]}`} data-d={digits[i]} />;
  return <span className="flaps" aria-hidden="true">{tile(0)}{tile(1)}<i />{tile(2)}{tile(3)}</span>;
}

const clamp = value => Math.min(1, Math.max(0, value));

// Scrolling drives a train along the line; each station pings as the train passes it.
// On the vertical line the train is sticky, so the browser keeps it steady while scrolling;
// moving it from a scroll handler lagged a frame behind on iPhone and made it jump up and down.
function useLineTrain(hatRef) {
  useEffect(() => {
    const hat = hatRef.current, train = hat.querySelector('.hat-train'), track = hat.querySelector('.hat-track');
    if (prefersReducedMotion()) return undefined;
    const vertical = matchMedia('(max-width:1179px)');
    let previous = null, queued = false, trackTop = '';
    const ping = station => { station.classList.remove('ping'); void station.offsetWidth; station.classList.add('ping'); setTimeout(() => station.classList.remove('ping'), 1000); };
    const update = () => {
      queued = false;
      const box = hat.getBoundingClientRect(), vh = innerHeight;
      const stations = [...hat.querySelectorAll('.station')];
      const marks = stations.map(station => { const m = station.querySelector('.marker').getBoundingClientRect(); return vertical.matches ? m.top + m.height / 2 - box.top : m.left + m.width / 2 - box.left; });
      let front;
      if (vertical.matches) {
        // The track starts just past the first stop; CSS ends it above the fade at the bottom.
        const top = `${(marks[0] + 70 - 13).toFixed(1)}px`;
        if (top !== trackTop) { trackTop = top; track.style.setProperty('--track-top', top); }
        const t = train.getBoundingClientRect();
        front = t.top + t.height / 2 - box.top;
      } else {
        const x = -110 + clamp((vh * .92 - box.top) / (vh * .62)) * (box.width + 10);
        train.style.setProperty('--tx', `${x.toFixed(1)}px`);
        front = x + 96;
      }
      if (previous !== null) marks.forEach((mark, i) => { if ((previous < mark && front >= mark) || (previous > mark && front <= mark)) ping(stations[i]); });
      previous = front;
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    update();
    addEventListener('scroll', queue, {passive:true});
    addEventListener('resize', queue);
    return () => { removeEventListener('scroll', queue); removeEventListener('resize', queue); };
  }, [hatRef]);
}

function Line({nearestId, now}) {
  const hatRef = useRef(null);
  useLineTrain(hatRef);
  const digits = now === null ? null : clockDigits(now);
  return <section className="lines" id="magazalar" aria-labelledby="stores-title">
    <div className="wrap">
      <h2 id="stores-title" className="sr-only">Mağazalarımız</h2>
      <p className="hat-caption">{digits === null ? 'Mağazalarımız ve çalışma saatleri' : <>
        <span>İstanbul’da saat</span>{' '}<Flaps digits={digits} /><span className="sr-only">{`${digits.slice(0, 2)}:${digits.slice(2)}.`}</span>{' '}<span>{openSummary(now)}</span>
      </>}</p>
      <div className="hat" ref={hatRef}>
        {sides.map(side => {
          const group = stores.filter(store => store.side === side.id);
          return <React.Fragment key={side.id}>
            {side.id === 'anadolu' && <div className="strait" aria-hidden="true"><span>İstanbul Boğazı</span></div>}
            <div className={`yaka ${side.id}`}>
              <p className="yaka-name" id={`yaka-${side.id}`}>{side.label}</p>
              <ol aria-labelledby={`yaka-${side.id}`} style={{'--n':group.length}}>
                {group.map(store => <Station key={store.id} store={store} index={stores.indexOf(store)} now={now} nearest={store.id === nearestId} />)}
              </ol>
            </div>
          </React.Fragment>;
        })}
        <span className="hat-track" aria-hidden="true"><svg className="hat-train" viewBox="-38 -9 76 18" aria-hidden="true" focusable="false"><use href="#train-sym" x="-38" y="-9" width="76" height="18" /></svg></span>
      </div>
    </div>
  </section>;
}

const services = [
  ['Telefon', '5G uyumlu telefonları nakit ya da temlikli, yani Vodafone faturanıza taksitli olarak alın.'],
  ['Aksesuar', 'Kılıf, ekran koruyucu, şarj aleti ve kulaklık. Arıza oranı düşük ürünleri seçiyoruz.'],
  ['Vodafone işlemleri', 'Yeni hat, numara taşıma, ev interneti ve fatura işlemleri. Mağazaya uğrayın ya da önce bizi arayın.'],
];

function Service({title, text}) {
  const ref = useRef(null);
  const revealed = useRevealed(ref);
  const Art = serviceArt[title];
  return <li ref={ref} className={revealed ? 'in-view' : undefined}><div><h3>{title}</h3><p>{text}</p></div><Art /></li>;
}

function Services() {
  return <section className="section services" id="hizmetler" aria-labelledby="services-title">
    <div className="wrap split">
      <h2 id="services-title">Mağazada neler var?</h2>
      <ul className="service-list">{services.map(([title, text]) => <Service key={title} title={title} text={text} />)}</ul>
    </div>
  </section>;
}

function About() {
  const ref = useRef(null);
  const revealed = useRevealed(ref);
  return <section ref={ref} className={`section about${revealed ? ' in-view' : ''}`} id="hakkimizda" aria-labelledby="about-title">
    <div className="wrap about-grid">
      <div>
        <h2 id="about-title" className="statement">Çeyrek asırdır İstanbul’da telefon ve hat işindeyiz.</h2>
        <p className="about-note">Zanes İletişim, 25 yıllık sektör deneyimine sahip bir Vodafone Business Partner. Avrupa Yakası’nda dört, Anadolu Yakası’nda iki mağazamız var.</p>
      </div>
      <Metro25 />
    </div>
  </section>;
}

// The number rolls in like a counter; the plain number stays in the link for crawlers and no-JS visitors.
function PhoneCounter({phone}) {
  let column = 0;
  return <>
    <span className="phone-text">{phone}</span>
    <span className="odo-row" aria-hidden="true">{[...phone].map((char, i) => char === ' '
      ? <span key={i} className="odo-gap" />
      : <span key={i} className="odo"><span className="odo-strip" style={{'--d':10 + Number(char), '--k':column++}} /></span>)}</span>
  </>;
}

function Contact() {
  const ref = useRef(null);
  const revealed = useRevealed(ref);
  return <section ref={ref} className={`section contact${revealed ? ' in-view' : ''}`} id="iletisim" aria-labelledby="contact-title">
    <svg className="signal" viewBox="0 0 1400 800" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">{[0, 1, 2, 3].map(i => <circle key={i} cx="1180" cy="400" r="900" />)}</svg>
    <div className="wrap">
      <h2 id="contact-title">Arayın, yardımcı olalım.</h2>
      <a className="big-phone" href={contact.phoneHref} aria-label={`${contact.phone} numarasını arayın`}><PhoneCounter phone={contact.phone} /></a>
      <dl className="contact-meta">
        <div><dt>E-posta</dt><dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>
        <div><dt>Adres</dt><dd>{contact.address[0]}<br />{contact.address[1]}</dd></div>
      </dl>
    </div>
  </section>;
}

function Footer() {
  return <footer className="footer">
    <div className="wrap footer-inner">
      <Brand />
      <p>Teknolojiye güvenle ulaşın.</p>
      <p className="footer-legal">© 2026 Zanes İletişim. Tüm hakları saklıdır.</p>
    </div>
  </footer>;
}

export default function App() {
  const finder = useNearestStore();
  const now = useIstanbulMinutes();
  // SMIL loops (cable pulse, metro cars) are not covered by the CSS reduced-motion rule.
  useEffect(() => { if (prefersReducedMotion()) document.querySelectorAll('svg').forEach(svg => svg.pauseAnimations?.()); }, []);
  return <>
    <TrainSprite />
    <a className="skip" href="#ana-icerik">İçeriğe geç</a>
    <Header />
    <main id="ana-icerik" tabIndex={-1}>
      <Hero finder={finder} now={now} />
      <Line nearestId={finder.nearestId} now={now} />
      <Services />
      <About />
      <Contact />
    </main>
    <Footer />
  </>;
}

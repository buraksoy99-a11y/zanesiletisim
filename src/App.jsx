import React, {useEffect, useRef, useState} from 'react';
import {stores, sides, contact} from './stores';
import Icon, {ZMark} from './Icon';
import Nav from './Nav';
import {TrainSprite} from './Train';
import Feedback from './Feedback';
import {useIstanbulMinutes, storeStatus, clockDigits, openSummary, distanceKm, formatDistance} from './hours';
import {useOnScreen, prefersReducedMotion} from './motion';
import {useHalftone, drawClouds, drawTower, drawCardArt, drawMap, mapWindow} from './halftone';

const sections = [['#hizmetler', 'Hizmetler'], ['#magazalar', 'Mağazalar'], ['#geribildirim', 'Geri bildirim'], ['#iletisim', 'İletişim']];
const mapsUrl = store => `https://www.google.com/maps/dir/?api=1&destination=${store.maps}`;

// Details Vault "Arrow Shift Button": a glass pill whose arrow leaves right while another enters left.
function GlassButton({href, children, className = ''}) {
  return <a className={`button-05 ${className}`} href={href}>
    <span className="glass" aria-hidden="true" />
    <span className="content"><span className="copy">{children}</span></span>
  </a>;
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

// The eyebrow rolls through the store names while the hero is on screen.
function useTicker(active) {
  const [tick, setTick] = useState({i:0, animate:true});
  useEffect(() => {
    if (!active || prefersReducedMotion()) return undefined;
    const timer = setInterval(() => setTick(t => ({i:t.i + 1, animate:true})), 2600);
    return () => clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (tick.i < stores.length) return undefined;
    // After the copy of the first name has rolled in, jump back to the real first name unseen.
    const timer = setTimeout(() => setTick({i:0, animate:false}), 600);
    return () => clearTimeout(timer);
  }, [tick.i]);
  return tick;
}

function Birds({className}) {
  return <svg className={`birds ${className}`} viewBox="0 0 1400 800" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    {['M980 110q5-5 10 0q5-5 10 0', 'M1030 140q4-4 8 0q4-4 8 0', 'M900 170q5-5 10 0q5-5 10 0', 'M1120 92q4-4 8 0q4-4 8 0', 'M820 120q4-4 8 0q4-4 8 0'].map(d => <path key={d} d={d} />)}
  </svg>;
}

// A small plane flies in once and parks, towing a paper banner.
function Plane() {
  return <div className="plane" aria-hidden="true">
    <span className="banner">25 yıldır İstanbul’da</span><span className="rope" />
    <svg viewBox="0 0 54 22" aria-hidden="true" focusable="false">
      <path d="M4 11Q8 7 20 7L40 7Q50 8 52 11Q50 14 40 15L20 15Q8 15 4 11Z" fill="#ecebe6" />
      <path d="M22 7 30 1 34 1 30 7ZM22 15 30 21 34 21 30 15Z" fill="#d6d4cd" />
      <path d="M4 11 1 4 6 4 10 8Z" fill="#d6d4cd" />
      <rect x="42" y="9" width="6" height="2.4" rx="1" fill="#3a3a3a" />
      <path d="M14 11h22" stroke="#e60000" strokeWidth="1.6" />
    </svg>
  </div>;
}

function Hero({finder}) {
  const ref = useRef(null), clouds = useRef(null), tower = useRef(null);
  const onScreen = useOnScreen(ref);
  const tick = useTicker(onScreen);
  useHalftone(clouds, drawClouds(7), {cell:4.2, ink:'#fff4ee', max:.64});
  useHalftone(tower, drawTower, {cell:3, ink:'#1d0606', max:.62});
  return <section ref={ref} className="hero grain" aria-labelledby="hero-title">
    <canvas ref={clouds} className="hero-clouds" aria-hidden="true" />
    <canvas ref={tower} className="hero-tower" aria-hidden="true" />
    <Birds className="hero-birds" />
    <Plane />
    <div className="wrap hero-body">
      <div className="hero-copy">
        <div className="eyebrow" aria-hidden="true">
          <Icon name="pin" />
          <span className="ticker"><span className="ticker-list" style={{transform:`translateY(${-1.5 * tick.i}em)`, transition:tick.animate ? undefined : 'none'}}>
            {[...stores, stores[0]].map((store, i) => <span key={i}>{store.short}</span>)}
          </span></span>
        </div>
        <h1 id="hero-title">Telefon, hat ve fatura. Hepsi tek adreste.</h1>
        <div className="hero-side">
          <p className="lede">İstanbul’un iki yakasında altı mağaza. Vodafone Business Partner.</p>
          <div className="actions">
            <a className="btn btn-primary btn-cta" href="#magazalar" onClick={finder.locate} aria-busy={finder.busy}>En yakın mağaza<Icon name={finder.busy ? 'locate' : 'arrowDown'} /></a>
            <GlassButton href={contact.phoneHref} className="hero-call">Bizi arayın</GlassButton>
          </div>
          <p className="geo-message" role="status">{finder.message}</p>
        </div>
      </div>
    </div>
  </section>;
}

const services = [
  {title:'Telefon', art:'phone', tag:'Nakit ya da temlikli', text:'5G uyumlu telefonları nakit ya da temlikli, yani Vodafone faturanıza taksitli olarak alın.'},
  {title:'Aksesuar', art:'headphones', tag:'Seçilmiş ürünler', text:'Kılıf, ekran koruyucu, şarj aleti ve kulaklık. Arıza oranı düşük ürünleri seçiyoruz.'},
  {title:'Vodafone işlemleri', art:'sim', tag:'Hat, taşıma, fatura', text:'Yeni hat, numara taşıma, ev interneti ve fatura işlemleri. Mağazaya uğrayın ya da önce bizi arayın.'},
];

function ServiceCard({service}) {
  const ref = useRef(null);
  useHalftone(ref, drawCardArt(service.art), {cell:3.6, ink:'#fff4ee', max:.62});
  return <li className="card">
    <div className="card-art grain"><canvas ref={ref} aria-hidden="true" /><span className="banner">{service.tag}</span></div>
    <h3>{service.title}</h3>
    <p>{service.text}</p>
  </li>;
}

function Services() {
  return <section className="section services" id="hizmetler" aria-labelledby="services-title">
    <div className="wrap">
      <div className="sec-head">
        <div><p className="kicker">Hizmetler</p><h2 id="services-title">Mağazada neler var?</h2></div>
        <p className="sec-lede">Çeyrek asırdır İstanbul’da telefon ve hat işindeyiz. Zanes İletişim bir Vodafone Business Partner.</p>
      </div>
      <ul className="cards">{services.map(service => <ServiceCard key={service.title} service={service} />)}</ul>
    </div>
  </section>;
}

function Station({store, index, now, nearest, hot, onHot}) {
  const status = now === null ? null : storeStatus(store, now);
  return <li className={`station${nearest ? ' is-nearest' : ''}${hot ? ' is-hot' : ''}`} id={`magaza-${store.id}`} tabIndex={-1}
    onPointerEnter={() => onHot(store.id)} onPointerLeave={() => onHot(null)}>
    <span className="n" aria-hidden="true">{index + 1}</span>
    <h3>{store.short}{nearest && <span className="nearest-tag">Size en yakın</span>}</h3>
    <div className="store-meta">
      <p className={`status${status ? (status.open ? ' is-open' : ' is-closed') : ''}`}>{status ? status.text : ' '}</p>
      <p className="hours">{store.open} – {store.close}</p>
    </div>
    <address>{store.street}, {store.area}</address>
    <a className="directions" href={mapsUrl(store)} target="_blank" rel="noopener noreferrer" aria-label={`${store.name} için yol tarifi (yeni sekmede açılır)`}><Icon name="external" /><span>Yol tarifi</span></a>
  </li>;
}

function Stores({nearestId, now}) {
  const [hotId, setHotId] = useState(null);
  const mapRef = useRef(null);
  // The visible map window comes from CSS (--map-x/--map-w), so narrow phones zoom in on the stores.
  useHalftone(mapRef, (o, w, h) => drawMap(o, w, h, mapWindow(mapRef.current.parentElement)), {cell:5.5, ink:'#e60000', max:.62});
  const digits = now === null ? null : clockDigits(now);
  return <section className="section stores" id="magazalar" aria-labelledby="stores-title">
    <div className="wrap sec-head">
      <div><p className="kicker">Mağazalar</p><h2 id="stores-title">İki yaka, altı mağaza.</h2></div>
      <p className="sec-lede stores-caption">{digits === null
        ? 'Avrupa Yakası’nda dört, Anadolu Yakası’nda iki mağazamız var.'
        : `İstanbul’da saat ${digits.slice(0, 2)}:${digits.slice(2)}. ${openSummary(now)}`}</p>
    </div>
    <div className="slab stores-panel grain">
      <div className="stores-grid">
        <div className="store-lists">
          {sides.map(side => <div className="side" key={side.id}>
            <p className="side-name" id={`yaka-${side.id}`}>{side.label}</p>
            <ol aria-labelledby={`yaka-${side.id}`}>
              {stores.filter(store => store.side === side.id).map(store => <Station key={store.id} store={store} index={stores.indexOf(store)} now={now}
                nearest={store.id === nearestId} hot={store.id === hotId} onHot={setHotId} />)}
            </ol>
          </div>)}
        </div>
        <div className="map">
          <canvas ref={mapRef} aria-hidden="true" />
          <span className="water" style={{left:'52%', top:'3%'}} aria-hidden="true">Karadeniz</span>
          <span className="water" style={{left:'6%', top:'88%'}} aria-hidden="true">Marmara Denizi</span>
          {stores.map((store, i) => {
            const closed = now !== null && !storeStatus(store, now).open;
            return <a key={store.id} className={`pin${closed ? ' is-closed' : ''}${store.id === nearestId ? ' is-nearest' : ''}${store.id === hotId ? ' is-hot' : ''}`}
              style={{'--mx':store.mx, '--my':store.my}}
              href={mapsUrl(store)} target="_blank" rel="noopener noreferrer" aria-label={`${store.name} haritada, yol tarifi (yeni sekmede açılır)`}
              onPointerEnter={() => setHotId(store.id)} onPointerLeave={() => setHotId(null)}>{i + 1}</a>;
          })}
        </div>
      </div>
    </div>
  </section>;
}

function Contact() {
  const ref = useRef(null);
  useHalftone(ref, drawClouds(21), {cell:4.2, ink:'#fff4ee', max:.64});
  return <section className="slab contact grain" id="iletisim" aria-labelledby="contact-title">
    <canvas ref={ref} className="contact-clouds" aria-hidden="true" />
    <Birds className="contact-birds" />
    <div className="contact-inner">
      <h2 id="contact-title">Arayın, yardımcı olalım.</h2>
      <p className="contact-lede">Telefon, hat ya da fatura: mağazaya gelmeden önce arayın, sorunuza birlikte bakalım.</p>
      <div className="actions">
        <a className="btn btn-cta big-phone" href={contact.phoneHref} aria-label={`${contact.phone} numarasını arayın`}><Icon name="phone" />{contact.phone}</a>
        <GlassButton href={`mailto:${contact.email}`}>{contact.email}</GlassButton>
      </div>
      <p className="contact-address">{contact.address[0]}, {contact.address[1]}</p>
    </div>
  </section>;
}

function Footer() {
  return <footer className="footer">
    <div className="wrap">
      <div className="foot-top">
        <div className="foot-brand">
          <a className="brand" href="#" aria-label="Zanes İletişim ana sayfa"><ZMark /><span>Zanes İletişim</span></a>
          <p>Teknolojiye güvenle ulaşın.</p>
        </div>
        <div className="foot-cols">
          {sides.map(side => <div key={side.id}><p className="foot-h">{side.label}</p><ul>
            {stores.filter(store => store.side === side.id).map(store => <li key={store.id}><a href={mapsUrl(store)} target="_blank" rel="noopener noreferrer">{store.short}</a></li>)}
          </ul></div>)}
          <div><p className="foot-h">İletişim</p><ul><li><a href={contact.phoneHref}>{contact.phone}</a></li><li>Mecidiyeköy, Şişli</li></ul></div>
          <div><p className="foot-h">Sayfa</p><ul>{sections.map(([href, label]) => <li key={href}><a href={href}>{label}</a></li>)}</ul></div>
        </div>
      </div>
      <p className="footer-legal">© 2026 Zanes İletişim. Tüm hakları saklıdır. Vodafone Business Partner.</p>
    </div>
  </footer>;
}

export default function App() {
  const finder = useNearestStore();
  const now = useIstanbulMinutes();
  // SMIL loops are not covered by the CSS reduced-motion rule.
  useEffect(() => { if (prefersReducedMotion()) document.querySelectorAll('svg').forEach(svg => svg.pauseAnimations?.()); }, []);
  return <>
    <TrainSprite />
    <a className="skip" href="#ana-icerik">İçeriğe geç</a>
    <Nav />
    <main id="ana-icerik" tabIndex={-1}>
      <Hero finder={finder} />
      <Services />
      <Stores nearestId={finder.nearestId} now={now} />
      <Feedback />
      <Contact />
    </main>
    <Footer />
  </>;
}

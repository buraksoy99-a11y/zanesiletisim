import React, {useState} from 'react';
import {stores, sides, contact} from './stores';
import Icon, {ZMark} from './Icon';
import {useIstanbulMinutes, storeStatus, summary, distanceKm, formatDistance} from './hours';

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
        const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({behavior:reduce ? 'auto' : 'smooth', block:'center'});
        target.focus({preventScroll:true});
      }
    }, error => setGeo({state:error.code === 1 ? 'denied' : 'failed'}), {timeout:10000, maximumAge:300000});
  };
  const message = geo.state === 'done' ? geo.text : geoMessages[geo.state] || '';
  return {nearestId:geo.state === 'done' ? geo.id : null, busy:geo.state === 'loading', message, locate};
}

function Hero({finder}) {
  return <section className="hero" aria-labelledby="hero-title">
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
  </section>;
}

function Station({store, index, now, nearest}) {
  const status = now === null ? null : storeStatus(store, now);
  return <li className={`station${nearest ? ' is-nearest' : ''}`} id={`magaza-${store.id}`} tabIndex={-1} style={{'--i':index}}>
    <span className="marker" aria-hidden="true" />
    <h3>{store.short}</h3>
    {nearest && <span className="nearest-tag">Size en yakın</span>}
    <p className={`status${status ? (status.open ? ' is-open' : ' is-closed') : ''}`}>{status ? status.text : '\u00a0'}</p>
    <p className="hours">{store.open} – {store.close}</p>
    <address>{store.street}<br />{store.area}</address>
    <a className="directions" href={`https://www.google.com/maps/dir/?api=1&destination=${store.maps}`} target="_blank" rel="noopener noreferrer" aria-label={`${store.name} için yol tarifi (yeni sekmede açılır)`}>Yol tarifi<Icon name="external" /></a>
  </li>;
}

function Line({nearestId}) {
  const now = useIstanbulMinutes();
  return <section className="lines" id="magazalar" aria-labelledby="stores-title">
    <div className="wrap">
      <h2 id="stores-title" className="sr-only">Mağazalarımız</h2>
      <p className="hat-caption">{now === null ? 'Mağazalarımız ve çalışma saatleri' : summary(now)}</p>
      <div className="hat">
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
      </div>
    </div>
  </section>;
}

const services = [
  ['Telefon', '5G uyumlu telefonları nakit ya da temlikli, yani Vodafone faturanıza taksitli olarak alın.'],
  ['Aksesuar', 'Kılıf, ekran koruyucu, şarj aleti ve kulaklık. Arıza oranı düşük ürünleri seçiyoruz.'],
  ['Vodafone işlemleri', 'Yeni hat, numara taşıma, ev interneti ve fatura işlemleri. Mağazaya uğrayın ya da önce bizi arayın.'],
];

function Services() {
  return <section className="section services" id="hizmetler" aria-labelledby="services-title">
    <div className="wrap split">
      <h2 id="services-title">Mağazalarımızda neler var?</h2>
      <ul className="service-list">{services.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}</ul>
    </div>
  </section>;
}

function About() {
  return <section className="section about" id="hakkimizda" aria-labelledby="about-title">
    <div className="wrap">
      <h2 id="about-title" className="statement">Çeyrek asırdır İstanbul’da telefon ve hat işindeyiz.</h2>
      <p className="about-note">Zanes İletişim, 25 yıllık sektör deneyimine sahip bir Vodafone Business Partner. Avrupa Yakası’nda dört, Anadolu Yakası’nda iki mağazamız var.</p>
    </div>
  </section>;
}

function Contact() {
  return <section className="section contact" id="iletisim" aria-labelledby="contact-title">
    <div className="wrap">
      <h2 id="contact-title">Arayın, yardımcı olalım.</h2>
      <a className="big-phone" href={contact.phoneHref} aria-label={`${contact.phone} numarasını arayın`}>{contact.phone}</a>
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
  return <>
    <a className="skip" href="#ana-icerik">İçeriğe geç</a>
    <Header />
    <main id="ana-icerik" tabIndex={-1}>
      <Hero finder={finder} />
      <Line nearestId={finder.nearestId} />
      <Services />
      <About />
      <Contact />
    </main>
    <Footer />
  </>;
}

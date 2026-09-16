import React, {useEffect, useRef, useState} from 'react';
import {stores} from './stores';
import Icon, {ConnectionMark} from './Icon';
import useMotion from './useMotion';

function Brand() {
  return <a className="brand" href="#" aria-label="Zanes İletişim ana sayfa"><span className="brand-name">zanes<span className="brand-dot">.</span></span><span className="brand-descriptor">iletişim</span></a>;
}

const navigation = [['#hizmetler','Hizmetlerimiz'],['#hakkimizda','Biz kimiz?'],['#magazalar','Mağazalarımız']];

function Header() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('');
  const toggleRef = useRef(null);
  const headerRef = useRef(null);
  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape' && open) { setOpen(false); toggleRef.current?.focus(); }
    };
    const onClick = event => { if (!headerRef.current?.contains(event.target)) setOpen(false); };
    const media = matchMedia('(min-width: 901px)');
    const onResize = event => { if (event.matches) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    media.addEventListener('change', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
      media.removeEventListener('change', onResize);
    };
  }, [open]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActive(entry.target.id ? `#${entry.target.id}` : '');
      });
    }, {rootMargin:'-15% 0px -60% 0px', threshold:0});
    document.querySelectorAll('.hero, main > section[id]').forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  const navigate = event => {
    setOpen(false);
    const target = document.querySelector(event.currentTarget.hash);
    if (target) { target.tabIndex = -1; target.focus({preventScroll:true}); }
  };
  return <header className="header" ref={headerRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Brand />
    <nav className="desktop-nav" aria-label="Ana gezinme">{navigation.map(([href,label]) => <a key={href} href={href} aria-current={active === href ? 'location' : undefined}>{label}{href === '#magazalar' && <span className="nav-count">06</span>}</a>)}</nav>
    <a className="header-contact" href="#iletisim">Bize ulaşın</a>
    <button className="menu-toggle" ref={toggleRef} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'} onClick={() => setOpen(value => !value)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 8h18"/><path d="M3 16h18"/></svg>
    </button>
    <nav id="mobile-menu" className={open ? 'open' : ''} aria-label="Mobil gezinme" inert={!open}>
      {[...navigation,['#iletisim','Bize ulaşın']].map(([href,label],index) => <a href={href} key={href} tabIndex={0} onClick={navigate} style={{'--i':index}}>{label}<Icon /></a>)}
      <a href="tel:+905453636464" className="menu-phone" tabIndex={0} onClick={() => setOpen(false)}><Icon name="phone"/>0545 363 64 64</a>
    </nav>
    <div className="reading-progress" aria-hidden="true" />
  </header>;
}

function PhoneArtwork() {
  return <div className="hero-art" data-enter="art" role="img" aria-label="Kırmızı ve siyah yörüngelerle çevrili telefon illüstrasyonu">
    <div className="art-top"><span>BAĞLANTI GÜZEL ŞEY.</span><Icon name="plus"/></div>
    <div className="orbit-system"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><span className="orbit-dot"/></div>
    <div className="phone-shadow"/>
    <div className="phone-stage"><div className="phone"><div className="phone-screen">
      <div className="island"/><div className="screen-top"><span>09:41</span><div><Icon name="signal"/><Icon name="battery"/></div></div>
      <div className="screen-copy">Hayata<br/><strong>bağlı kal.</strong></div>
      <div className="screen-rings"><i/><i/><i/></div>
      <div className="screen-bottom"><span>zanes.</span><Icon /></div><div className="home-indicator"/>
    </div></div></div>
    <div className="art-label label-one"><span className="mini-mark"><Icon name="check"/></span><div>Güvenilir Hizmet</div></div>
    <div className="art-label label-two"><Icon name="pin"/><div><strong>6 mağaza</strong></div></div>
  </div>;
}

function Hero() {
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-copy">
      <div className="eyebrow" data-enter="eyebrow"><span className="signal-dot"/>Vodafone Business Partner</div>
      <h1 id="hero-title"><span className="line-mask"><span>Teknolojiye</span></span><span className="line-mask"><span>güvenle</span></span><span className="line-mask red"><span>ulaşın.<Icon className="hero-arrow"/></span></span></h1>
      <p data-enter="copy">İstanbul'un en değerli lokasyonlarında olan mağazalarımıza sizleri bekliyoruz</p>
      <div className="hero-foot" data-enter="actions"><span><Icon name="pin"/>İSTANBUL, TÜRKİYE</span><span>HER ZAMAN BAĞLANTIDA<span className="signal-dot"/></span></div>
    </div>
    <PhoneArtwork />
  </section>;
}

function SectionHeading({number,label,id,first,second}) {
  return <div className="section-heading"><span className="eyebrow" data-reveal>{number} — {label}</span><h2 id={id} data-reveal><span className="heading-line">{first}</span><span className="heading-line muted">{second}</span></h2></div>;
}

function Services() {
  return <section className="services section" id="hizmetler" aria-labelledby="services-title">
    <SectionHeading number="01" label="Hizmetlerimiz" id="services-title" first="Günlük hayatınıza" second="iyi gelen teknoloji."/>
    <div className="service-grid">
      <div className="card-reveal" data-reveal style={{'--delay':'0ms'}}><a className="service-card phones" href="#magazalar"><div className="card-top"><span>01 / AKILLI TELEFON</span><span className="round-arrow"><Icon /></span></div><div className="product-visual" aria-hidden="true"><div className="mini-phones"><div className="device-back"><div className="lenses"><i/><i/><i/></div><span className="device-mark">z.</span></div><div className="device-front"><i/><div/></div></div></div><div className="card-copy"><h3>Sıradaki telefonunuz<br/>burada.</h3><p>5G Uyumlu telefon modellerini temlikli veya ayrıcalıklı nakit seçenekleriyle alın.</p><span className="card-link">Mağazalarımızda keşfedin <Icon name="right"/></span></div></a></div>
      <div className="card-reveal" data-reveal style={{'--delay':'110ms'}}><a className="service-card accessories" href="#magazalar"><div className="card-top"><span>02 / AKSESUAR</span><span className="round-arrow"><Icon /></span></div><div className="product-visual" aria-hidden="true"><div className="headphones"><div className="headband"/><div className="ear left"/><div className="ear right"/></div></div><div className="card-copy"><h3>Güvenle alabileceğiniz aksesuarlar</h3><p>En düşük arıza oranına sahip aksesuar ürünleriyle güvenli alışveriş</p><span className="card-link">Tarzınızı tamamlayın <Icon name="right"/></span></div></a></div>
      <div className="card-reveal" data-reveal style={{'--delay':'220ms'}}><a className="service-card vodafone" href="#iletisim"><div className="card-top"><span>03 / VODAFONE</span><span className="round-arrow"><Icon /></span></div><div className="product-visual" aria-hidden="true"><div className="service-connection"><ConnectionMark /></div></div><div className="card-copy"><h3>Her işlem için tek noktanız</h3><p>Aklınıza gelebilecek her işlem için etkin iletişimle hızlı çözüm desteğimiz sizin için her zaman hazır.</p><span className="card-link">Bizimle iletişime geçin <Icon name="right"/></span></div></a></div>
    </div>
  </section>;
}

function About() {
  return <section className="about section" id="hakkimizda" aria-labelledby="about-title">
    <div className="about-kicker"><span className="eyebrow" data-reveal>02 — Zanes İletişim</span><div className="about-mark" data-reveal><ConnectionMark /></div></div>
    <div className="about-body"><h2 id="about-title" data-reveal>Teknoloji değişir.<br/><span className="muted">Güven hep kalır.</span></h2><p data-reveal>Yılların deneyimi ve Vodafone’un güçlü altyapısıyla, teknoloji ihtiyaçlarınız için güvenilir çözüm ortağınızız.</p><div className="stats"><div data-reveal><strong>25</strong><span>yıllık sektör deneyimi</span></div><div data-reveal style={{'--delay':'90ms'}}><strong>06</strong><span>lokasyon</span></div><div className="authorized" data-reveal style={{'--delay':'180ms'}}><span className="verified-mark"><Icon name="check"/></span><strong>Vodafone</strong><span>Business Partner</span></div></div></div>
  </section>;
}

function Stores() {
  return <section className="stores section" id="magazalar" aria-labelledby="stores-title">
    <SectionHeading number="03" label="Mağazalarımız" id="stores-title" first="Aynı şehirde." second="Yanıbaşınızda"/>
    <div className="store-layout"><div className="store-intro"><div className="city-stamp" data-reveal><Icon name="pin"/><span>İSTANBUL</span><strong>06</strong><span>NOKTADA YANINIZDAYIZ</span></div><p data-reveal>Size en yakın mağazamıza uğrayın.<br/>Birlikte keşfedelim.</p><a className="text-link" href="tel:+905453636464" data-reveal><Icon name="phone"/>0545 363 64 64</a></div>
      <div className="store-list" id="store-list">{stores.map((store,index) => <article className="store" key={store[0]} data-reveal style={{'--delay':`${index % 2 * 90}ms`}}>
        <div className="store-top"><span className="store-pin"><Icon name="pin"/></span><span className="store-number">0{index+1}</span></div>
        <h3>{store[0]}</h3><p>{store[1]}<br/>{store[2]}</p>
        <div className="store-bottom"><span className="hours"><Icon name="clock"/>{store[3]}</span><a href={`https://www.google.com/maps/dir/?api=1&destination=${store[4]}`} target="_blank" rel="noopener noreferrer" aria-label={`${store[0]} için yol tarifi (yeni sekme)`}>Yol tarifi <Icon /></a></div>
      </article>)}</div>
    </div>
  </section>;
}

function Contact() {
  return <section className="contact section" id="iletisim" aria-labelledby="contact-title">
    <div className="contact-top" data-reveal><span className="eyebrow">04 — İletişim</span><ConnectionMark /></div>
    <div className="contact-main"><h2 id="contact-title" data-reveal>Ulaşın,<br/>yardımcı olalım</h2><a className="contact-arrow" href="tel:+905453636464" tabIndex={0} aria-label="Zanes İletişim’i arayın" data-reveal><Icon /></a></div>
    <div className="contact-bottom"><a href="tel:+905453636464" tabIndex={0} data-reveal><span className="contact-label"><Icon name="phone"/>Bizi Arayın</span><span className="contact-value">0545 363 64 64 <Icon name="right" className="contact-value-arrow"/></span></a><a href="mailto:info@zanes.com.tr" tabIndex={0} data-reveal style={{'--delay':'90ms'}}><span className="contact-label"><Icon name="mail"/>Bize Yazın</span><span className="contact-value">info@zanes.com.tr <Icon name="right" className="contact-value-arrow"/></span></a><div className="contact-address" data-reveal style={{'--delay':'180ms'}}><span className="contact-label"><Icon name="pin"/>Adresimiz</span><p>Büyükdere Cad. Hürmet Keçeli İş Merkezi No:51<br/>Mecidiyeköy, Şişli / İstanbul</p></div></div>
  </section>;
}

function Footer() {
  return <footer><div className="footer-top"><Brand /><span>Teknolojiye güvenle ulaşın.</span><a className="text-link" href="#">Başa dön <Icon name="up"/></a></div><div className="footer-bottom"><span>© 2026 Zanes İletişim</span><span>Tüm hakları saklıdır.</span><span>İstanbul, Türkiye</span></div></footer>;
}

export default function App() {
  useMotion();
  return <>
    <a className="skip" href="#ana-icerik">İçeriğe geç</a>
    <Header />
    <main id="ana-icerik" tabIndex={-1}>
      <Hero />
      <Services /><About /><Stores /><Contact />
    </main>
    <Footer />
  </>;
}

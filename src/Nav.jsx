import React, {memo, useEffect, useRef} from 'react';
import {animate} from 'motion';
import {contact} from './stores';
import Icon, {ZMark} from './Icon';
import {useHalftone, drawCardArt, drawMap, drawClouds, drawTower} from './halftone';

// Details Vault "Top Morphing Navigation": a frosted bar that grows into the menu, staggers its links in,
// and swaps a preview picture per link. The pictures are the site's own halftone drawings, not photos.
const links = [
  {href:'#hizmetler', label:'Hizmetler', preview:'services'},
  {href:'#magazalar', label:'Mağazalar', preview:'map'},
  {href:'#geribildirim', label:'Geri bildirim', preview:'feedback'},
  {href:'#iletisim', label:'İletişim', preview:'contact'},
];

const previews = {
  services:{draw:drawCardArt('phone'), options:{cell:3.4, ink:'#fff4ee', max:.62}, background:'#e60000'},
  map:{draw:drawMap, options:{cell:4.6, ink:'#e60000', max:.62}, background:'#ece4d8'},
  feedback:{draw:drawCardArt('headphones'), options:{cell:3.4, ink:'#fff4ee', max:.62}, background:'#1d0606'},
  contact:{draw:(o, w, h) => { drawClouds(21)(o, w, h); o.save(); o.translate(w * .62, h * .08); drawTower(o, w * .26, h * .92); o.restore(); }, options:{cell:3.2, ink:'#fff4ee', max:.62}, background:'#e60000'},
};

function Preview({kind, index}) {
  const ref = useRef(null);
  const {draw, options, background} = previews[kind];
  useHalftone(ref, draw, options);
  return <div className="preview" data-preview={index} style={{background}}><canvas ref={ref} /></div>;
}

function setupNavigation(root) {
  const events = new AbortController();
  const on = (node, event, callback, options = {}) => node.addEventListener(event, callback, {...options, signal:events.signal});
  const panel = root.querySelector('[data-panel]');
  const content = root.querySelector('[data-content]');
  const header = root.querySelector('[data-header]');
  const home = root.querySelector('[data-home]');
  const toggle = root.querySelector('[data-toggle]');
  const mark = root.querySelector('[data-mark]');
  const top = root.querySelector('[data-top]');
  const bottom = root.querySelector('[data-bottom]');
  const layers = [...root.querySelectorAll('[data-preview]')];
  const pictures = layers.map(layer => layer.firstElementChild);
  const entries = [...content.querySelectorAll('[data-enter]')];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ease = [.75, 0, .25, 1];
  const revealEase = [.165, .84, .44, 1];
  const controls = new Map();
  const initialStyles = [panel, content, header, home, toggle, mark, top, bottom, ...layers, ...pictures, ...entries].map(node => [node, node.getAttribute('style')]);
  const savedOverflow = [document.documentElement.style.overflow, document.body.style.overflow];
  let open = false, geometry, resizeFrame, hover = false, activePreview = 0, previewLayer = 0, lastScroll = scrollY, direction;

  function move(key, target, values, options) {
    controls.get(key)?.stop();
    const animation = animate(target, values, reducedMotion.matches ? {duration:0, delay:0, onComplete:options.onComplete} : options);
    controls.set(key, animation);
    return animation;
  }
  function sizePanel(instant = false) {
    // Width leads on opening; height leads on closing. The interior keeps its final width.
    move('width', panel, {width:open ? geometry.width : geometry.closed, borderRadius:open && geometry.mobile ? 0 : 12}, {duration:instant ? 0 : .73, delay:instant || open ? 0 : .21, ease});
    move('height', panel, {height:open ? geometry.height : 60}, {
      duration:instant ? 0 : open ? .73 : .49, delay:!instant && open ? .23 : 0, ease,
      onComplete:() => { if (!open) { content.scrollTop = 0; showPreview(0, true); } },
    });
    move('header', header, {y:open && geometry.mobile ? -geometry.pad : 0}, {duration:instant ? 0 : .73, delay:instant || open ? 0 : .21, ease});
  }
  function layout() {
    const w = innerWidth, mobile = w < 768, pad = mobile ? 16 : 24;
    const closed = mobile ? w - pad * 2 : 330;
    const width = mobile ? w : Math.min(750, w - pad * 2);
    content.style.width = `${width}px`;
    // One measurement at the final width, only on setup, font readiness or viewport resize.
    const height = mobile ? innerHeight : content.offsetHeight + 60;
    geometry = {width, height, closed, mobile, pad};
    sizePanel(true);
  }
  function paintMark() {
    move('mark', mark, {rotate:0, scale:hover ? .91 : 1}, {type:'spring', stiffness:203, damping:25, mass:.9});
  }
  function showPreview(index, instant = false) {
    if (!layers[index] || (!instant && index === activePreview)) return;
    activePreview = index;
    if (instant) {
      previewLayer = 0;
      layers.forEach((layer, item) => {
        controls.get(`preview-${item}`)?.stop();
        controls.get(`image-${item}`)?.stop();
        layer.style.opacity = item === index ? '1' : '0';
        layer.style.zIndex = item === index ? '1' : '0';
        pictures[item].style.transform = 'none';
      });
      return;
    }
    // Keep the outgoing picture underneath until the incoming one is opaque.
    const opacity = Number(getComputedStyle(layers[index]).opacity);
    layers[index].style.zIndex = String(++previewLayer + 1);
    move(`preview-${index}`, layers[index], {opacity:[opacity, 1]}, {
      duration:.2, ease:[.25, .46, .45, .94],
      onComplete:() => {
        if (activePreview !== index) return;
        layers.forEach((layer, item) => {
          if (item === index) return;
          controls.get(`preview-${item}`)?.stop();
          controls.get(`image-${item}`)?.stop();
          layer.style.opacity = '0';
        });
      },
    });
    move(`image-${index}`, pictures[index], {scale:[1.1, 1]}, {duration:.6, ease:[.215, .61, .355, 1]});
  }
  function setOpen(next) {
    if (next === open) return;
    open = next;
    root.dataset.open = String(open);
    content.inert = !open;
    content.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    document.documentElement.style.overflow = open ? 'hidden' : savedOverflow[0];
    document.body.style.overflow = open ? 'hidden' : savedOverflow[1];
    if (!open) toggle.focus({preventScroll:true});
    sizePanel();
    entries.forEach((entry, index) => {
      const fade = entry.dataset.enter === 'fade';
      move(`entry-${index}`, entry, fade ? {opacity:open ? 1 : 0} : {y:open ? 0 : 20, opacity:open ? 1 : 0, filter:open ? 'blur(0px)' : 'blur(4px)'}, {
        duration:open ? .73 : .3,
        delay:open ? .5 + (fade ? 0 : index * .065) : (entries.length - 1 - index) * .03,
        ease:open ? (fade ? ease : revealEase) : 'easeIn',
      });
    });
    const iconMotion = {duration:.49, ease};
    move('top', top, {top:open ? '50%' : '42%', rotate:open ? 45 : 0}, iconMotion);
    move('bottom', bottom, {top:open ? '50%' : '58%', rotate:open ? -45 : 0}, iconMotion);
    paintMark();
  }

  entries.forEach((entry, index) => {
    move(`entry-${index}`, entry, entry.dataset.enter === 'fade' ? {opacity:0} : {y:20, opacity:0, filter:'blur(4px)'}, {duration:0});
  });
  layout();
  document.fonts?.ready.then(() => { if (!events.signal.aborted) layout(); });
  on(toggle, 'click', () => setOpen(!open));
  on(root.querySelector('[data-backdrop]'), 'click', () => setOpen(false));
  // data-close only dismisses the panel; the anchor still navigates.
  root.querySelectorAll('[data-close]').forEach(link => on(link, 'click', () => setOpen(false)));
  on(home, 'pointerenter', () => { hover = true; paintMark(); });
  on(home, 'pointerleave', () => { hover = false; paintMark(); });
  root.querySelectorAll('[data-preview-link]').forEach(link => {
    const show = () => showPreview(Number(link.dataset.previewLink));
    on(link, 'pointerenter', event => { if (event.pointerType !== 'touch') show(); });
    on(link, 'focus', show);
  });
  on(window, 'resize', () => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(layout); });
  on(window, 'scroll', () => {
    const current = scrollY, next = current > lastScroll ? 'down' : 'up';
    if (!open && Math.abs(current - lastScroll) > 10 && next !== direction) {
      direction = next;
      move('header', header, {y:direction === 'down' ? -100 : 0}, {type:'spring', stiffness:303, damping:30.2, mass:.5});
    }
    lastScroll = Math.max(0, current);
  }, {passive:true});
  on(window, 'keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key === 'Tab') {
      const focusable = [...panel.querySelectorAll('a[href], button')];
      const first = focusable[0], last = focusable.at(-1), outside = !panel.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || outside)) { event.preventDefault(); first.focus(); }
    }
  });
  on(root, 'touchmove', event => {
    if (open && !content.contains(event.target) && event.touches.length < 2) event.preventDefault();
  }, {passive:false});

  return () => {
    events.abort();
    cancelAnimationFrame(resizeFrame);
    controls.forEach(control => control.stop());
    document.documentElement.style.overflow = savedOverflow[0];
    document.body.style.overflow = savedOverflow[1];
    initialStyles.forEach(([node, style]) => style === null ? node.removeAttribute('style') : node.setAttribute('style', style));
    root.dataset.open = 'false';
    content.inert = true;
    content.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menüyü aç');
  };
}

// Rendered once; after hydration the controller above owns its attributes and styles.
function Nav() {
  const ref = useRef(null);
  useEffect(() => setupNavigation(ref.current), []);
  return <div ref={ref} data-nav-view="top-morphing-navigation" data-open="false">
    <div className="backdrop" data-backdrop aria-hidden="true" />
    <header className="header" data-header>
      <div className="panel" data-panel>
        <div className="bar">
          <a className="home" href="#" data-home data-close aria-label="Zanes İletişim ana sayfa"><span data-mark><ZMark /></span></a>
          <button className="toggle" type="button" data-toggle aria-label="Menüyü aç" aria-expanded="false" aria-controls="ana-menu">
            <span data-top aria-hidden="true" />
            <span data-bottom aria-hidden="true" />
          </button>
        </div>
        <div className="content" id="ana-menu" data-content inert aria-hidden="true">
          <div className="spread">
            <div className="directory">
              <nav className="nav" data-links aria-label="Ana gezinme">
                {links.map((link, i) => <div key={link.href} data-enter>
                  <a href={link.href} data-preview-link={i} data-close><span className="word">{link.label}</span></a>
                </div>)}
              </nav>
            </div>
            <div className="media" data-enter="fade" aria-hidden="true">
              {links.map((link, i) => <Preview key={link.href} kind={link.preview} index={i} />)}
            </div>
            <div className="nav-footer" data-enter>
              <p className="nav-note">Yetkili Vodafone Mağazası</p>
              <a className="nav-call" href={contact.phoneHref} data-close><Icon name="phone" />{contact.phone}</a>
            </div>
          </div>
        </div>
      </div>
    </header>
  </div>;
}

export default memo(Nav);

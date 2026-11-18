import {useEffect} from 'react';

// Newsprint halftone: a grey-scale picture is drawn off screen, then re-printed as a hex grid of dots
// whose size follows the brightness underneath. Everything is seeded, so every visit looks the same.
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function paintHalftone(canvas, draw, {cell, ink, max = .62}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = canvas.clientWidth, height = canvas.clientHeight;
  if (!width || !height) return;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const off = document.createElement('canvas');
  off.width = canvas.width;
  off.height = canvas.height;
  const o = off.getContext('2d', {willReadFrequently:true});
  o.fillStyle = '#000';
  o.fillRect(0, 0, off.width, off.height);
  draw(o, off.width, off.height);
  const data = o.getImageData(0, 0, off.width, off.height).data;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = ink;
  c.beginPath();
  const step = cell * dpr, radius = step * max;
  for (let y = step / 2, row = 0; y < canvas.height; y += step * .866, row++) {
    for (let x = (row % 2) * step / 2; x < canvas.width + step; x += step) {
      const xi = Math.min(canvas.width - 1, Math.round(x)), yi = Math.min(canvas.height - 1, Math.round(y));
      const light = data[(yi * canvas.width + xi) * 4] / 255;
      if (light < .05) continue;
      const r = radius * Math.sqrt(light);
      c.moveTo(x + r, y);
      c.arc(x, y, r, 0, Math.PI * 2);
    }
  }
  c.fill();
}

// Paints once after hydration and again when the canvas changes size.
export function useHalftone(ref, draw, options) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    let timer = 0;
    const paint = () => paintHalftone(canvas, draw, options);
    const later = () => { clearTimeout(timer); timer = setTimeout(paint, 200); };
    paint();
    document.fonts?.ready.then(paint);
    const observer = 'ResizeObserver' in window ? new ResizeObserver(later) : null;
    if (observer) observer.observe(canvas); else addEventListener('resize', later);
    return () => { clearTimeout(timer); if (observer) observer.disconnect(); else removeEventListener('resize', later); };
    // The picture and its options are fixed per canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}

function puff(o, x, y, r, alpha) {
  const g = o.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  o.fillStyle = g;
  o.beginPath();
  o.arc(x, y, r, 0, Math.PI * 2);
  o.fill();
}

export const drawClouds = seed => (o, w, h) => {
  const r = rng(seed);
  o.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 34; i++) puff(o, (r() * 1.3 - .15) * w, h * (.42 + r() * .6), Math.min(w * .13, h * .4) * (.5 + r() * .8), .16 + r() * .22);
  for (let i = 0; i < 12; i++) puff(o, (i / 11) * w, h * (.7 + r() * .2), h * (.35 + r() * .2), .22);
  o.globalCompositeOperation = 'source-over';
  const g = o.createLinearGradient(0, h * .6, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,.5)');
  o.fillStyle = g;
  o.fillRect(0, 0, w, h);
};

// A lattice mobile mast with antenna panels and dishes.
export function drawTower(o, w, h) {
  o.strokeStyle = '#fff';
  o.lineCap = 'round';
  const lw = Math.max(3, w * .028), top = h * .24, bl = w * .24, br = w * .76, tl = w * .42, tr = w * .58;
  const xl = y => bl + (tl - bl) * (h - y) / (h - top), xr = y => br + (tr - br) * (h - y) / (h - top);
  o.lineWidth = lw * 1.25;
  o.beginPath(); o.moveTo(bl, h); o.lineTo(tl, top); o.moveTo(br, h); o.lineTo(tr, top); o.stroke();
  o.lineWidth = lw * .7;
  o.beginPath();
  for (let y = top, step = h * .06; y < h; step *= 1.12) {
    const ny = Math.min(h, y + step);
    o.moveTo(xl(y), y); o.lineTo(xr(y), y);
    o.moveTo(xl(y), y); o.lineTo(xr(ny), ny);
    o.moveTo(xr(y), y); o.lineTo(xl(ny), ny);
    y = ny;
  }
  o.stroke();
  o.lineWidth = lw * .8;
  o.beginPath(); o.moveTo(w * .5, top); o.lineTo(w * .5, h * .015);
  for (let k = 1; k < 5; k++) { const y = top - k * (top - h * .03) / 5; o.moveTo(w * .47, y); o.lineTo(w * .53, y); }
  o.stroke();
  o.lineWidth = lw * .9;
  o.beginPath(); o.moveTo(w * .14, top); o.lineTo(w * .86, top); o.moveTo(w * .14, top + h * .075); o.lineTo(w * .86, top + h * .075); o.stroke();
  const panel = (x, y, pw, ph) => { const g = o.createLinearGradient(x, 0, x + pw, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, '#8a8a8a'); o.fillStyle = g; o.fillRect(x, y, pw, ph); };
  panel(w * .03, top - h * .02, w * .1, h * .15); panel(w * .87, top - h * .02, w * .1, h * .15);
  panel(w * .17, top + h * .005, w * .07, h * .12); panel(w * .76, top + h * .005, w * .07, h * .12);
  panel(w * .455, top + h * .09, w * .09, h * .08);
  o.fillStyle = '#ddd';
  o.beginPath(); o.ellipse(w * .3, top + h * .17, w * .05, w * .07, 0, 0, Math.PI * 2); o.ellipse(w * .7, top + h * .15, w * .05, w * .07, 0, 0, Math.PI * 2); o.fill();
}

function roundRect(o, x, y, w, h, r) {
  o.beginPath();
  o.moveTo(x + r, y);
  o.arcTo(x + w, y, x + w, y + h, r); o.arcTo(x + w, y + h, x, y + h, r);
  o.arcTo(x, y + h, x, y, r); o.arcTo(x, y, x + w, y, r);
  o.closePath();
}
const shade = (o, y0, y1, from, to) => { const g = o.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, from); g.addColorStop(1, to); return g; };

const objects = {
  phone(o, w, h) {
    const s = Math.min(w, h), pw = s * .36, ph = s * .66, x = w * .5 - pw / 2, y = h * .14;
    o.save(); o.translate(w * .5, h * .47); o.rotate(-.12); o.translate(-w * .5, -h * .47);
    o.fillStyle = shade(o, y, y + ph, '#fff', '#9a9a9a'); roundRect(o, x, y, pw, ph, s * .06); o.fill();
    o.fillStyle = shade(o, y, y + ph, '#5a5a5a', '#1c1c1c'); roundRect(o, x + s * .025, y + s * .05, pw - s * .05, ph - s * .1, s * .03); o.fill();
    o.restore();
  },
  headphones(o, w, h) {
    const s = Math.min(w, h);
    o.strokeStyle = '#fff'; o.lineWidth = s * .07;
    o.beginPath(); o.arc(w * .5, h * .5, s * .27, Math.PI * 1.04, Math.PI * 1.96); o.stroke();
    o.fillStyle = shade(o, h * .45, h * .75, '#fff', '#8c8c8c');
    roundRect(o, w * .5 - s * .34, h * .45, s * .15, s * .3, s * .06); o.fill();
    roundRect(o, w * .5 + s * .19, h * .45, s * .15, s * .3, s * .06); o.fill();
  },
  sim(o, w, h) {
    const s = Math.min(w, h), cw = s * .44, ch = s * .58, x = -cw / 2, y = -ch / 2;
    o.save(); o.translate(w * .5, h * .46); o.rotate(.1);
    o.fillStyle = shade(o, y, y + ch, '#fff', '#a0a0a0');
    o.beginPath(); o.moveTo(x, y); o.lineTo(x + cw * .72, y); o.lineTo(x + cw, y + cw * .28); o.lineTo(x + cw, y + ch); o.lineTo(x, y + ch); o.closePath(); o.fill();
    o.fillStyle = '#2a2a2a'; roundRect(o, x + cw * .22, y + ch * .38, cw * .56, ch * .34, s * .03); o.fill();
    o.strokeStyle = '#bbb'; o.lineWidth = s * .012;
    o.beginPath(); o.moveTo(0, y + ch * .38); o.lineTo(0, y + ch * .72); o.moveTo(x + cw * .22, y + ch * .55); o.lineTo(x + cw * .78, y + ch * .55); o.stroke();
    o.restore();
  },
};

// Service card: the object floats above a low cloud bank, like the mast in the hero.
export const drawCardArt = kind => (o, w, h) => {
  const r = rng(kind.length * 13);
  o.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) puff(o, (r() * 1.2 - .1) * w, h * (.78 + r() * .3), Math.min(w * .18, h * .3) * (.6 + r() * .7), .18 + r() * .2);
  o.globalCompositeOperation = 'source-over';
  objects[kind](o, w, h);
};

// Stylised Istanbul in 1000 × 520 units. The visible window is x 220…920; narrow phones use x 300…820
// (see .map in style.css) so the three Şişli stores do not crowd each other.
export const MAP = {x:220, width:700, height:520};
export function mapWindow(element) {
  const style = getComputedStyle(element);
  return {x:parseFloat(style.getPropertyValue('--map-x')) || MAP.x, width:parseFloat(style.getPropertyValue('--map-w')) || MAP.width};
}
export function drawMap(o, w, h, view = MAP) {
  o.save();
  o.scale(w / view.width, h / MAP.height);
  o.translate(-view.x, 0);
  // Land fades out toward the edges like a printed vignette.
  o.save(); o.translate(575, 265); o.scale(1.15, 1);
  const g = o.createRadialGradient(0, 0, 20, 0, 0, 300);
  g.addColorStop(0, 'rgb(170,170,170)'); g.addColorStop(.45, 'rgb(125,125,125)'); g.addColorStop(.82, 'rgb(45,45,45)'); g.addColorStop(1, 'rgb(0,0,0)');
  o.fillStyle = g; o.fillRect(-400, -300, 800, 600);
  o.restore();
  o.fillStyle = '#000';
  o.fill(new Path2D('M0 0H1000V34C860 58 760 26 640 40C520 54 430 30 300 44C190 56 90 36 0 52Z'));
  o.fill(new Path2D('M0 436L300 420C380 414 440 404 478 398C540 404 610 424 690 450C790 482 890 498 1000 504V520H0Z'));
  o.strokeStyle = '#000'; o.lineCap = 'round';
  o.lineWidth = 26; o.stroke(new Path2D('M610 38C590 100 560 150 548 205C538 250 528 300 512 340C502 366 492 384 482 400'));
  o.lineWidth = 9; o.stroke(new Path2D('M512 338C480 332 452 322 425 318C410 316 398 320 388 328'));
  o.restore();
}

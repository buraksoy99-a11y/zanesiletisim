import {useEffect, useState} from 'react';
import {stores} from './stores';

const toMinutes = time => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
const pad = value => String(value).padStart(2, '0');
const countWords = ['hiçbiri', 'biri', 'ikisi', 'üçü', 'dördü', 'beşi'];

export function istanbulMinutes(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Europe/Istanbul', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(date);
    const get = type => Number(parts.find(part => part.type === type).value);
    return get('hour') * 60 + get('minute');
  } catch {
    // Türkiye stays on UTC+3 all year.
    return Math.floor(date.getTime() / 60000 + 180) % 1440;
  }
}

// Server render and first client render stay identical (null); the clock starts after hydration.
export function useIstanbulMinutes() {
  const [now, setNow] = useState(null);
  useEffect(() => {
    const tick = () => setNow(istanbulMinutes());
    tick();
    const timer = setInterval(tick, 20000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function storeStatus(store, now) {
  const open = toMinutes(store.open);
  const close = toMinutes(store.close);
  if (now >= open && now < close) {
    const left = close - now;
    return {open:true, text:left <= 60 ? `Açık, kapanışa ${left} dk` : `Açık, kapanış ${store.close}`};
  }
  return {open:false, text:`Kapalı, açılış ${store.open}`};
}

export function summary(now) {
  const time = `${pad(Math.floor(now / 60))}:${pad(now % 60)}`;
  const openCount = stores.filter(store => storeStatus(store, now).open).length;
  if (openCount === stores.length) return `İstanbul’da saat ${time}. Altı mağazamızın hepsi şu an açık.`;
  if (openCount > 0) return `İstanbul’da saat ${time}. Altı mağazamızın ${countWords[openCount]} şu an açık.`;
  const first = stores.map(store => store.open).sort()[0];
  return `İstanbul’da saat ${time}. Mağazalarımız şu an kapalı, ilk açılış ${first}.`;
}

export function distanceKm(a, b) {
  const rad = degrees => degrees * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km) {
  if (km < 1) return `${Math.max(50, Math.round(km * 20) * 50)} m`;
  return `${km.toLocaleString('tr-TR', {maximumFractionDigits:km < 10 ? 1 : 0})} km`;
}

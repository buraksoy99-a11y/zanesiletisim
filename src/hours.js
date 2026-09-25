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

export const clockDigits = now => `${pad(Math.floor(now / 60))}${pad(now % 60)}`;

export function openSummary(now) {
  const openCount = stores.filter(store => storeStatus(store, now).open).length;
  if (openCount === stores.length) return 'Altı mağazamızın hepsi şu an açık.';
  if (openCount > 0) return `Altı mağazamızın ${countWords[openCount]} şu an açık.`;
  const first = stores.map(store => store.open).sort()[0];
  return `Mağazalarımız şu an kapalı, ilk açılış ${first}.`;
}

// Approximate Istanbul sunrise/sunset for the sky; it only has to feel right, not be astronomical.
function sunTimes(date = new Date()) {
  const local = new Date(date.getTime() + 180 * 60000);
  const day = (local - Date.UTC(local.getUTCFullYear(), 0, 1)) / 86400000;
  const halfDay = (12 + 2.95 * Math.sin(2 * Math.PI * (day - 80) / 365)) * 30 + 6;
  return {rise:785 - halfDay, set:785 + halfDay};
}

export function skyPhase(now) {
  if (now === null) return 'day';
  const {rise, set} = sunTimes();
  if (now < rise - 40 || now >= set + 40) return 'night';
  if (now < rise + 35) return 'dawn';
  if (now < set - 80) return 'day';
  return 'dusk';
}

// Sun position in scene units along an arc from the European to the Anatolian horizon.
export function sunPosition(now) {
  if (now === null) return {x:1016, y:89, low:false};
  const {rise, set} = sunTimes();
  const t = (now - rise) / (set - rise);
  if (t < -.03 || t > 1.03) return null;
  return {x:Math.round(80 + 1440 * t), y:Math.round(330 - 270 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)))), low:t < .12 || t > .88};
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

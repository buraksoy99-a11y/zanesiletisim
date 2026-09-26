import {stores, contact} from '../../src/stores.js';
import {ratings, topics, COMMENT_MAX, TRAP_FIELD} from '../../src/feedback-fields.js';

// Site feedback is mailed to the shop inbox through Cloudflare Email Service. Pages Functions have no email
// binding of their own, so the mail goes through the private mailer Worker bound as MAILER (workers/mailer).
// Burak's inbox for now (2026-09-26); info@zanes.com.tr takes over once someone with that inbox verifies it.
// Must match destination_address in workers/mailer/wrangler.jsonc, or the mailer refuses the message.
const TO = 'burakaksoy@zanes.com.tr';
const FROM = 'geribildirim@zanesiletisim.info';
const MAX_BODY = 8192;

const escapeHtml = text => text.replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[ch]);

// Only answers the page can produce are accepted; anything else is rejected rather than trimmed.
export function readFeedback(input) {
  const puan = Number(input.puan);
  if (!Number.isInteger(puan) || puan < 1 || puan > 5) return null;
  const store = input.magaza ? stores.find(s => s.id === input.magaza) : null;
  if (store === undefined) return null;
  const picked = input.konular ?? [];
  if (!Array.isArray(picked) || picked.some(topic => !topics.includes(topic))) return null;
  const yorum = typeof input.yorum === 'string' ? input.yorum.trim() : '';
  if (yorum.length > COMMENT_MAX) return null;
  return {puan, store, konular:topics.filter(topic => picked.includes(topic)), yorum};
}

export function composeMail({puan, store, konular, yorum}, now = new Date()) {
  const where = store ? store.name : 'Mağaza belirtilmedi';
  const when = new Intl.DateTimeFormat('tr-TR', {timeZone:'Europe/Istanbul', dateStyle:'long', timeStyle:'short'}).format(now);
  // Low ratings lead the subject so they stand out in the inbox.
  const subject = `${puan <= 2 ? 'Düşük puan' : 'Geribildirim'}: ${puan}/5 ${ratings[puan - 1]} · ${where}`;
  const rows = [['Puan', `${puan}/5 (${ratings[puan - 1]})`], ['Mağaza', where], ['Konular', konular.join(', ') || '—'], ['Tarih', when]];
  const footer = 'zanesiletisim.info geribildirim formundan gönderildi.';
  const text = [...rows.map(([label, value]) => `${label}: ${value}`), '', 'Yorum:', yorum || '—', '', footer].join('\n');
  const html = `<table style="border-collapse:collapse;font:15px/1.5 Arial,sans-serif">${rows.map(([label, value]) => `<tr><td style="padding:4px 16px 4px 0;color:#5b5b5b">${label}</td><td style="padding:4px 0;font-weight:bold">${escapeHtml(value)}</td></tr>`).join('')}</table>`
    + `<p style="font:bold 15px Arial,sans-serif;margin:20px 0 6px">Yorum</p><p style="font:15px/1.5 Arial,sans-serif;white-space:pre-wrap;margin:0">${escapeHtml(yorum || '—')}</p>`
    + `<p style="font:13px Arial,sans-serif;color:#5b5b5b;margin-top:24px">${footer}</p>`;
  return {to:TO, from:FROM, subject, text, html};
}

// Visitors without JavaScript post the plain form and get a small page back instead of JSON.
function page(status) {
  const [title, text] = status === 200
    ? ['Teşekkürler', 'Görüşünüz bize ulaştı. Yine bekleriz!']
    : ['Gönderilemedi', `Lütfen tekrar deneyin ya da bizi arayın: <a href="${contact.phoneHref}">${contact.phone}</a>`];
  return new Response(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Zanes İletişim</title></head>`
    + `<body style="max-width:560px;margin:15vh auto;padding:0 20px;font:18px/1.5 system-ui,sans-serif"><h1>${title}</h1><p>${text}</p><p><a href="/#geribildirim">Siteye dön</a></p></body></html>`,
  {status, headers:{'Content-Type':'text/html; charset=utf-8'}});
}

export async function onRequestPost({request, env}) {
  const isJson = (request.headers.get('content-type') || '').includes('application/json');
  const answer = status => isJson ? Response.json({ok:status === 200}, {status}) : page(status);
  // Browsers always send Origin on a POST; posts from other sites are refused.
  if (request.headers.get('origin') !== new URL(request.url).origin) return answer(403);
  if (Number(request.headers.get('content-length')) > MAX_BODY) return answer(413);
  let input;
  try {
    if (isJson) input = await request.json();
    else {
      const form = await request.formData();
      input = {puan:form.get('puan'), magaza:form.get('magaza'), konular:form.getAll('konu'), yorum:form.get('yorum'), [TRAP_FIELD]:form.get(TRAP_FIELD)};
    }
  } catch {
    return answer(400);
  }
  if (!input || typeof input !== 'object') return answer(400);
  if (input[TRAP_FIELD]) return answer(200);
  const feedback = readFeedback(input);
  if (!feedback) return answer(400);
  if (!env.MAILER) { console.error('feedback: MAILER binding is missing'); return answer(503); }
  try {
    const response = await env.MAILER.fetch('https://mailer/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(composeMail(feedback))});
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error(`mailer ${response.status} ${result?.code ?? ''}`);
  } catch (error) {
    console.error('feedback: mail failed', error.message);
    return answer(503);
  }
  return answer(200);
}

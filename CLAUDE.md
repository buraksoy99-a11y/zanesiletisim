# zanesiletisim.info — Zanes İletişim Kurumsal Web Sitesi

## Proje Özeti
Zanes İletişim'in (Vodafone Business Partner) kurumsal tanıtım sitesi. "İki yaka" hat tasarımı (Eylül 2026, 16 Eylül GPT tasarımının yerine), İstanbul'daki 6 mağazayı tanıtır. Geliştirme/yayın ayrıntıları README.md içindedir.

## Teknik Stack
| Karar | Değer |
|-------|-------|
| Kaynak | `src/App.jsx`, tek sayfalık React |
| CSS | Yerel `src/style.css`, harici CDN yok |
| İkonlar | Yerel SVG bileşenleri |
| Font | Yerel DM Sans |
| Deploy | esbuild + React prerender → Cloudflare Pages `dist/` |
| Domain | `zanesiletisim.info` (Cloudflare DNS, CNAME → `zanesiletisim.pages.dev`) |
| GitHub | `buraksoy99-a11y/zanesiletisim` |

## Dosya Yapısı
```
src/            — React bileşenleri, stiller, mağaza verisi ve hareketler
index.html      — Üretim metadatası ve HTML şablonu
build.cjs       — Statik HTML + hashli JS/CSS üretimi
dist/           — Yalnız bu klasör yayınlanır (Git dışı)
functions/      — Pages Function: /api/geribildirim → info@zanes.com.tr maili (deploy kökten koşulunca birlikte yüklenir)
workers/mailer/ — Dışa kapalı postacı Worker'ı (ayrı deploy: wrangler deploy --config workers/mailer/wrangler.jsonc)
wrangler.toml   — Pages proje ayarları (MAILER servis bağlantısı); tek kaynak
favicon.svg     — Kırmızı "Z" lettermark SVG favicon
robots.txt      — Search engine crawl directives
sitemap.xml     — Basit sitemap (tek URL)
```

## Renk Paleti (Vodafone kırmızı — bayi uyumu)
- Primary: `#e60000` (Vodafone kırmızısı)
- Background: `#f5f5f5`
- Text: `#171717`; nötr siyah/beyaz/gri
- Light theme

## Site Bölümleri
1. **Üst menü** — Rounded-Z işareti, masaüstünde 4 bağlantı + telefon düğmesi; telefonda yalnız "Ara" düğmesi (hamburger yok)
2. **Hero** — "İki yaka, altı mağaza." + "En yakın mağazayı bul" (konum yalnız tarayıcıda hesaplanır, dışarı gönderilmez). Altında SVG Boğaz panoraması (`src/Scene.jsx`): gökyüzü İstanbul saatine göre `data-phase` day/dawn/dusk/night (gece hero koyu, yazı beyaz — Burak onayı 2026-09-25), mağaza pinleri açık/kapalı, köprüden geçen tren. Telefonda panorama iki yaka arasında yavaşça kayar
3. **Mağazalarımız (hat)** — Mağazalar metro hat şeridi gibi tek kırmızı hatta durak; Boğaz'ı köprüyle geçer. 1180px altında dikey hat. Canlı açık/kapalı durumu İstanbul saatiyle hesaplanır (saatler her gün geçerli varsayılır). Saat kalkış tablosu karolarıyla; tren kaydırmayla ilerler
4. **Hizmetler** — Telefon, aksesuar ve Vodafone işlemleri; her satırda görününce kendini çizen SVG (`src/Art.jsx`)
5. **Hakkımızda** — 25 yıllık deneyim, Vodafone Business Partner, 4 Avrupa + 2 Anadolu mağazası; "25" metro hattı olarak çizilir
6. **Geribildirim ("Ziyaretiniz nasıldı?")** — Puana göre ifadesi değişen SVG yüz (`src/Feedback.jsx`); puan 5 duraklı hat, sorular dikey hatta durak. Gönderince tren notu "Zanes" durağına taşır, tablo "TEŞEKKÜRLER" döner. `/api/geribildirim`e JSON gönderir (JavaScript'siz düz form); `functions/api/geribildirim.js` dışa kapalı `workers/mailer` Worker'ı (Email Service `send_email` bağlantısı) üzerinden info@zanes.com.tr'ye mail atar (Burak kararı 2026-09-25: panel yok, e-posta). Token yok; Pages bağlantıları `wrangler.toml`'da. Postacıya ulaşılamazsa 503. Kişisel bilgi alanı yok
7. **İletişim** — Kırmızı bant, büyük telefon numarası, e-posta, adres

## Mağazalar
| Site Adı | Ambar Kodu | Saat |
|----------|-----------|------|
| Mecidiyeköy Mağaza | MERKEZ | 09:00–21:00 |
| İstinyePark AVM | İSTİNYEPARK | 10:00–22:00 |
| Bağdat Caddesi Mağazası | ŞAŞKINBAKKAL | 09:00–21:00 |
| Akasya AVM | AKASYA | 10:00–22:00 |
| Cevahir AVM | CEVAHİR | 10:00–22:00 |
| ÖzdilekPark AVM | ÖZDİLEK | 10:00–22:00 |

## İletişim
- Telefon: 0545 363 64 64
- Email: info@zanes.com.tr

## Deploy
```bash
npm ci
npm run build
npm test
npx wrangler@4.132.0 pages deploy dist --project-name zanesiletisim --branch main
```

## Kurallar
- **Türkçe karakterler zorunlu** (ş, ç, ğ, ı, ö, ü) tüm UI text'lerinde
- **Build zorunlu** — yalnız `dist/` yayınlanır; kök şablon veya kaynak klasörü yayınlanmaz. Onaylı tasarım korunur.
- **Harici görsel yok** — CSS/SVG çizimleri ve yerel DM Sans kullanılır.
- **Mağaza verisi tek yerde** — `src/stores.js` (hat sırası, saatler, yaklaşık koordinat, harita hedefi). Harita linkleri `tests/map-links.json` ile korunur.
- **Teknik servis/tamir yok** — hizmetlerde sadece telefon satışı ve aksesuar
- **Tarife/paket bilgisi yok** — Vodafone'un işi, bayinin değil

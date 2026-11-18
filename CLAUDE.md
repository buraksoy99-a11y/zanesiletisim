# zanesiletisim.com — Zanes İletişim Kurumsal Web Sitesi

## Proje Özeti
Zanes İletişim'in (Vodafone Business Partner) kurumsal tanıtım sitesi. "Kırmızı panel + halftone" tasarımı (Kasım 2026, "İki yaka" hat tasarımının yerine; Burak 2026-11-18: Details'teki a1mobile açılışı tek görsel dil, başka sitelerden bölüm birleştirme yok), İstanbul'daki 6 mağazayı tanıtır. Geliştirme/yayın ayrıntıları README.md içindedir.

## Teknik Stack
| Karar | Değer |
|-------|-------|
| Kaynak | `src/App.jsx`, tek sayfalık React |
| CSS | Yerel `src/style.css`, harici CDN yok |
| İkonlar | Yerel SVG bileşenleri |
| Font | Yerel DM Sans |
| Deploy | esbuild + React prerender → Cloudflare Pages `dist/` |
| Domain | `zanesiletisim.com` + `www` (Cloudflare DNS, Pages custom domain → `zanesiletisim.pages.dev`). Eski `zanesiletisim.info` 3 Kasım 2026'dan beri .com'a yönlenir ve 31 Ocak 2027'ye kadar kaldırılır; geribildirim göndericisi `geribildirim@zanesiletisim.info` (Email Routing yalnız .info'da) o tarihe kadar .com'a taşınır |
| GitHub | `buraksoy99-a11y/zanesiletisim` |

## Dosya Yapısı
```
src/            — React bileşenleri, stiller, mağaza verisi ve hareketler
index.html      — Üretim metadatası ve HTML şablonu
build.cjs       — Statik HTML + hashli JS/CSS üretimi
dist/           — Yalnız bu klasör yayınlanır (Git dışı)
functions/      — Pages Function: /api/geribildirim → geribildirim maili (şimdilik burakaksoy@zanes.com.tr) (deploy kökten koşulunca birlikte yüklenir)
workers/mailer/ — Dışa kapalı postacı Worker'ı (ayrı deploy: wrangler deploy --config workers/mailer/wrangler.jsonc)
wrangler.toml   — Pages proje ayarları (MAILER servis bağlantısı); tek kaynak
favicon.svg     — Kırmızı "Z" lettermark SVG favicon
robots.txt      — Search engine crawl directives
sitemap.xml     — Basit sitemap (tek URL)
```

## Renk Paleti (Vodafone kırmızı — bayi uyumu)
- Primary: `#e60000` (Vodafone kırmızısı); kırmızı yuvarlak paneller
- Background: `#f6f4ef` (kâğıt beyazı); krem panel `#ece4d8`
- Text: `#141414`; halftone mürekkebi `#fff4ee` (kırmızı üstü), `#1d0606` (kule)
- Light theme (Burak 2026-11-18: açık)

## Site Bölümleri
1. **Menü** (`src/Nav.jsx`) — Details Vault "Top Morphing Navigation": üstte ortada buzlu koyu çubuk (Z işareti + menü düğmesi); basınca panele dönüşür, linkler sırayla gelir, her linkin yanında halftone önizleme değişir. Aşağı kaydırınca saklanır, yukarı kaydırınca döner. `motion` paketiyle (sürüm sabit). Esc/dışarı tıklama kapatır, odak düğmeye döner
2. **Açılış** — Kırmızı yuvarlak panel: halftone bulutlar ve baz istasyonu kulesi (`src/halftone.js`, canvas), bir kez gelip duran pankartlı uçak, mağaza adlarını döndüren üst satır. "Telefon, hat ve fatura. Hepsi tek adreste." + "En yakın mağaza" (konum yalnız tarayıcıda hesaplanır, dışarı gönderilmez) + Vault "Arrow Shift" cam buton "Bizi arayın"
3. **Hizmetler** — Telefon, aksesuar, Vodafone işlemleri; her biri kırmızı halftone çizimli kart + kâğıt etiket
4. **Mağazalar** — Krem panel: mağaza listesi (canlı açık/kapalı İstanbul saatiyle, saatler her gün geçerli varsayılır; yol tarifi) + halftone İstanbul haritası, numaralı pinler (kapalı mağaza gri). Satır ↔ pin üzerine gelince birlikte yanar. Pin konumu `stores.js` `mx/my`
5. **Geribildirim ("Ziyaretiniz nasıldı?")** — Krem panelde. Puana göre ifadesi değişen SVG yüz (`src/Feedback.jsx`); puan 5 duraklı hat, sorular dikey hatta durak. Gönderince tren notu "Zanes" durağına taşır, tablo "TEŞEKKÜRLER" döner. `/api/geribildirim`e JSON gönderir (JavaScript'siz düz form); `functions/api/geribildirim.js` dışa kapalı `workers/mailer` Worker'ı (Email Service `send_email` bağlantısı) üzerinden mail atar (Burak kararı 2026-09-25: panel yok, e-posta). Alıcı şimdilik burakaksoy@zanes.com.tr (Burak kararı 2026-09-26, info@ kutusu erişilebilir olunca oraya döner; fonksiyondaki `TO` ile postacının `destination_address`'i birlikte değişir). Token yok; Pages bağlantıları `wrangler.toml`'da. Postacıya ulaşılamazsa 503. Kişisel bilgi alanı yok
6. **İletişim** — Kırmızı panel + halftone bulutlar: "Arayın, yardımcı olalım.", telefon düğmesi, e-posta (cam buton), adres
7. **Alt bilgi** — Logo + "Teknolojiye güvenle ulaşın.", mağaza ve sayfa sütunları

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
- **Harici görsel yok** — CSS/SVG/canvas halftone çizimleri ve yerel DM Sans kullanılır (menü önizlemeleri de halftone, fotoğraf değil).
- **Tek görsel dil** — Yeni bölüm başka bir siteden referansla eklenmez; açılışın dili (kırmızı/krem panel, grain, halftone) sürdürülür (Burak 2026-11-18).
- **Mağaza verisi tek yerde** — `src/stores.js` (sıra, saatler, yaklaşık koordinat, harita üstündeki `mx/my`, harita hedefi). Harita linkleri `tests/map-links.json` ile korunur.
- **Teknik servis/tamir yok** — hizmetlerde sadece telefon satışı ve aksesuar
- **Tarife/paket bilgisi yok** — Vodafone'un işi, bayinin değil

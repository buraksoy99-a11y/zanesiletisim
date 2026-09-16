# zanesiletisim.info — Zanes İletişim Kurumsal Web Sitesi

## Proje Özeti
Zanes İletişim'in (Vodafone Business Partner) kurumsal tanıtım sitesi. 16 Eylül 2026'da onaylanan React tasarımı, İstanbul'daki 6 lokasyonu tanıtır. Geliştirme/yayın ayrıntıları README.md içindedir.

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
1. **Üst menü** — Kırmızı logo, sabit gezinme, mobil disclosure menüsü
2. **Hero** — Vodafone Business Partner, onaylanan telefon illüstrasyonu
3. **Hizmetler** — Telefon, aksesuar ve Vodafone işlemleri
4. **Hakkımızda** — 25 yıllık deneyim, 06 lokasyon
5. **Mağazalarımız** — Korunan altı adres ve harita bağlantısı
6. **İletişim** — Telefon, e-posta, adres; hover/odak okları

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
- **Harici görsel yok** — onaylı dekoratif CSS/SVG çizimleri ve yerel fontlar kullanılır.
- **Teknik servis/tamir yok** — hizmetlerde sadece telefon satışı ve aksesuar
- **Tarife/paket bilgisi yok** — Vodafone'un işi, bayinin değil

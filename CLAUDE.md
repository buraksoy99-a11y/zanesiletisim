# zanesiletisim.info — Zanes İletişim Kurumsal Web Sitesi

## Proje Özeti
Zanes İletişim'in (Vodafone yetkili bayisi) kurumsal tanıtım sitesi. Tek sayfalık statik HTML, İstanbul'daki 6 mağazayı tanıtır.

## Teknik Stack
| Karar | Değer |
|-------|-------|
| Dosya | Tek `index.html` (single-page, scroll) |
| CSS | Tailwind CDN (`cdn.tailwindcss.com`) |
| İkonlar | Material Symbols Outlined (Google Fonts) |
| Font | Inter (Google Fonts) |
| Deploy | Cloudflare Pages (statik, build step yok) |
| Domain | `zanesiletisim.info` (Cloudflare DNS, CNAME → `zanesiletisim.pages.dev`) |
| GitHub | `buraksoy99-a11y/zanesiletisim` |

## Dosya Yapısı
```
index.html      — Tüm site (navbar, hero, hizmetler, mağazalar, neden biz, footer)
favicon.svg     — Kırmızı "Z" lettermark SVG favicon
robots.txt      — Search engine crawl directives
sitemap.xml     — Basit sitemap (tek URL)
```

## Renk Paleti (Vodafone kırmızı — bayi uyumu)
- Primary: `#b70100` (koyu kırmızı)
- Primary container: `#e60000` (parlak kırmızı)
- Background: `#f9f9f9`
- Text: `#1a1c1c`
- Light theme

## Site Bölümleri
1. **Navbar** — Glassmorphic, anchor linkler, hamburger menü (mobil)
2. **Hero** — "Vodafone Yetkili Bayi" badge, "Teknolojiye Güvenle Ulaşın" başlık
3. **Hizmetler Bento** — Akıllı Telefon Satışı (2/3) + Aksesuar (1/3)
4. **Mağazalarımız** — 6 kart, 3x2 grid (gerçek adresler + saatler)
5. **Neden Zanes?** — Trust signals (10+ Yıl, 6 Mağaza, Vodafone Yetkili)
6. **Footer** — 4 sütun, iletişim bilgileri, KVKK

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
cd ~/AutomationLocal/zanesiletisim
npx wrangler pages deploy . --project-name zanesiletisim --branch main
```

## Kurallar
- **Türkçe karakterler zorunlu** (ş, ç, ğ, ı, ö, ü) tüm UI text'lerinde
- **Tailwind CDN** — build step yok, `index.html` doğrudan serve edilir
- **Harici görsel yok** — placeholder'lar CSS gradient ile yapılmış
- **Teknik servis/tamir yok** — hizmetlerde sadece telefon satışı ve aksesuar
- **Tarife/paket bilgisi yok** — Vodafone'un işi, bayinin değil

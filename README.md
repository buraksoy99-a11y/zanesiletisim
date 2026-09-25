# Zanes İletişim

"İki yaka" hat tasarımı (Eylül 2026). Mevcut Cloudflare Pages projesi `zanesiletisim` ve alan adı `zanesiletisim.info` korunur. AutomationLocal backend'i veya diğer uygulamalar bu bağımsız deponun parçası değildir.

## Geliştirme ve doğrulama

```bash
npm ci
npx playwright install chromium webkit
npm run build
npm test
```

- `src/`: onaylanan tasarım, yerel SVG ikonları ve hareketler.
- `index.html`: üretim metadatasını içeren HTML şablonu; doğrudan yayınlanmaz.
- `build.cjs`: React içeriğini HTML'e önceden işler, istemciyi hydrate eder ve hashli JS/CSS üretir.
- `dist/`: tek yayın çıktısı. Kaynak, testler, ekran görüntüleri ve source map içermez.
- `verify.cjs`: kendi geçici loopback sunucusunu açar. İki tarayıcı motorunda (Chromium + WebKit) 13 genişlikte taşma/kırpılma ve hat hizası, sabit saatle canlı açık/kapalı durumu, sahte konumla en yakın mağaza, geribildirim formu (eksik puan, gönderilen veri, hata durumu) ve mail fonksiyonu (doğrulama, mail içeriği, köken/bot kontrolü, 503), dokunma hedefleri, reduced-motion ve JavaScript olmadan içerik kontrollerini çalıştırır. `BASE_URL` verilirse aynı kontroller bu adrese yönelir. Sonuçlar `artifacts/` altında; Git'e girmez.
- CI yalnız taslak PR hazır olduğunda veya elle başlatıldığında GitHub-hosted runner'da çalışır; hiçbir üretim sırrı istemez.

## Yayın

Yalnız kullanıcının açık yayın onayıyla ve test edilmiş kaynakla:

```bash
npx wrangler@4.132.0 whoami
npx wrangler@4.132.0 pages project list
npx wrangler@4.132.0 pages deployment list --project-name zanesiletisim
npm run build
npx wrangler@4.132.0 pages deploy dist --project-name zanesiletisim --branch main
```

`pages deploy` depo kökünden koşulur; böylece `functions/` da yüklenir. Geribildirim maili için Pages projesinde iki secret gerekir: `EMAIL_API_TOKEN` ("Email Sending: Edit" yetkili API token) ve `CF_ACCOUNT_ID`. Değerler dosyaya/loga yazılmaz, `npx wrangler@4.132.0 pages secret put <AD> --project-name zanesiletisim` istemine yapıştırılır. Ön koşul (bir kez, panelden): `zanesiletisim.info` Email Service'e onboard edilir, info@zanes.com.tr doğrulanmış hedef adres yapılır. Doğrulanmış adrese gönderim her planda ücretsizdir. Secret yoksa form 503 döner ve ziyaretçiye telefon önerilir.

Projeyi yeniden oluşturma, DNS/SSL veya diğer Cloudflare projelerini değiştirme. Yayından önce önceki başarılı üretim sürümünü kaydet. Sonuç belirsizse yeniden yüklemek yerine deployment listesini kontrol et. Yayından sonra ana alan adında yeni içerik, JS/CSS/font yanıtları, e-posta bağlantısı ve tarayıcı hataları kontrol edilir. Sorunda önceki başarılı Pages sürümüne geri dönülür.

Wrangler oturumu süresi dolmuşsa kullanıcının kendi tarayıcısından giriş onayı gerekir. Sırlar dosyaya veya loga kopyalanmaz. Giriş için yalnız `account:read user:read pages:write` kapsamları yeterlidir; araç yenileme kapsamını kendisi ekler.

## İçerik ve yayın farkları

- 25 yıllık deneyim, 06 lokasyon, Business Partner ve hizmet metinleri kullanıcı tarafından verilip onaylandı; bağımsız işletme/ürün iddiası doğrulaması değildir.
- Altı mağazanın adresleri, saatleri, telefon/e-posta ve harita hedefleri önceki siteden korunur.
- Yerel önizleme ibaresi üretimde “Tüm hakları saklıdır.” olur; noindex kaldırılmış, canonical/robots/sitemap ve yapılandırılmış veri korunmuştur.
- Cloudflare'ın e-posta gizleme işleminin React HTML'ini değiştirmemesi için kök `email_off` yorumlarıyla sarılır; alan adı genelindeki güvenlik ayarları değiştirilmez.
- Palet #E60000 / siyah / beyaz + Boğaz mavisi. "Canlı İstanbul" (Eylül 2026): üstte SVG Boğaz panoraması İstanbul saatine göre gündüz/akşam/gece olur, açık mağazalar sinyal atar, tren hattı dolaşır; hat bölümünde tren kaydırmayla ilerler; hizmet çizimleri, metro "25" ve telefon sayacı görününce oynar. Hareket azaltma tercihinde hepsi durağandır, JavaScript'siz ziyaretçi tamamlanmış hali görür. Harici CDN, fotoğraf veya izleme yok.
- Tek form "Ziyaretiniz nasıldı?" geribildirimidir: puan, mağaza, konu ve isteğe bağlı yorum `/api/geribildirim` adresine gider (JavaScript ile JSON, olmadan düz form). `functions/api/geribildirim.js` (Pages Function) cevabı doğrular ve Cloudflare Email Service REST API'siyle info@zanes.com.tr'ye mail atar; 1-2 puan konu satırında "Düşük puan" diye başlar. Kişisel bilgi alanı yoktur; botlar için gizli `website` alanı ve aynı-site (Origin) kontrolü vardır.

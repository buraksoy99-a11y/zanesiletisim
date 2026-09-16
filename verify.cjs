const {chromium, webkit} = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const output = path.join(__dirname,'artifacts');
fs.mkdirSync(output,{recursive:true});
let base = process.env.BASE_URL;
let localServer;
const originalMaps = require('./tests/map-links.json');
const report = {iteration:3,productionBuild:true,palette:'#e60000 / black / neutral gray',annotationCount:28,engines:[]};

async function startLocalServer() {
  const dist=path.join(__dirname,'dist');
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain','.xml':'application/xml'};
  localServer=http.createServer((request,response)=>{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=path.resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end();return;}
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve,reject)=>{localServer.once('error',reject);localServer.listen(0,'127.0.0.1',resolve);});
  base=`http://127.0.0.1:${localServer.address().port}/`;
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));
  });
}
async function revealByScrolling(page) {
  const height = await page.evaluate(()=>document.documentElement.scrollHeight);
  for (let y=0;y<height;y+=450) {
    await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),y);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  await settle(page);
}

async function verifyAnnotations(page) {
  for (const selector of ['.hero-actions','.intro-strip','.art-bottom','.art-label small','.header-contact svg']) {
    assert.equal(await page.locator(selector).count(),0,`${selector} should be removed`);
  }
  const exactText = [
    ['.hero-copy>.eyebrow','Vodafone Business Partner'],
    ['.hero-copy>p',"İstanbul'un en değerli lokasyonlarında olan mağazalarımıza sizleri bekliyoruz"],
    ['.label-one>div','Güvenilir Hizmet'],
    ['.label-two strong','6 mağaza'],
    ['.stats>div:first-child strong','25'],
    ['.stats>div:first-child>span','yıllık sektör deneyimi'],
    ['.stats>div:nth-child(2) strong','06'],
    ['.stats>div:nth-child(2)>span','lokasyon'],
    ['.stats .authorized>span:last-child','Business Partner'],
    ['#stores-title>.muted','Yanıbaşınızda'],
    ['.phones .card-copy p','5G Uyumlu telefon modellerini temlikli veya ayrıcalıklı nakit seçenekleriyle alın.'],
    ['.accessories .card-copy h3','Güvenle alabileceğiniz aksesuarlar'],
    ['.accessories .card-copy p','En düşük arıza oranına sahip aksesuar ürünleriyle güvenli alışveriş'],
    ['.vodafone .card-copy h3','Her işlem için tek noktanız'],
    ['.vodafone .card-copy p','Aklınıza gelebilecek her işlem için etkin iletişimle hızlı çözüm desteğimiz sizin için her zaman hazır.'],
    ['#hizmetler .eyebrow','01 — Hizmetlerimiz'],
    ['#hakkimizda .eyebrow','02 — Zanes İletişim'],
    ['#magazalar .eyebrow','03 — Mağazalarımız'],
    ['#iletisim .eyebrow','04 — İletişim'],
  ];
  for (const [selector,text] of exactText) {
    assert.equal((await page.locator(selector).textContent()).trim(),text);
  }
  assert.equal((await page.locator('#contact-title').innerText()).replace(/\s+/g,' '),'Ulaşın, yardımcı olalım');
  assert.deepEqual(await page.locator('.contact-label').allTextContents(),['Bizi Arayın','Bize Yazın','Adresimiz']);
  assert.equal(await page.locator('.section-heading>.eyebrow,.about-kicker>.eyebrow,.contact-top>.eyebrow,.contact-label').evaluateAll(es=>es.every(e=>getComputedStyle(e).textTransform==='none')),true);
  assert.equal(await page.locator('.store-intro>.text-link svg').count(),1);
  assert.equal(await page.locator('.store-intro>.text-link svg path').getAttribute('d'),'m7 3 3 5-2.5 2a15 15 0 0 0 6.5 6.5l2-2.5 5 3v2a2 2 0 0 1-2.2 2A19.5 19.5 0 0 1 3 5.2 2 2 0 0 1 5 3Z');
  assert.equal(await page.locator('.store-intro>.text-link').evaluate(e=>getComputedStyle(e).marginTop),'3px');
  assert.deepEqual(await page.locator('.contact-value-arrow path').evaluateAll(es=>es.map(e=>e.getAttribute('d'))),Array(2).fill('M4 12h16m-7-7 7 7-7 7'));
  const button = await page.locator('.header-contact').boundingBox();
  assert.ok(button.width<110 && button.height>=38 && button.height<44);
}

async function verifyContactArrows(page) {
  // Finish anchor scrolling before pointer tests so links cannot slide out of hover.
  await page.evaluate(()=>window.scrollTo({top:document.querySelector('.contact-bottom').getBoundingClientRect().top+scrollY-180,behavior:'instant'}));
  await page.mouse.move(1,1);
  await page.locator('.header-contact').evaluate(e=>e.focus({preventScroll:true}));
  await settle(page);
  const initialUrl=page.url();
  const waitForArrow = (index,visible) => page.waitForFunction(({index,visible})=>{
    const style=getComputedStyle(document.querySelectorAll('.contact-value-arrow')[index]);
    return Number(style.opacity)===(visible?1:0) && new DOMMatrix(style.transform).m41===(visible?0:-12);
  },{index,visible});
  const links=await page.locator('.contact-bottom>a').all();
  for (const [index,link] of links.entries()) {
    const arrow=link.locator('.contact-value-arrow');
    await waitForArrow(index,false);
    assert.equal(await arrow.evaluate(e=>getComputedStyle(e).opacity),'0');
    assert.equal(await arrow.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41),-12);
    assert.equal(await arrow.evaluate(e=>getComputedStyle(e).transitionDuration.split(',').some(v=>parseFloat(v)>0)),true);
    await link.hover();
    await waitForArrow(index,true);
    assert.equal(await arrow.evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.equal(await arrow.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m41),0);
    assert.equal(page.url(),initialUrl,'Hover must not activate an external contact link');
    await page.mouse.move(1,1);
    await waitForArrow(index,false);
    assert.equal(await arrow.evaluate(e=>getComputedStyle(e).opacity),'0');
  }
  // Tab through the actual contact order instead of simulating a focus class.
  await page.locator('.contact-arrow').focus();
  for (const [index,link] of links.entries()) {
    await page.keyboard.press('Tab');
    assert.equal(await link.evaluate(e=>e===document.activeElement && e.matches(':focus-visible')),true);
    await waitForArrow(index,true);
    assert.equal(await link.locator('.contact-value-arrow').evaluate(e=>getComputedStyle(e).opacity),'1');
  }
  assert.equal(page.url(),initialUrl);
  await page.screenshot({path:`${output}/zanes-v3-contact-focus-${page.context().browser().browserType().name()}.png`,animations:'disabled'});
}

(async()=>{
  if(!base) await startLocalServer();
  const builtHtml=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
  assert.ok(builtHtml.includes('id="hero-title"')&&builtHtml.includes('id="store-list"'),'The built document must include real content before hydration');
  assert.ok(!builtHtml.includes('noindex')&&!builtHtml.includes('Yerel tasarım önizlemesi'));
  assert.ok(builtHtml.includes('href="https://zanesiletisim.info/"'));
  assert.ok(builtHtml.includes('<!--email_off--><div id="root">')&&builtHtml.includes('<!--/email_off-->'),'Preserve React HTML under Cloudflare email obfuscation');
  assert.ok(!fs.readdirSync(path.join(__dirname,'dist/assets')).some(file=>file.endsWith('.map')));
  for (const [name,engine] of Object.entries({chromium,webkit})) {
    const browser=await engine.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    const result={engine:name,widths:[]};
    const staticPage=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
    await staticPage.goto(base);
    assert.equal(await staticPage.locator('.store').count(),6);
    assert.equal(await staticPage.locator('.stats>div:first-child strong').textContent(),'25');
    assert.equal(await staticPage.locator('a[href="tel:+905453636464"]').count(),4);
    assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute('href'),'https://zanesiletisim.info/');
    assert.equal(await staticPage.locator('meta[name="robots"]').getAttribute('content'),'index, follow');
    assert.equal(await staticPage.locator('script[type="application/ld+json"]').evaluate(e=>JSON.parse(e.textContent).telephone),'+905453636464');
    result.production={contentWithoutJavaScript:true,canonicalAndIndexing:true,structuredData:true};
    await staticPage.close();
    // Reduced motion makes the geometry matrix independent of entrance timing.
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const width of [320,360,390,430,700,768,829,900,901,1024,1280,1440,1920]) {
      await page.setViewportSize({width,height:1000});
      await page.goto(base);
      await page.locator('.store').first().waitFor();
      await settle(page);
      const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash),outside:[...document.querySelectorAll('main h1,main h2,main h3,main p,.store a,.header-contact,.contact-value')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.visibility!=='hidden'&&r.width>0&&(r.left<-.5||r.right>innerWidth+.5||e.scrollWidth>e.clientWidth+1);}).map(e=>e.textContent.trim())}));
      assert.equal(geometry.width,geometry.scroll,`${name} document overflow at ${width}`);
      assert.deepEqual(geometry.brokenAnchors,[]);
      assert.deepEqual(geometry.outside,[],`${name} text/control clipping at ${width}`);
      const heroHeight=await page.locator('.hero-art').evaluate(e=>{const s=getComputedStyle(e);return {actual:e.getBoundingClientRect().height,expected:parseFloat(s.getPropertyValue('--hero-base-height'))+parseFloat(s.getPropertyValue('--hero-extension'))};});
      assert.ok(heroHeight.actual>=heroHeight.expected,`${name} expanded hero height at ${width}`);
      const title=await page.locator('#contact-title').boundingBox();
      const action=await page.locator('.contact-arrow').boundingBox();
      assert.ok(title.x+title.width<=action.x,`${name} contact heading/button overlap at ${width}`);
      result.widths.push({width,overflow:false,textControlClipping:false});
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto(base);
    await page.locator('.store').first().waitFor();
    await settle(page);
    assert.equal(await page.locator('#root').evaluate(e=>Object.keys(e).some(k=>k.startsWith('__reactContainer'))),true);
    assert.equal(await page.locator('.brand').first().evaluate(e=>getComputedStyle(e).color),'rgb(230, 0, 0)');
    assert.equal(await page.locator('.hero-art').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(230, 0, 0)');
    assert.equal(await page.locator('.store').count(),6);
    assert.deepEqual(await page.locator('.store a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),originalMaps);
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('svg:not([aria-hidden="true"])').count(),0);
    assert.equal(await page.locator('body').evaluate(e=>/[↗↓↑✳▮▰]/.test(e.innerText)),false);
    await verifyAnnotations(page);
    await page.screenshot({path:`${output}/zanes-v3-desktop-${name}.png`,animations:'disabled'});
    // Verify a real reveal: hidden below the fold, animating on entry, then stable.
    const reveal=page.locator('.card-reveal').first();
    assert.equal(await reveal.evaluate(e=>getComputedStyle(e).opacity),'0');
    const phoneBefore=await page.locator('.phone-stage').evaluate(e=>getComputedStyle(e).transform);
    await page.evaluate(()=>window.scrollTo({top:220,behavior:'instant'}));
    await page.waitForFunction(()=>parseFloat(document.querySelector('.hero-art').style.getPropertyValue('--phone-y'))<0);
    const phoneAfter=await page.locator('.phone-stage').evaluate(e=>getComputedStyle(e).transform);
    assert.notEqual(phoneBefore,phoneAfter);
    await reveal.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('.card-reveal').classList.contains('is-visible'));
    await settle(page);
    assert.equal(await reveal.evaluate(e=>getComputedStyle(e).opacity),'1');
    assert.equal(await reveal.evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)>0),true);
    await page.waitForFunction(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-progress'))>0);
    await page.screenshot({path:`${output}/zanes-v3-services-${name}.png`,animations:'disabled'});
    result.motion={revealHiddenThenVisible:true,nonzeroTransition:true,scrollLinkedPhone:true,readingProgress:true};
    await page.locator('.desktop-nav a[href="#magazalar"]').click();
    assert.equal(new URL(page.url()).hash,'#magazalar');
    for(const [selector,hash] of [['.phones','#magazalar'],['.accessories','#magazalar'],['.vodafone','#iletisim']]){await page.locator(selector).click();assert.equal(new URL(page.url()).hash,hash);}
    assert.equal(await page.locator('.contact-bottom>a').first().getAttribute('href'),'tel:+905453636464');
    assert.equal(await page.locator('.contact-bottom>a').nth(1).getAttribute('href'),'mailto:info@zanes.com.tr');
    await verifyContactArrows(page);
    result.annotations={count:28,copyAndRemovals:true,expandedHero:true,compactHeader:true,contactArrows:{hiddenAtRest:true,animatedOnHover:true,keyboardFocus:true,noHoverNavigation:true}};
    // Mobile disclosure: keyboard, focus, inert, touch navigation, outside click, breakpoint.
    await page.setViewportSize({width:390,height:844});
    await page.goto(base);
    await settle(page);
    const toggle=page.locator('.menu-toggle');
    await toggle.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='true');
    assert.equal(await page.locator('#mobile-menu').evaluate(e=>e.inert),false);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('href')),'#hizmetler');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mobile-menu').evaluate(e=>e.inert),true);
    assert.equal(await page.evaluate(()=>document.activeElement.className),'menu-toggle');
    await toggle.click();
    await page.locator('#mobile-menu').getByRole('link',{name:'Mağazalarımız',exact:true}).click();
    assert.equal(new URL(page.url()).hash,'#magazalar');
    assert.equal(await page.locator('#mobile-menu').evaluate(e=>e.inert),true);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'magazalar');
    await toggle.click();
    await page.setViewportSize({width:1024,height:900});
    await page.waitForFunction(()=>document.querySelector('.menu-toggle').getAttribute('aria-expanded')==='false');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('#mobile-menu').evaluate(e=>e.inert),true);
    await page.goto(base);
    await settle(page);
    await toggle.click();
    await settle(page);
    await page.screenshot({path:`${output}/zanes-v3-menu-${name}.png`,animations:'disabled'});
    await page.locator('.hero-art').click({position:{x:20,y:250}});
    assert.equal(await page.locator('#mobile-menu').evaluate(e=>e.inert),true);
    result.mobile={enterTabEscape:true,focusRestored:true,linkCloses:true,targetFocused:true,breakpointCloses:true,outsideCloses:true,inert:true};
    // A fresh reduced-motion load must reveal everything without a scroll or hover jump.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto(base);
    await settle(page);
    assert.equal(await page.locator('html').evaluate(e=>getComputedStyle(e).scrollBehavior),'auto');
    assert.equal(await page.locator('#mobile-menu').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
    assert.equal(await page.locator('[data-reveal]').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1')),true);
    assert.equal(await page.locator('.contact-value-arrow').evaluateAll(es=>es.every(e=>getComputedStyle(e).transitionDuration==='0s'&&getComputedStyle(e).transform==='none')),true);
    const staticPhone=await page.locator('.phone-stage').evaluate(e=>getComputedStyle(e).transform);
    await page.evaluate(()=>window.scrollTo({top:350,behavior:'instant'}));
    await settle(page);
    assert.equal(await page.locator('.phone-stage').evaluate(e=>getComputedStyle(e).transform),staticPhone);
    result.reducedMotion={allContentVisible:true,noEntranceAnimations:true,noParallax:true,noMenuTransition:true,noContactArrowMovement:true};
    // Capture actual final pages after entering every section, not by faking reveal classes.
    await page.emulateMedia({reducedMotion:'no-preference'});
    for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
      await page.setViewportSize({width,height});await page.goto(base);await settle(page);
      await page.screenshot({path:`${output}/zanes-v3-${device}-${name}.png`,animations:'disabled'});
      await revealByScrolling(page);
      const pending=await page.locator('[data-reveal]:not(.is-visible)').evaluateAll(elements=>elements.filter(e=>e.getClientRects().length>0).length);
      assert.equal(pending,0,`${name} unrevealed content after complete scroll`);
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await settle(page);
      await page.screenshot({path:`${output}/zanes-v3-${device}-full-${name}.png`,fullPage:true,animations:'disabled'});
      if(name==='chromium'){fs.copyFileSync(`${output}/zanes-v3-${device}-${name}.png`,`${output}/zanes-${device}.png`);fs.copyFileSync(`${output}/zanes-v3-${device}-full-${name}.png`,`${output}/zanes-${device}-full.png`);}
    }
    // A narrow desktop viewport is not a touch device: test the actual media fallback.
    const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'});
    const touchPage=await touchContext.newPage();
    touchPage.on('pageerror',e=>errors.push(e.message));
    touchPage.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await touchPage.goto(base);await settle(touchPage);
    assert.equal(await touchPage.evaluate(()=>matchMedia('(pointer:coarse)').matches),true);
    assert.ok((await touchPage.locator('.header-contact').boundingBox()).height>=44);
    assert.equal(await touchPage.locator('.contact-value-arrow').evaluateAll(es=>es.every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).transform==='none')),true);
    await touchPage.screenshot({path:`${output}/zanes-v3-mobile-touch-${name}.png`,animations:'disabled'});
    await touchPage.locator('.menu-toggle').tap();
    await touchPage.locator('#mobile-menu a[href="#iletisim"]').tap();
    assert.equal(new URL(touchPage.url()).hash,'#iletisim');
    assert.equal(await touchPage.locator('#mobile-menu').evaluate(e=>e.inert),true);
    await settle(touchPage);
    await touchPage.screenshot({path:`${output}/zanes-v3-contact-touch-${name}.png`,animations:'disabled'});
    await revealByScrolling(touchPage);
    await touchPage.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await settle(touchPage);
    await touchPage.screenshot({path:`${output}/zanes-v3-mobile-touch-full-${name}.png`,fullPage:true,animations:'disabled'});
    if(name==='chromium'){fs.copyFileSync(`${output}/zanes-v3-mobile-touch-${name}.png`,`${output}/zanes-mobile.png`);fs.copyFileSync(`${output}/zanes-v3-mobile-touch-full-${name}.png`,`${output}/zanes-mobile-full.png`);}
    result.mobile.touch={minimum44pxContactButton:true,contactArrowsVisible:true,menuTapNavigation:true};
    await touchContext.close();
    result.content={reactRoot:true,sourceMapLinksMatch:true,phoneEmailHref:true,svgIcons:true,redLogo:true,allScrollContentRevealed:true};
    assert.deepEqual(errors,[]);result.errors=errors;report.engines.push(result);
    await browser.close();
  }
  fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  localServer?.close();
})().catch(error=>{console.error(error);localServer?.close();process.exit(1);});

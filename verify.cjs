const {chromium, webkit} = require('playwright');
const esbuild = require('esbuild');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const output = path.join(__dirname,'artifacts');
fs.mkdirSync(output,{recursive:true});
let base = process.env.BASE_URL;
let localServer;
const originalMaps = require('./tests/map-links.json');
const report = {design:'kirmizi-panel-halftone',productionBuild:true,engines:[]};

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
  // React hydrates after the load event; the menu controller sizes its panel in the same commit as every other effect.
  // Measuring before that measured the server HTML (the closed menu's links once read as clipped at 1024 in WebKit).
  await page.waitForFunction(()=>!!document.querySelector('[data-content]')?.style.width);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));
  });
}

function watchErrors(page, errors) {
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
}

// Status text for every station at a fixed Istanbul time (UTC+3).
async function statusesAt(browser, utc, errors) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  watchErrors(page,errors);
  await page.clock.setFixedTime(new Date(utc));
  await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('.status').textContent.trim().length>0);
  const result={
    caption:(await page.locator('.stores-caption').textContent()).trim(),
    stations:Object.fromEntries(await page.locator('.station').evaluateAll(es=>es.map(e=>[e.id.replace('magaza-',''),e.querySelector('.status').textContent.trim()]))),
    closedPins:await page.locator('.map .pin.is-closed').count(),
  };
  await context.close();
  return result;
}

// The feedback mail function: accepts what the page sends, refuses anything else, mails a readable summary.
async function checkFeedbackFunction() {
  const bundle=async(entry,outfile)=>{await esbuild.build({absWorkingDir:__dirname,entryPoints:[entry],outfile,platform:'node',format:'cjs',bundle:true,logLevel:'silent'});return require(`./${outfile}`);};
  const {onRequestPost}=await bundle('functions/api/geribildirim.js','.build/feedback-function.cjs');
  const mailer=(await bundle('workers/mailer/index.js','.build/feedback-mailer.cjs')).default;
  const sent=[],realError=console.error;
  const env={MAILER:{fetch:async(url,init)=>{sent.push(JSON.parse(init.body));return Response.json({ok:true,id:'m1'});}}};
  const post=(body,{type='application/json',origin='https://zanesiletisim.com',withEnv=env}={})=>onRequestPost({env:withEnv,request:new Request('https://zanesiletisim.com/api/geribildirim',{method:'POST',headers:{'Content-Type':type,Origin:origin},body})});
  console.error=()=>{};
  try {
    let response=await post(JSON.stringify({puan:2,magaza:'akasya',konular:['İşlem hızı'],yorum:' <b>Uzun</b> kuyruk '}));
    assert.equal(response.status,200);
    assert.equal(sent[0].to,'burakaksoy@zanes.com.tr');
    assert.equal(sent[0].from,'geribildirim@zanesiletisim.info');
    assert.equal(sent[0].subject,'Düşük puan: 2/5 Kötü · Akasya AVM');
    assert.match(sent[0].text,/Konular: İşlem hızı\n[^]*Yorum:\n<b>Uzun<\/b> kuyruk\n/);
    assert.ok(sent[0].html.includes('&lt;b&gt;Uzun&lt;/b&gt; kuyruk')&&!sent[0].html.includes('<b>Uzun'),'Comments are escaped in the HTML mail');
    // A visitor without JavaScript posts the plain form and gets a thank-you page.
    response=await post(new URLSearchParams([['puan','5'],['magaza','cevahir'],['konu','Fiyatlar'],['yorum','']]).toString(),{type:'application/x-www-form-urlencoded'});
    assert.equal(response.status,200);
    assert.match(await response.text(),/Teşekkürler/);
    assert.equal(sent[1].subject,'Geribildirim: 5/5 Harika · Cevahir AVM');
    // Refused without mailing: bad rating, unknown store or topic, long comment, broken body, another site; the trap is thanked silently.
    for (const body of [{},{puan:0},{puan:6},{puan:2.5},{puan:3,magaza:'kadikoy'},{puan:3,konular:['Tarife']},{puan:3,yorum:'x'.repeat(601)}]) assert.equal((await post(JSON.stringify(body))).status,400,JSON.stringify(body).slice(0,40));
    assert.equal((await post('{broken')).status,400);
    assert.equal((await post(JSON.stringify({puan:4}),{origin:'https://example.com'})).status,403);
    assert.equal((await post(JSON.stringify({puan:4,website:'http://spam.example'}))).status,200);
    assert.equal(sent.length,2);
    // No mailer bound, or the mailer fails: the visitor gets a retryable error, never a false thank-you.
    assert.equal((await post(JSON.stringify({puan:4}),{withEnv:{}})).status,503);
    assert.equal((await post(JSON.stringify({puan:4}),{withEnv:{MAILER:{fetch:async()=>Response.json({ok:false,code:'E_RATE_LIMIT_EXCEEDED'},{status:500})}}})).status,503);
    // The mailer passes the message to its email binding and reports the service's refusal.
    const handed=[];
    const mailRequest=()=>new Request('https://mailer/',{method:'POST',body:JSON.stringify({...sent[0],extra:'ignored'})});
    response=await mailer.fetch(mailRequest(),{EMAIL:{send:async message=>{handed.push(message);return {messageId:'m2'};}}});
    assert.deepEqual(await response.json(),{ok:true,id:'m2'});
    assert.deepEqual(Object.keys(handed[0]).sort(),['from','html','subject','text','to']);
    response=await mailer.fetch(mailRequest(),{EMAIL:{send:async()=>{throw Object.assign(new Error('not verified'),{code:'E_SENDER_NOT_VERIFIED'});}}});
    assert.equal(response.status,500);
    assert.equal((await response.json()).code,'E_SENDER_NOT_VERIFIED');
    assert.equal((await mailer.fetch(new Request('https://mailer/'),{})).status,405);
    // The mailer's email binding only allows one sender and one recipient; they must be the ones the function uses.
    const [binding]=JSON.parse(fs.readFileSync(path.join(__dirname,'workers/mailer/wrangler.jsonc'),'utf8').replace(/^\s*\/\/.*$/gm,'')).send_email;
    assert.equal(binding.destination_address,sent[0].to,'Mailer recipient and function recipient differ');
    assert.deepEqual(binding.allowed_sender_addresses,[sent[0].from],'Mailer sender and function sender differ');
  } finally {
    console.error=realError;
  }
  report.feedbackFunction={mailed:true,plainForm:true,rejectsInvalid:true,originChecked:true,botTrap:true,failureIs503:true,mailer:true};
}

(async()=>{
  await checkFeedbackFunction();
  if(!base) await startLocalServer();
  const builtHtml=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
  assert.ok(builtHtml.includes('id="hero-title"')&&(builtHtml.match(/class="station/g)||[]).length===6,'The built document must include real content before hydration');
  assert.ok(!builtHtml.includes('noindex'));
  assert.ok(builtHtml.includes('href="https://zanesiletisim.com/"'));
  assert.ok(builtHtml.includes('<!--email_off--><div id="root">')&&builtHtml.includes('<!--/email_off-->'),'Preserve React HTML under Cloudflare email obfuscation');
  assert.ok(!fs.readdirSync(path.join(__dirname,'dist/assets')).some(file=>file.endsWith('.map')));

  for (const [name,engine] of Object.entries({chromium,webkit})) {
    const browser=await engine.launch({headless:true});
    const errors=[];
    const result={engine:name,widths:[]};

    // Crawlers and visitors without JavaScript get every store, hours and contact link.
    const staticPage=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
    await staticPage.goto(base);
    assert.equal(await staticPage.locator('.station').count(),6);
    assert.deepEqual(await staticPage.locator('.station .hours').allTextContents(),['10:00 – 22:00','10:00 – 22:00','09:00 – 21:00','10:00 – 22:00','10:00 – 22:00','09:00 – 21:00']);
    assert.ok(await staticPage.locator('a[href="tel:+905453636464"]').count()>=3);
    assert.equal(await staticPage.locator('a[href="mailto:info@zanes.com.tr"]').count(),1);
    assert.equal((await staticPage.locator('.big-phone').innerText()).trim(),'0545 363 64 64','The rolling counter must fall back to the plain number');
    assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute('href'),'https://zanesiletisim.com/');
    assert.equal(await staticPage.locator('meta[name="robots"]').getAttribute('content'),'index, follow');
    assert.equal(await staticPage.locator('script[type="application/ld+json"]').evaluate(e=>JSON.parse(e.textContent).telephone),'+905453636464');
    assert.equal(await staticPage.locator('.fb-form input[name="puan"]').count(),5,'The feedback form must work as a plain form');
    assert.equal(await staticPage.locator('.fb-form input[name="magaza"]').count(),6);
    assert.equal(await staticPage.locator('.fb-form').getAttribute('action'),'/api/geribildirim');
    await staticPage.close();
    result.withoutJavaScript={stores:6,hours:true,contactLinks:true,canonicalAndIndexing:true,feedbackForm:true};

    // Geometry matrix: no overflow or clipped text, and the line stays straight at every width.
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    watchErrors(page,errors);
    await page.emulateMedia({reducedMotion:'reduce'});
    for (const width of [320,360,390,430,761,768,900,901,960,961,1024,1179,1180,1280,1440,1920]) {
      await page.setViewportSize({width,height:1000});
      await page.goto(base);
      await settle(page);
      const geometry=await page.evaluate(()=>{
        const clipped=[...document.querySelectorAll('h1,h2,h3,p,address,a,dd')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&!e.closest('.sr-only')&&(r.left<-.5||r.right>innerWidth+.5||e.scrollWidth>e.clientWidth+1);}).map(e=>e.textContent.trim().slice(0,40));
        const box=e=>e.getBoundingClientRect();
        const hit=(a,b)=>a.left<b.right-.5&&b.left<a.right-.5&&a.top<b.bottom-.5&&b.top<a.bottom-.5;
        // Each store row: the directions pill never covers the name, status/hours or address.
        const rowCollisions=[...document.querySelectorAll('.station')].filter(row=>{const d=box(row.querySelector('.directions'));return ['h3','.store-meta','address'].some(sel=>hit(d,box(row.querySelector(sel))));}).map(row=>row.id);
        const rowsOverlap=[...document.querySelectorAll('.station')].map(box).some((r,i,all)=>i>0&&r.top<all[i-1].bottom-.5&&r.left<all[i-1].right&&all[i-1].left<r.right);
        // Map pins stay apart and inside the map.
        const map=box(document.querySelector('.map'));
        const pins=[...document.querySelectorAll('.map .pin')].map(box);
        const pinsOverlap=pins.some((a,i)=>pins.some((b,j)=>j>i&&hit(a,b)));
        const pinsOutside=pins.filter(p=>p.left<map.left-.5||p.right>map.right+.5||p.top<map.top-.5||p.bottom>map.bottom+.5).length;
        const h1=document.querySelector('h1').getBoundingClientRect(),side=document.querySelector('.hero-side').getBoundingClientRect();
        // Name the widest offenders so an overflow on another platform is diagnosable from the CI log.
        const wide=[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+.5&&!e.closest('.hero,[data-nav-view]')).map(e=>`${e.tagName.toLowerCase()}.${e.className||''} right=${Math.round(e.getBoundingClientRect().right)}`).slice(0,8);
        return {width:innerWidth,scroll:document.documentElement.scrollWidth,clipped,wide,
          brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash),
          rowCollisions,rowsOverlap,pinsOverlap,pinsOutside,heroOverlap:h1.right>side.left&&h1.bottom>side.top&&side.bottom>h1.top};
      });
      assert.equal(geometry.width,geometry.scroll,`${name} document overflow at ${width}: ${geometry.wide.join(' | ')}`);
      assert.deepEqual(geometry.brokenAnchors,[]);
      assert.deepEqual(geometry.clipped,[],`${name} text/control clipping at ${width}`);
      assert.equal(geometry.heroOverlap,false,`${name} hero heading overlaps copy at ${width}`);
      assert.deepEqual(geometry.rowCollisions,[],`${name} directions pill covers store text at ${width}`);
      assert.equal(geometry.rowsOverlap,false,`${name} store rows overlap at ${width}`);
      assert.equal(geometry.pinsOverlap,false,`${name} map pins overlap at ${width}`);
      assert.equal(geometry.pinsOutside,0,`${name} map pins outside the map at ${width}`);
      result.widths.push({width,overflow:false,clipping:false,storeRows:true,mapPins:true});
    }
    assert.equal(await page.locator('.plane').evaluate(e=>getComputedStyle(e).animationName),'none');
    result.reducedMotion={noPlaneFlight:true};

    // Page load: hydrated React, one line animation, brand and content invariants.
    await page.setViewportSize({width:1440,height:1000});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.goto(base);
    assert.equal(await page.locator('.plane').evaluate(e=>getComputedStyle(e).animationName),'arrive');
    await settle(page);
    assert.equal(await page.locator('#root').evaluate(e=>Object.keys(e).some(k=>k.startsWith('__reactContainer'))),true);
    assert.equal(await page.locator('.header .zmark rect').getAttribute('fill'),'#e60000');
    assert.equal(await page.locator('.hero').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(230, 0, 0)');
    assert.equal(await page.locator('.contact').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(230, 0, 0)');
    assert.equal(await page.locator('h1').count(),1);
    assert.equal(await page.locator('svg:not([aria-hidden="true"])').count(),0);
    assert.deepEqual((await page.locator('.directions').evaluateAll(links=>links.map(a=>a.getAttribute('href')))).sort(),[...originalMaps].sort());
    assert.equal(await page.locator('.big-phone').getAttribute('href'),'tel:+905453636464');
    await page.screenshot({path:`${output}/zanes-desktop-${name}.png`});
    await page.screenshot({path:`${output}/zanes-desktop-full-${name}.png`,fullPage:true});
    const menu=page.locator('[data-nav-view]');
    // A menu link scrolls down to its section and the bar slides away on the way down, as designed; scrolling back up
    // brings it back. The check takes that same path. Clicking the button right after a link raced the slide and, in
    // WebKit, waited on a bar that had already left the screen.
    const backToTop=async()=>{
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(()=>document.querySelector('[data-header]').getBoundingClientRect().top>-.5);
    };
    for (const hash of ['#hizmetler','#magazalar','#geribildirim','#iletisim']) {
      await backToTop();
      await page.locator('[data-toggle]').click();
      assert.equal(await menu.getAttribute('data-open'),'true');
      assert.equal(await page.locator('[data-content]').evaluate(e=>e.inert),false);
      await page.locator(`[data-links] a[href="${hash}"]`).click();
      assert.equal(new URL(page.url()).hash,hash);
      assert.equal(await menu.getAttribute('data-open'),'false');
      // The link lands its section under the 24px scroll padding, or the page bottoms out on the way.
      await page.waitForFunction(target=>{const top=document.querySelector(target).getBoundingClientRect().top;return Math.abs(top-24)<2||scrollY+innerHeight>=document.documentElement.scrollHeight-2;},hash);
    }
    await backToTop();
    await page.locator('[data-toggle]').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-toggle]').getAttribute('aria-expanded'),'false');
    assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-toggle')),true,'Focus returns to the menu button');
    assert.equal(await page.locator('[data-content]').evaluate(e=>e.inert),true);
    result.content={reactRoot:true,redPanel:true,mapLinksPreserved:true,navigation:true};

    // Live status follows Istanbul time, independent of the visitor's clock zone.
    const midday=await statusesAt(browser,'2026-09-24T11:00:00Z',errors);
    assert.match(midday.caption,/saat 14:00\. Altı mağazamızın hepsi şu an açık\./);
    assert.equal(midday.stations.akasya,'Açık, kapanış 22:00');
    assert.equal(midday.stations.mecidiyekoy,'Açık, kapanış 21:00');
    assert.equal(midday.closedPins,0);
    const evening=await statusesAt(browser,'2026-09-24T18:30:00Z',errors);
    assert.match(evening.caption,/saat 21:30\. Altı mağazamızın dördü şu an açık\./);
    assert.equal(evening.stations.cevahir,'Açık, kapanışa 30 dk');
    assert.equal(evening.stations.bagdat,'Kapalı, açılış 09:00');
    // The map follows the same clock: the two 21:00 stores go grey.
    assert.equal(evening.closedPins,2);
    const night=await statusesAt(browser,'2026-09-24T21:30:00Z',errors);
    assert.match(night.caption,/saat 00:30\. Mağazalarımız şu an kapalı, ilk açılış 09:00\./);
    assert.equal(night.stations.istinyepark,'Kapalı, açılış 10:00');
    assert.equal(night.closedPins,6);
    result.liveStatus={midday:true,closingSoon:true,night:true,mapPins:true};

    // "En yakın mağazayı bul": a visitor near Acıbadem gets Akasya highlighted.
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const geoContext=await browser.newContext({viewport,geolocation:{latitude:41.004,longitude:29.06},permissions:['geolocation']});
      const geoPage=await geoContext.newPage();
      watchErrors(geoPage,errors);
      await geoPage.goto(base);
      await settle(geoPage);
      await geoPage.locator('.hero .btn-primary').click();
      await geoPage.waitForSelector('.station.is-nearest');
      assert.equal(await geoPage.locator('.station.is-nearest').getAttribute('id'),'magaza-akasya');
      assert.match(await geoPage.locator('.geo-message').textContent(),/^Size en yakın mağaza Akasya, yaklaşık [\d,]+ (m|km)\.$/);
      assert.equal(new URL(geoPage.url()).hash,'','The finder must not jump to the list anchor when geolocation works');
      await settle(geoPage);
      assert.ok(await geoPage.locator('#magaza-akasya').evaluate(e=>{const r=e.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}),'Nearest store scrolled into view');
      await geoPage.screenshot({path:`${output}/zanes-nearest-${viewport.width}-${name}.png`});
      await geoContext.close();
    }
    result.nearestStore={highlighted:true,message:true,scrolledIntoView:true};

    // Feedback: the face follows the rating, a missing rating is explained, and the answers are posted once.
    for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
      const fbContext=await browser.newContext({viewport});
      const fbPage=await fbContext.newPage();
      watchErrors(fbPage,errors);
      const posted=[];
      await fbPage.route('**/api/geribildirim',route=>{posted.push(route.request().postDataJSON());route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
      await fbPage.goto(base);
      await settle(fbPage);
      // Near its section the face settles on the 3D phone (a taller box) or stays the SVG. The form is used after that
      // decision; a jump straight to the button could otherwise click while the box grows.
      await fbPage.locator('.fb-face').scrollIntoViewIfNeeded();
      await fbPage.waitForFunction(()=>['3d','svg'].includes(document.querySelector('.fb-face').dataset.phone));
      (result.faceRenderer??={})[viewport.width]=await fbPage.locator('.fb-face').getAttribute('data-phone');
      await fbPage.locator('.fb-send').click();
      await fbPage.waitForSelector('#fb-missing');
      assert.equal(posted.length,0,'Nothing is sent without a rating');
      await fbPage.locator('.rate-stop').nth(0).click();
      await fbPage.waitForSelector('.fb-face[data-mood="1"]');
      assert.equal(await fbPage.locator('#fb-missing').count(),0);
      assert.equal(await fbPage.locator('.fb-sorry a').getAttribute('href'),'tel:+905453636464');
      assert.equal((await fbPage.locator('.fb-step').nth(2).locator('legend').textContent()).trim(),'Neyi düzeltelim?');
      await fbPage.locator('.rate-stop').nth(4).click();
      await fbPage.waitForSelector('.fb-face[data-mood="5"]');
      assert.equal(await fbPage.locator('.fb-sorry').count(),0);
      await fbPage.locator('.chip',{hasText:'Akasya'}).click();
      await fbPage.locator('.chip-topic',{hasText:'İşlem hızı'}).click();
      await fbPage.locator('.fb-form textarea').fill('  Hattım 10 dakikada taşındı.  ');
      assert.equal(await fbPage.locator('.fb-step.is-done').count(),4);
      await fbPage.locator('.fb-send').click();
      await fbPage.waitForSelector('.fb-done');
      assert.deepEqual(posted,[{puan:5,magaza:'akasya',konular:['İşlem hızı'],yorum:'Hattım 10 dakikada taşındı.'}]);
      assert.equal(await fbPage.evaluate(()=>document.activeElement.className),'fb-done');
      await settle(fbPage);
      await fbPage.screenshot({path:`${output}/zanes-feedback-${viewport.width}-${name}.png`});
      await fbContext.close();
    }
    // A failed post keeps the answers; network errors are expected here, so only script errors count.
    const failPage=await browser.newPage({viewport:{width:1440,height:1000}});
    failPage.on('pageerror',e=>errors.push(e.message));
    await failPage.route('**/api/geribildirim',route=>route.fulfill({status:503,body:''}));
    await failPage.goto(base);
    await failPage.locator('.rate-stop').nth(2).click();
    await failPage.locator('.fb-send').click();
    await failPage.waitForSelector('.fb-last .fb-alert');
    assert.equal(await failPage.locator('.fb-done').count(),0);
    assert.equal(await failPage.locator('input[name="puan"][value="3"]').isChecked(),true);
    await failPage.close();
    result.feedback={faceFollowsRating:true,missingRating:true,posted:true,failureKeepsAnswers:true};

    // Phone: tap targets, header call button, full-page capture.
    const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const touchPage=await touchContext.newPage();
    watchErrors(touchPage,errors);
    await touchPage.goto(base);
    await settle(touchPage);
    assert.equal(await touchPage.locator('[data-toggle]').getAttribute('aria-expanded'),'false');
    assert.equal(await touchPage.locator('[data-content]').evaluate(e=>e.inert),true,'Closed menu links are out of reach');
    for (const selector of ['[data-toggle]','.btn','.button-05','.directions','.rate-stop','.chip-face']) {
      const heights=await touchPage.locator(selector).evaluateAll(es=>es.map(e=>e.getBoundingClientRect().height));
      assert.ok(heights.every(h=>h>=44),`${name} ${selector} tap target under 44px`);
    }
    await touchPage.screenshot({path:`${output}/zanes-mobile-${name}.png`});
    await touchPage.screenshot({path:`${output}/zanes-mobile-full-${name}.png`,fullPage:true});
    // The opened menu fills the phone screen.
    await touchPage.locator('[data-toggle]').click();
    await touchPage.waitForFunction(()=>Math.abs(document.querySelector('[data-panel]').getBoundingClientRect().width-innerWidth)<1);
    await touchPage.screenshot({path:`${output}/zanes-mobile-menu-${name}.png`});
    await touchPage.locator('[data-toggle]').click();
    await touchContext.close();
    result.mobile={tapTargets44:true,menuFillsScreen:true};

    assert.deepEqual(errors,[]);result.errors=errors;report.engines.push(result);
    await browser.close();
  }
  fs.writeFileSync(path.join(output,'validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  localServer?.close();
})().catch(error=>{console.error(error);localServer?.close();process.exit(1);});

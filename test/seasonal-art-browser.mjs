import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = 'http://127.0.0.1:8777';
const browser = await chromium.launch();
try {
  for (const side of ['her', 'him']) {
    const context = await browser.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', reducedMotion:'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/firebase-config.js', route => route.fulfill({ contentType:'text/javascript', body:'export const firebaseConfig = {};' }));
    await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
    await page.goto(base + '/' + side + '.html?as=' + side);
    await page.waitForSelector('.app-dock');
    await page.evaluate(async side => {
      const data = await (await import('./data-hub.js')).sharedLayer();
      await data.setTo('notes', 'seasonal-unread', {sender:side === 'her' ? 'him' : 'her',recipient:side,body:'badge test',createdAt:Date.now(),read:false});
    }, side);
    await page.waitForSelector('.app-dock a[href="notes.html"] .attention-badge');
    for (const [season, when] of [
      ['spooky','2026-10-08T12:00:00-04:00'],
      ['christmas','2026-12-01T00:00:00-05:00'],
      ['normal','2027-01-01T00:00:00-05:00']
    ]) {
      await page.evaluate(date => window.LittleSeason.refresh(new Date(date)), when);
      const result = await page.evaluate(async season => {
        const assets = globalThis.LittleSeasonAssets.forSeason(season);
        const sun = document.querySelector('#sky-person-her img');
        const moon = document.querySelector('#sky-person-him img');
        await Promise.all([sun.decode(), moon.decode()]);
        const late = document.createElement('img');
        late.alt = ''; late.src = 'moon-profile.png'; late.width = late.height = 32;
        document.body.append(late);
        await new Promise(resolve => requestAnimationFrame(resolve));
        await late.decode();
        const state = {
          sun:sun.getAttribute('src'), moon:moon.getAttribute('src'), late:late.getAttribute('src'),
          apple:document.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'),
          favicon:document.querySelector('link[rel="icon"]').getAttribute('href'),
          manifest:document.querySelector('link[rel="manifest"]').getAttribute('href'),
          mask:getComputedStyle(document.querySelector('.context-add i'), '::after').maskImage,
          attentionMask:getComputedStyle(document.querySelector('.attention-badge')).maskImage,
          attentionColor:getComputedStyle(document.querySelector('.attention-badge')).backgroundColor,
          overflow:document.documentElement.scrollWidth - innerWidth, assets
        };
        late.remove();
        return state;
      }, season);
      assert.equal(result.sun, result.assets.sun);
      assert.equal(result.moon, result.assets.moon);
      assert.equal(result.late, result.assets.moon, 'late-rendered profiles get dressed too');
      assert.equal(result.apple, result.assets.apple);
      assert.equal(result.favicon, result.assets.icon);
      assert.equal(result.manifest, 'manifest.webmanifest', 'never move the installed manifest');
      assert.ok(result.overflow <= 2);
      const checkboxes = await page.evaluate(() => {
        const row = document.createElement('div'); row.className = 'task-row';
        const button = document.createElement('button'); button.className = 'task-check';
        button.textContent = '✓'; row.append(button); document.body.append(row);
        const unchecked = getComputedStyle(button).backgroundColor;
        row.classList.add('done');
        const checked = getComputedStyle(button).backgroundColor;
        row.remove();
        return { unchecked, checked };
      });
      if (season !== 'normal') assert.notEqual(checkboxes.unchecked, checkboxes.checked, 'finished tasks keep a distinct checkmark state');
      assert.equal(result.mask, 'none', 'action icons never wear fake unread badges');
      if (season !== 'normal') {
        assert.ok(result.attentionMask.includes('season-mark-' + season + '.svg'));
        assert.equal(result.attentionColor, season === 'spooky' ? 'rgb(255, 122, 24)' : 'rgb(248, 200, 91)');
      } else assert.equal(result.attentionMask, 'none');
    }
    await page.evaluate(async () => {
      const data = await (await import('./data-hub.js')).sharedLayer();
      await data.updateIn('notes', 'seasonal-unread', {read:true});
    });
    await page.waitForFunction(() => !document.querySelector('.app-dock a[href="notes.html"] .attention-badge'));
    for (const season of ['spooky', 'christmas']) {
      const pixels = await page.evaluate(async season => {
        const image = new Image(); image.src = 'notification-badge-' + season + '.png';
        await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
        const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, 96, 96).data;
        let clear = 0, solid = 0, colored = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] === 0) clear++;
          if (pixels[i + 3] === 255) {
            solid++;
            if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) colored++;
          }
        }
        return { clear, solid, colored };
      }, season);
      assert.ok(pixels.clear > 96 * 96 * .45, 'badge has a transparent silhouette, not a white square');
      assert.ok(pixels.solid > 300, 'badge has a readable filled shape');
      assert.equal(pixels.colored, 0, 'Android badge is monochrome');
    }
    assert.deepEqual(errors, []);
    await context.close();
    console.log(side + ': seasonal portraits, deferred UI, icons, badges and normal restoration checked');
  }
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const base = 'http://127.0.0.1:8777';
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {});
const pages = ['home','tasks','notes','today','status','dates','memories','phone-check','guide'];
const seasons = [
  ['normal','2026-11-15T12:00:00-05:00'],
  ['spooky','2026-10-15T12:00:00-04:00'],
  ['christmas','2026-12-15T12:00:00-05:00']
];
let checked = 0;
try {
  for (const side of ['her','him']) {
    for (const pageName of pages) {
      const context = await browser.newContext({ viewport:{ width:320,height:700 }, serviceWorkers:'block', reducedMotion:'reduce' });
      const page = await context.newPage();
      await page.route('**/firebase-config.js', route => route.fulfill({ contentType:'text/javascript', body:'export const firebaseConfig = {};' }));
      await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
      await page.goto(`${base}/${pageName === 'home' ? side : pageName}.html?as=${side}`, { waitUntil:'domcontentloaded' });
      const colors = new Map();
      for (const [season, date] of seasons) {
        await page.evaluate(when => window.LittleSeason.refresh(new Date(when)), date);
        const state = await page.evaluate(() => {
          const card = document.querySelector('.feature-shell > :is(.list-card,.today-card,.now-location-card,.random-date-card,.status-card,.notification-settings-card),.feature-shell > .settings-group > .status-card,.dashboard-shell > .our-sky');
          return {
            got:document.documentElement.dataset.season,
            body:document.body.className,
            background:getComputedStyle(document.body).backgroundImage,
            card:card ? getComputedStyle(card).backgroundColor : '',
            dockAdd:document.querySelector('.dock-add') ? getComputedStyle(document.querySelector('.dock-add')).backgroundColor : '',
            overflow:document.documentElement.scrollWidth - innerWidth,
            whisper:!!document.querySelector('.seasonal-whisper'),
            mark:!!document.querySelector('.seasonal-sky-mark')
          };
        });
        assert.equal(state.got, season, `${side}/${pageName}: ${season} selected`);
        assert.ok(state.body.includes(`${side}-theme`), `${side}/${pageName}: right side remains active`);
        assert.ok(state.overflow <= 2, `${side}/${pageName}/${season}: no horizontal overflow (${state.overflow}px)`);
        assert.equal(state.whisper, season !== 'normal' && pageName !== 'home', `${side}/${pageName}/${season}: seasonal phrase`);
        assert.equal(state.mark, season !== 'normal' && pageName === 'home', `${side}/${pageName}/${season}: seasonal sky mark`);
        colors.set(season, `${state.background}|${state.card}`);
        if (side === 'him') {
          if (season === 'spooky') assert.equal(state.dockAdd, 'rgb(240, 191, 129)', `${pageName}: October add button`);
          if (season === 'christmas') assert.equal(state.dockAdd, 'rgb(188, 227, 206)', `${pageName}: December add button`);
        }
        checked++;
        if (['home','today'].includes(pageName) && season !== 'normal') {
          await page.evaluate(() => document.querySelector('.thinking-screen')?.remove());
          await page.screenshot({ path:join(tmpdir(), `ourlittlelist-${side}-${pageName}-${season}.png`) });
        }
      }
      assert.notEqual(colors.get('normal'), colors.get('spooky'), `${side}/${pageName}: October colors differ`);
      assert.notEqual(colors.get('normal'), colors.get('christmas'), `${side}/${pageName}: December colors differ`);
      await context.close();
      console.log(`ok ${side}/${pageName} in normal, October, December`);
    }
  }
  const landingContext = await browser.newContext({ viewport:{ width:320,height:700 }, serviceWorkers:'block', reducedMotion:'reduce' });
  const landing = await landingContext.newPage();
  await landing.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
  await landing.goto(`${base}/index.html`, { waitUntil:'domcontentloaded' });
  for (const [season, date] of seasons) {
    const state = await landing.evaluate(when => {
      window.LittleSeason.refresh(new Date(when));
      return { season:document.documentElement.dataset.season, line:document.querySelector('.landing-copy > p:last-child')?.textContent?.trim(), overflow:document.documentElement.scrollWidth - innerWidth };
    }, date);
    assert.equal(state.season, season);
    assert.ok(state.line);
    assert.ok(state.overflow <= 2, `landing/${season}: no horizontal overflow`);
    if (season === 'spooky') assert.match(state.line, /haunted/);
    if (season === 'christmas') assert.match(state.line, /cozy/);
    checked++;
  }
  await landingContext.close();
} finally { await browser.close(); }
console.log(`${checked} SEASONAL PHONE VIEWS CLEAN`);

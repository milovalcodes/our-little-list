import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = 'http://127.0.0.1:8777';
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const pages = ['home','tasks','notes','today','status','dates','memories','phone-check','guide'];
let problems = 0;

for (const side of ['her','him']) {
  for (const name of pages) {
    const context = await browser.newContext({ viewport:{ width:390,height:844 }, serviceWorkers:'block' });
    const page = await context.newPage();
    await page.route('**/firebase-config.js', route => route.fulfill({ contentType:'text/javascript', body:'export const firebaseConfig = {};' }));
    await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.fallback() : route.abort());
    await page.goto(`${base}/${name === 'home' ? side : name}.html?as=${side}`, { waitUntil:'domcontentloaded' });
    await page.waitForTimeout(700);
    const state = await page.evaluate(() => {
      const heading = document.querySelector('.feature-hero h1,.sky-heading h1');
      const surface = document.querySelector('.feature-shell > :is(.list-card,.today-card,.now-location-card,.random-date-card,.status-card,.notification-settings-card),.feature-shell > .settings-group > .status-card,.dashboard-shell > .our-sky');
      return {
        theme:document.body.classList.contains('her-theme') ? 'her' : document.body.classList.contains('him-theme') ? 'him' : 'none',
        diary:[...document.styleSheets].some(sheet => sheet.href?.endsWith('/diary.css')),
        overflow:document.documentElement.scrollWidth - innerWidth,
        heading:heading?.textContent?.trim(),
        surfaceRadius:surface ? Math.round(parseFloat(getComputedStyle(surface).borderRadius)) : 0
      };
    });
    const path = join(tmpdir(), `ourlittlelist-diary-${side}-${name}.png`);
    await page.screenshot({ path });
    const okay = state.theme === side && state.diary && state.overflow <= 2 && !!state.heading && state.surfaceRadius >= 18;
    if (!okay) problems++;
    console.log(`${okay ? 'ok  ' : 'FAIL'} ${side}/${name}: ${JSON.stringify(state)} · ${path}`);
    if (name === 'notes') {
      await page.locator('.dock-add').click();
      await page.waitForTimeout(260);
      const focused = await page.evaluate(() => document.activeElement?.id === 'note-quick-text');
      if (!focused) problems++;
      console.log(`${focused ? 'ok  ' : 'FAIL'} ${side}/notes add focuses the writing bar`);
      await page.evaluate(() => document.activeElement?.blur());
    }
    if (name === 'memories') {
      await page.locator('.dock-add').click();
      await page.waitForTimeout(260);
      const sheet = 'memory-form';
      const open = await page.locator(`#sheet-${sheet}`).isVisible();
      if (!open) problems++;
      const sheetPath = join(tmpdir(), `ourlittlelist-diary-${side}-${name}-sheet.png`);
      await page.screenshot({ path:sheetPath });
      console.log(`${open ? 'ok  ' : 'FAIL'} ${side}/${name} sheet · ${sheetPath}`);
      await page.locator(`#sheet-${sheet} [data-close-sheet]`).click();
    }
    if (name === 'guide') {
      await page.locator('[data-guide-tab="changes"]').click();
      await page.locator('.history-group').filter({ hasText:'Sep 30' }).locator('summary').click();
      const historyPath = join(tmpdir(), `ourlittlelist-diary-${side}-history.png`);
      await page.screenshot({ path:historyPath, fullPage:true });
      console.log(`ok   ${side}/history · ${historyPath}`);
    }
    await page.setViewportSize({ width:320,height:700 });
    const narrowOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (narrowOverflow > 2) problems++;
    console.log(`${narrowOverflow <= 2 ? 'ok  ' : 'FAIL'} ${side}/${name} at 320px · overflow ${narrowOverflow}px`);
    await context.close();
  }
}
await browser.close();
if (problems) process.exitCode = 1;

// Rasterize the repo-native silhouettes with real transparency for Android.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const season of ['spooky', 'christmas']) {
    const svg = readFileSync(new URL(`../season-mark-${season}.svg`, import.meta.url), 'utf8');
    const png = await page.evaluate(async text => {
      const image = new Image();
      image.src = 'data:image/svg+xml;base64,' + btoa(text);
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, svg);
    writeFileSync(new URL(`../notification-badge-${season}.png`, import.meta.url), Buffer.from(png, 'base64'));
  }
} finally { await browser.close(); }

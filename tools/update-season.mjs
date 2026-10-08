// Keep the original, stable manifest URL fresh for Android's OS-level updater.
import { readFileSync, writeFileSync } from 'node:fs';
import '../seasonal-assets.js';
const root = new URL('../', import.meta.url);
const path = new URL('manifest.webmanifest', root);
const date = process.argv[2] ? new Date(process.argv[2]) : new Date();
if (!Number.isFinite(date.getTime())) throw new Error('Invalid season date');
const previous = readFileSync(path, 'utf8');
const next = JSON.stringify(globalThis.LittleSeasonAssets.manifest(JSON.parse(previous), date), null, 2) + '\n';
if (next !== previous) writeFileSync(path, next);
console.log(`Install artwork: ${globalThis.LittleSeasonAssets.seasonForDate(date)}`);

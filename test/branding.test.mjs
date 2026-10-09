import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.name,'Our Little App');
assert.equal(manifest.short_name,'Little App');
assert.equal(manifest.start_url,'./index.html');
assert.equal(manifest.scope,'./');
for(const path of readdirSync('.').filter(p=>p.endsWith('.html'))){
  const source=readFileSync(path,'utf8');
  if(source.includes('seasonal-theme.js')){
    assert.ok(source.includes('apple-mobile-web-app-title" content="Our Little App"'),path);
    assert.ok(source.indexOf('appearance-boot.js')<source.indexOf('</head>'),path);
    assert.ok(source.indexOf('appearance-boot.js')<source.indexOf('styles.css'),'appearance must precede blocking styles: '+path);
  }
  assert.doesNotMatch(source.split(/\r?\n/).filter(l=>!l.includes('data-release=')).join('\n'),/our little list/i,path);
}
for(const path of ['firebase-data.js','service-worker.js','profile-names.js','status.js','seasonal-theme.js','worker/src/index.js'])assert.doesNotMatch(readFileSync(path,'utf8'),/our little list/i,path);
assert.match(readFileSync('profile-store.js','utf8'),/our-little-list-couple-profile-v1/,'rename must retain saved names');
assert.match(readFileSync('viewer.js','utf8'),/our-little-list-side/,'rename must retain the remembered account side');
console.log('BRANDING: visible names, install labels and notification fallbacks updated; app identity and saved names retained');

// Release assembly: gameplay/art sources remain in the companion prototype.
// Pass its folder explicitly on another machine. Generated output is committed
// so Pages and the worker never depend on a developer's local directory.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const source=process.argv[2]?resolve(process.argv[2]):fileURLToPath(new URL('../../../outputs/baby-star-demo/',import.meta.url));
const root=new URL('../',import.meta.url);
execFileSync(process.execPath,[resolve(source,'build.mjs')],{stdio:'inherit'});
mkdirSync(new URL('little-star/',root),{recursive:true});
copyFileSync(resolve(source,'star-engine.mjs'),new URL('little-star/engine.mjs',root));
copyFileSync(resolve(source,'star-gameplay.mjs'),new URL('little-star/star-gameplay.mjs',root));
let html=readFileSync(resolve(source,'dist/alpha.html'),'utf8');
const bootstrap=`<script>globalThis.starLive={offline:false};starLive.ready=new Promise(resolve=>{starLive.resolve=resolve;});</script><nav class="star-live-links" aria-label="App links"><a href="activities.html">← Activities</a><a href="phone-check.html">Notifications</a></nav><div id="star-connection" class="star-connection" role="status">Connecting…</div><div id="auth-root"></div><script type="module" src="little-star-live.js"></script>`;
html=html.replace(/<script>[\s\S]*?<\/script>/,()=>bootstrap)
 .replace('<title>Little Star · private alpha</title>','<title>Little Star</title>')
 .replace('</head>','<meta name="theme-color" content="#172b33"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="stylesheet" href="little-star-live.css"></head>')
 .replace('<div id="little-star-demo">','<div id="little-star-demo" hidden>')
 .replace('class="prototype-tag">local alpha','class="prototype-tag">alpha')
 .replace('aria-label="Simulated visitor"','aria-label="Signed-in visitor"')
 .replace('aria-label="Little Star: private alpha"','aria-label="Little Star"');
writeFileSync(new URL('little-star.html',root),html);
console.log('Built live Little Star and shared authoritative engine.');

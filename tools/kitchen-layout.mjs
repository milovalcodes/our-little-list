// Local station fixtures for visual/input QA. No adapter, accounts or rewards.
import {readFile} from 'node:fs/promises';
import {RECIPES} from '../little-star/engine.mjs';
export async function kitchenLayout(url){
 const recipe=url.searchParams.get('recipe')||'pancakes',station=url.searchParams.get('station')||'top';
 if(!Object.hasOwn(RECIPES,recipe)||!RECIPES[recipe].stations.includes(station))throw Error('Choose a real recipe station');
 const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
 const [release,playroom,cooking]=await Promise.all([read('little-star.html'),read('test/fixtures/star-playroom.js'),read('test/fixtures/star-cooking.js')]);
 const styles=[...release.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m=>m[0]).join('\n');
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kitchen layout fixture</title>${styles}<link rel="stylesheet" href="/little-star-live.css"></head><body class="arcade-open"><div id="little-star-demo"><dialog class="arcade-screen" aria-label="Kitchen layout fixture"><div class="arcade-topbar"><strong>Layout fixture · ${recipe} / ${station}</strong><button type="button" id="pause">pause</button></div><div class="arcade-cooking" tabindex="-1"></div></dialog></div><script type="module">
 import {stirSample,garnishPlacement,logicalStroke} from '/little-star/star-gameplay.mjs';
 import {cookingReward} from '/little-star/engine.mjs';
 ${playroom}
 ${cooking}
 const screen=document.querySelector('dialog');screen.showModal();
 const ctl=mountStarCooking(document.querySelector('.arcade-cooking'),{recipe:${JSON.stringify(recipe)},dish:${JSON.stringify(RECIPES[recipe].dish)},recipeName:${JSON.stringify(RECIPES[recipe].name)},stations:[${JSON.stringify(station)}],practice:true,random:()=>.5,sprite:name=>'<span class="kitchen-sprite" data-kitem="'+name+'" aria-hidden="true"></span>',foodSprite:name=>'<span class="item-sprite" data-item="'+name+'" aria-hidden="true"></span>',beep(){},complete(){}});
 document.getElementById('pause').onclick=()=>ctl.pause();
 </script></body></html>`;
}

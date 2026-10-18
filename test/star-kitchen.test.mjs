// Little Star kitchen: ingredient recipes, set-aside ingredients, and the
// guarantee that a free meal can always be made (no food soft-lock).
import assert from 'node:assert/strict';
import {scenario,applyAction,normalizeStar,projectStar,RECIPES,INGREDIENTS,FOODS,missingIngredients,ingredientCost,FORAGE,HOUR,DAY} from '../little-star/engine.mjs';

let serial=0;
const act=(s,type,payload={},actor='him',now=Date.parse('2026-10-20T17:00:00Z'))=>applyAction(s,{actor,type,payload,id:'kitchen-'+(++serial)},now).state;
const tries=(s,type,payload,actor,now)=>{try{return act(s,type,payload,actor,now);}catch(e){return e;}};
const noon=Date.parse('2026-10-20T17:00:00Z'),night=Date.parse('2026-10-21T04:00:00Z');

// Porridge is the cheapest meal on every count and needs nothing.
const porridge=FOODS.find(f=>f.id==='porridge');
assert.deepEqual(RECIPES.porridge.ingredients,{});
assert.ok(FOODS.filter(f=>f.id!=='porridge').every(f=>f.food>porridge.food),'porridge fills the least');
for(const [id,r] of Object.entries(RECIPES)){assert.ok(FOODS.some(f=>f.id===r.dish),id+' cooks a real pantry food');for(const k of Object.keys(r.ingredients))assert.ok(INGREDIENTS.some(i=>i.id===k),id+' uses a sold ingredient');}

// A broke star with an empty pantry can still cook and eat, day or night.
let s=scenario('ready',noon);s.wallets={him:0,her:0};s.pantry=Object.fromEntries(Object.keys(s.pantry).map(k=>[k,0]));s.larder={};s.needs.food=10;
assert.match(String(tries(s,'start-cook',{recipe:'pancakes'},'him',noon)),/Buy the ingredients/);
assert.match(String(tries(s,'buy-ingredients',{recipe:'pancakes'},'him',noon)),/Porridge is always free/);
for(const when of [noon,night]){
 let t=act(structuredClone(s),'start-cook',{recipe:'porridge'},'him',when);
 t=act(t,'cook',{sessionId:t.cookSessions.him.id,steps:4,grades:[80,80,80,80]},'him',when+9000);
 assert.ok(t.pantry.porridge>0,'free porridge lands in the pantry');
 if(when===noon){t=act(t,'feed',{food:'porridge'},'him',when+10000);assert.ok(t.needs.food>10,'and the star can eat it');}
}

// Ingredients are set aside at the start, and come back on cancel or replace.
s=scenario('ready',noon);s.wallets={him:100,her:0};s.larder={};
const cost=ingredientCost(missingIngredients(s,'pancakes'));
s=act(s,'buy-ingredients',{recipe:'pancakes'});assert.equal(s.wallets.him,100-cost);assert.deepEqual(missingIngredients(s,'pancakes'),{});
assert.match(String(tries(s,'buy-ingredients',{recipe:'pancakes'})),/already have everything/);
s=act(s,'start-cook',{recipe:'pancakes'});assert.equal(s.larder.flour,0,'ingredients set aside');
assert.match(String(tries(s,'start-cook',{recipe:'pancakes'},'her')),/Buy the ingredients/,'the other cook cannot double-spend them');
s=act(s,'cancel-cook');assert.equal(s.larder.flour,1,'cancel returns them');assert.equal(s.cookSessions.him,undefined);
s=act(s,'start-cook',{recipe:'pancakes'});s=act(s,'start-cook',{recipe:'porridge'});assert.equal(s.larder.flour,1,'starting another recipe returns them too');
s=act(s,'start-cook',{recipe:'pancakes'});
assert.match(String(tries(s,'cook',{sessionId:s.cookSessions.him.id,steps:4,grades:[90,90,90,90]},'him',noon+9000)),/every/,'pancakes need all five stations');
const before=s.pantry.pancakes||0;s=act(s,'cook',{sessionId:s.cookSessions.him.id,steps:5,grades:[100,100,100,100,100]},'him',noon+9000);
assert.ok(s.pantry.pancakes>before,'pancakes in the pantry');assert.equal(s.larder.flour,0,'and the ingredients are used up');
assert.match(String(tries(s,'cancel-cook')),/no unfinished recipe/,'a finished batch cannot be refunded');
s=normalizeStar(s,noon);assert.equal(typeof s.larder.flour,'number','the larder survives a save');

// Older four-station porridge receipts still settle.
let legacy=scenario('ready',noon);legacy=act(legacy,'start-cook',{recipe:'porridge'});
legacy=act(legacy,'cook',{sessionId:legacy.cookSessions.him.id,steps:3,grades:[70,70,70,70]},'him',noon+9000);assert.ok(legacy.pantry.porridge>0);

// Fuzz: whatever happens, a free meal stays possible. Either porridge can be
// started, or the only refusal is a full pantry (which means food exists).
let f=scenario('ready',noon),clock=noon;const actions=['buy-ingredients','start-cook','cancel-cook','cook','feed','nap','buy-food'];
for(let i=0;i<400;i++){
 clock+=Math.floor(Math.random()*3*HOUR);const actor=Math.random()<.5?'him':'her',type=actions[Math.floor(Math.random()*actions.length)],recipe=Object.keys(RECIPES)[Math.floor(Math.random()*5)];
 const payload=type==='cook'?{sessionId:f.cookSessions[actor]?.id,steps:RECIPES[f.cookSessions[actor]?.recipe||'porridge'].stations.length,grades:RECIPES[f.cookSessions[actor]?.recipe||'porridge'].stations.map(()=>60+Math.floor(Math.random()*41))}:type==='feed'?{food:Object.keys(f.pantry).find(k=>f.pantry[k]>0&&k!=='coffee')}:type==='buy-food'?{food:'milk'}:{recipe};
 const next=tries(f,type,payload,actor,clock);if(!(next instanceof Error))f=next;
 if(Math.random()<.1)f.wallets={him:0,her:0};
 for(const who of ['him','her']){const probe=tries(structuredClone(f),'start-cook',{recipe:'porridge'},who,clock);
  if(probe instanceof Error){assert.match(probe.message,/Make room/,'porridge refused for: '+probe.message);assert.ok(f.pantry.porridge>90);}}
}
// Loose ingredients can be bought one at a time.
let loose=scenario('ready',noon);loose.wallets={him:20,her:0};loose.larder={};
loose=act(loose,'buy-ingredients',{item:'seaweed'});assert.equal(loose.larder.seaweed,1);assert.equal(loose.wallets.him,20-INGREDIENTS.find(i=>i.id==='seaweed').price);
assert.match(String(tries(loose,'buy-ingredients',{item:'truffle'})),/Choose an ingredient/);

// Arcade games that pay stardust also forage one themed ingredient, the one the
// larder is lowest on, up to FORAGE_CAP a day each. Every recipe is reachable.
for(const [game,k] of Object.entries(FORAGE))for(const id of k)assert.ok(INGREDIENTS.some(i=>i.id===id),game+' forages a real ingredient');
for(const r of Object.values(RECIPES))for(const id of Object.keys(r.ingredients))assert.ok(Object.values(FORAGE).flat().includes(id),id+' can be foraged');
const results={catch:{caught:40,misses:2,hits:1,bestCombo:20},pairs:{total:8,matched:8,moves:8,left:10},echo:{longest:9,mistakes:2}};
const play=(s,game,actor='him',now=noon)=>{s=projectStar(s,now);s.needs={food:90,clean:90,energy:90,joy:50};s=act(s,'start-play',{game,arcadeVersion:2,...(game==='pairs'?{level:8}:{})},actor,now);return applyAction(s,{actor,type:'play',id:'kitchen-'+(++serial),payload:{game,sessionId:s.playSessions[actor].id,arcade:results[game]}},now);};
let forage=scenario('ready',noon);forage.larder={};
let r=play(forage,'echo');forage=r.state;assert.equal(forage.larder.carrot,1,'echo turns up a carrot first');assert.match(r.message,/comet carrot/);
forage=play(forage,'echo').state;assert.equal(forage.larder.potato,1,'then the lowest one in its pool');
forage=play(forage,'echo').state;assert.equal(forage.larder.seaweed,1);
r=play(forage,'catch');forage=r.state;assert.equal(Object.values(forage.larder).reduce((a,b)=>a+b,0),3,'three a day each');assert.doesNotMatch(r.message,/Found/);
forage=play(forage,'catch','her').state;assert.equal(forage.larder.berries,1,'the other person forages separately');
forage=play(forage,'pairs','him',noon+DAY).state;assert.equal(forage.larder.bread,1,'and the cap resets tomorrow');
assert.ok(Object.values(normalizeStar(forage,noon+DAY).daily).some(b=>b.forage===1),'the daily count survives a save');

console.log('STAR KITCHEN: free porridge always possible, ingredients set aside and refunded, recipes settle with their own station counts');

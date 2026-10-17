// Little Star v2 pacing and economy: stages that began earlier keep their
// original goals, and arcade stardust has a daily allowance plus record bonus.
import assert from 'node:assert/strict';
import {scenario,applyAction,stageProgress,normalizeStar,STAGES,LEGACY_STAGES,ECONOMY,HOUR,DAY,cookingReward,SHOP} from '../little-star/engine.mjs';
import {arcadeResult,PAIR_BOARDS} from '../little-star/star-gameplay.mjs';

const start=Date.parse('2026-10-20T17:00:00Z');
let serial=0;
const act=(state,actor,type,payload,now)=>applyAction(state,{actor,type,payload,id:'economy-'+(++serial)},now).state;

// A baby whose stage began before the pacing update keeps the old 3-day goal.
const legacy=scenario('ready',start);
assert.equal(legacy.stage,0);
legacy.phasePacing=undefined;
const restored=normalizeStar(structuredClone(legacy),start);
assert.equal(restored.phasePacing,1,'stages without a pacing marker keep legacy goals');
assert.equal(stageProgress(restored,start).timeLeft>0,true);
const legacyTime=stageProgress({...restored,phaseAt:start-2.5*DAY,phaseDays:['2026-10-18'],phaseXP:99},start);
assert.ok(legacyTime.percent<100,'legacy baby is not ready after 2.5 days');
assert.equal(LEGACY_STAGES[0].time,3);

// The next stage a star enters uses the v2 table.
const paced={...restored,phasePacing:2,phaseAt:start-2.5*DAY,phaseDays:['2026-10-18'],phaseXP:STAGES[0].growth};
assert.equal(stageProgress(paced,start).percent,100,'v2 baby is ready after 2 days with care and growth');
assert.deepEqual(STAGES.map(s=>s.time),[2,3,4,6,0]);
assert.deepEqual(STAGES.map(s=>s.care),[1,2,3,4,0]);
assert.equal(normalizeStar(structuredClone(paced),start).phasePacing,2,'the pacing marker survives a save');

// Arcade payouts follow the new rates.
assert.equal(arcadeResult('catch',{caught:40,misses:1,hits:1,bestCombo:20}).cash,15);
assert.equal(arcadeResult('echo',{longest:10,mistakes:1}).cash,22);
assert.deepEqual(Object.values(PAIR_BOARDS).map(b=>b.cash),[20,28,36]);
assert.deepEqual([0,70,90,100].map(n=>cookingReward(n).tip),[0,2,5,8]);
assert.equal(SHOP.find(i=>i.id==='ember-regalia').tier,'master','new prices keep each item tier');
assert.equal(SHOP.find(i=>i.id==='bakery-room').tier,'master');

// Records pay once per game per day; all arcade pay shares one allowance.
let now=start,state=scenario('ready',start);state.wallets={him:0,her:0};
const play=(game,arcade,level=0)=>{
  state.needs={food:100,clean:100,joy:90,energy:100};
  state=act(state,'him','start-play',{game,arcadeVersion:2,level},now);
  now+=5*60000;
  state=act(state,'him','play',{game,sessionId:state.playSessions.him.id,arcade},now);
  now+=60000;return state.wallets.him;
};
let wallet=play('catch',{caught:40,misses:1,hits:1,bestCombo:15});
assert.equal(wallet,15,'a first run sets a record without a bonus');
wallet=play('catch',{caught:44,misses:1,hits:1,bestCombo:15});
assert.equal(wallet,15+16+ECONOMY.recordBonus,'beating a record pays the bonus');
wallet=play('catch',{caught:48,misses:1,hits:1,bestCombo:15});
assert.equal(wallet,15+16+10+17,'a second record the same day pays no extra bonus');
wallet=play('pairs',{total:12,matched:12,moves:12,left:100},12);
assert.equal(wallet,ECONOMY.arcadeCap,'daily arcade stardust stops at the cap');
assert.equal(state.arcadeBest.him['pairs-12']>0,true,'records still save after the cap');
const capped=play('echo',{longest:8,mistakes:0});
assert.equal(capped,ECONOMY.arcadeCap);
assert.equal(normalizeStar(structuredClone(state),now).daily[Object.keys(state.daily).find(k=>k.endsWith(':him'))].arcadeCash,ECONOMY.arcadeCap,'the allowance survives a save');

// A new day refreshes the allowance.
now=start+DAY+HOUR;
wallet=play('echo',{longest:8,mistakes:0});
assert.ok(wallet>ECONOMY.arcadeCap,'tomorrow pays again');

console.log('STAR ECONOMY: v2 pacing keeps live stages, arcade pay, records and daily cap behave');

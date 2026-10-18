import {activityWindow} from './activity-clock.js';
import {puzzleSeason} from './seasonal-puzzles.js';
import {random,searchGrid,isHardDay} from './daily-puzzles.js';
import {connectedCrossword} from './connected-crossword.js';
import {miniLattice,MINI_ENTRIES} from './mini-crossword.js';
import {cluePool,answerPool} from './round-library.js';
import {themedCrossword,isThemedDay} from './themed-crossword.js';
import {wordDetails,WORD_BOOK} from './word-book.js';
import {CROSSWORD_THEMES,themeEntry} from './crossword-themes.js';

export const ROUND_ENGINE_START='2026-10-13';
export const ROUND_TYPES=['word','search','crossword'];
// Retain catalog 7 compatibility; themed boards supersede its planned start.
export const MINI_CROSSWORD_START='2026-10-19';
export const isMiniDay=day=>day>=MINI_CROSSWORD_START&&!isThemedDay(day);
export const crosswordDuration=(day,hard)=>isMiniDay(day)?(hard?180000:120000):(hard?300000:180000);
export {revisionOf,assertRevision} from './round-revision.js';
export const roundWords=puzzle=>puzzle?.word?[puzzle.word.toUpperCase()]:(puzzle?.entries||[]).map(e=>e.word.toUpperCase());
export function weekDays(day){
 const date=new Date(day+'T12:00Z'),offset=(date.getUTCDay()+6)%7;
 if(!Number.isFinite(date.getTime()))throw Error('Invalid game day.');
 return Array.from({length:7},(_,i)=>new Date(date.getTime()+(i-offset)*86400000).toISOString().slice(0,10));
}
function shuffled(entries,rng){return entries.map(e=>({e,n:rng()})).sort((a,b)=>a.n-b.n).map(v=>v.e);}
// The same engine builds the compiled daily calendar and on-demand admin
// resets. A reset never reuses the old layout, answers, or already reserved
// words elsewhere in that week. Failure to find a full board changes nothing.
export function freshRounds({day,types=ROUND_TYPES,used=[],seed=day,now=Date.now()}){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!types.length||types.some(t=>!ROUND_TYPES.includes(t)))throw Error('Choose a daily game to reset.');
 const hard=isHardDay(day),season=puzzleSeason(day),excluded=new Set([...used].map(w=>w.toUpperCase()));
 const theme=season==='october'?'Halloween & autumn':season==='december'?'Christmas & winter':'Everyday words & ideas',window=activityWindow(day),rounds={};
 for(const type of ROUND_TYPES.filter(t=>types.includes(t))){
  const rng=random(seed+':'+type+':v6');
  if(type==='word'){
   const entry=shuffled(answerPool(hard,season).filter(e=>!excluded.has(e.word.toUpperCase())),rng)[0];
   if(!entry)throw Error('No fresh words remain this week. Nothing was reset.');
   rounds.word={day,word:entry.word,theme,difficulty:hard?'hard':'normal',catalogVersion:6,entryId:entry.id,revision:0,...window,...(isThemedDay(day)?{...wordDetails(entry.word),catalogVersion:8}:{})};
  }else{
   if(isThemedDay(day)){
    const layout=type==='crossword'?themedCrossword({hard,season,excluded,rng}):themedSearch(hard,season,excluded,rng);
    rounds[type]={day,type,hard,difficulty:hard?'hard':'normal',revision:0,...layout,...window,durationMs:type==='crossword'?(hard?300000:180000):(hard?150000:120000)};
    roundWords(rounds[type]).forEach(w=>excluded.add(w));continue;
   }
   const bank=shuffled(cluePool(hard,season).filter(e=>!excluded.has(e.word)),rng),mini=type==='crossword'&&isMiniDay(day);
   const entries=mini?MINI_ENTRIES:type==='crossword'&&hard?20:10;
   if(bank.length<(mini?MINI_ENTRIES*3:type==='crossword'&&hard?25:15))throw Error('Not enough fresh words remain for a full board. Nothing was reset.');
   // Limit candidates, not results: this avoids a huge search on a phone and
   // still gives the connected generator plenty of crossing opportunities.
   const layout=type==='search'?searchGrid(bank,hard?12:11,rng,true):mini?miniBoard(bank,hard,season,excluded,rng):connectedCrossword(bank.slice(0,65),hard?21:15,rng,hard?20:10);
   if(layout?.entries.length!==entries)throw Error('Could not make a complete fresh board. Try again; nothing was reset.');
   rounds[type]={day,type,hard,difficulty:hard?'hard':'normal',theme,themeId:'library-'+(season||'regular'),catalogVersion:mini?7:6,revision:0,...layout,...window,durationMs:type==='crossword'?crosswordDuration(day,hard):(hard?150000:120000)};
  }
  roundWords(rounds[type]).forEach(w=>excluded.add(w));
 }
 return rounds;
}
function themedSearch(hard,season,excluded,rng){
 const book=new Map(WORD_BOOK.map(e=>[e.word,e]));
 for(const t of [...shuffled(CROSSWORD_THEMES.filter(t=>t.season===season),rng),...(season?shuffled(CROSSWORD_THEMES.filter(t=>!t.season),rng):[])]){
  const pool=[...t.words].map(w=>book.get(w)).filter(e=>e&&!excluded.has(e.word)&&e.word.length>=4&&e.word.length<=(hard?10:9));
  if(pool.length<12)continue;
  return {...searchGrid(pool.map(e=>themeEntry(t,e)),hard?12:11,rng,true),theme:t.title,themeDescription:t.description,themeId:'search-v8-'+t.id,catalogVersion:8};
 }
 throw Error('Not enough fresh themed search words. Saved boards have not changed.');
}
// The day's own bank first. If its five-letter words cannot interlock, widen
// step by step (the season's other difficulty, then everyday words) rather
// than leave the day without a mini. Every answer still has a reviewed clue.
function miniBoard(bank,hard,season,excluded,rng){
 const fresh=(h,s)=>shuffled(cluePool(h,s).filter(e=>!excluded.has(e.word)),rng);
 const tiers=[[],fresh(!hard,season),...(season?[fresh(hard,''),fresh(!hard,'')]:[])];
 let pool=bank;
 for(const extra of tiers){pool=[...pool,...extra];const layout=miniLattice(pool,rng);if(layout)return layout;}
 return null;
}
const plans=new Map();
// Retire the technical-difficulty rounds that were actually shown before the
// engine cutover. They must not be spoiled answers again later this same week.
const retirements={'2026-10-12':'TRICK TREAT COSTUME MASK CAPE SEED MUMMY BUCKET BROOM CARVE MONSTER HAUNT GRAVE CURSE ALIBI CELLAR SECRET CREAK DREAD CRYPT ACORN WITCH'.split(' ')};
export function weeklyRounds(day){
 const days=weekDays(day),week=days[0];
 if(!plans.has(week)){
  const result={},used=new Set(retirements[week]||[]);
  for(const d of days){result[d]=freshRounds({day:d,used,seed:week+':'+d});for(const p of Object.values(result[d]))roundWords(p).forEach(w=>used.add(w));}
  // Keep a bounded build/client cache. Worker requests use compiled data.
  if(plans.size>=4)plans.delete(plans.keys().next().value);
  plans.set(week,result);
 }
 return plans.get(week);
}

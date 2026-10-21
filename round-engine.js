import {INITIAL_ROUND_HISTORY} from './round-history.js';
import {activityWindow} from './activity-clock.js';
import {puzzleSeason} from './seasonal-puzzles.js';
import {random,searchGrid,isHardDay} from './daily-puzzles.js';
import {connectedCrossword} from './connected-crossword.js';
import {miniLattice,MINI_ENTRIES} from './mini-crossword.js';
import {cluePool,answerPool,variedCluePool,variedAnswerPool} from './round-library.js';
import {themedCrossword,isThemedDay} from './themed-crossword.js';
import {wordDetails,WORD_BOOK} from './word-book.js';
import {CROSSWORD_THEMES,themeEntry} from './crossword-themes.js';

export const ROUND_ENGINE_START='2026-10-13';
export const NO_REPEAT_START='2026-10-21';
export const REPEAT_GAP_DAYS=30;
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
 const published=day<NO_REPEAT_START?[]:INITIAL_ROUND_HISTORY.filter(p=>p.day<=day&&(Date.parse(day)-Date.parse(p.day))/86400000<REPEAT_GAP_DAYS).flatMap(p=>p.words);
 const hard=isHardDay(day),season=puzzleSeason(day),excluded=new Set([...used,...published].map(w=>w.toUpperCase()));
 const theme=season==='october'?'Halloween & autumn':season==='december'?'Christmas & winter':'Everyday words & ideas',window=activityWindow(day),rounds={};
 for(const type of ROUND_TYPES.filter(t=>types.includes(t))){
  const rng=random(seed+':'+type+':v6');
  if(type==='word'){
   const modern=day>=NO_REPEAT_START;
   const candidates=(modern?variedAnswerPool(hard,season):answerPool(hard,season)).filter(e=>!excluded.has(e.word.toUpperCase()));
   const preferred=modern&&season&&rng()<0.45?candidates.filter(e=>e.season===season):[];
   const entry=shuffled(preferred.length?preferred:candidates,rng)[0];
   if(!entry)throw Error('No fresh words remain this week. Nothing was reset.');
   rounds.word={day,word:entry.word,theme,difficulty:hard?'hard':'normal',catalogVersion:6,entryId:entry.id,revision:0,...window,...(isThemedDay(day)?{...wordDetails(entry.word),catalogVersion:8}:{})};
  }else{
   if(isThemedDay(day)){
    const layout=type==='crossword'?themedCrossword({hard,season,excluded,rng,rolling:day>=NO_REPEAT_START}):themedSearch(hard,season,excluded,rng,day>=NO_REPEAT_START);
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
function themedSearch(hard,season,excluded,rng,rolling=false){
 const book=new Map(WORD_BOOK.map(e=>[e.word,e]));
 const seasonal=shuffled(CROSSWORD_THEMES.filter(t=>t.season===season),rng),everyday=season?shuffled(CROSSWORD_THEMES.filter(t=>!t.season),rng):[];
 const themes=rolling&&season&&rng()>=0.45?[...everyday,...seasonal]:[...seasonal,...everyday];
 for(const t of themes){
  const pool=[...t.words].map(w=>book.get(w)).filter(e=>e&&!excluded.has(e.word)&&e.word.length>=4&&e.word.length<=(hard?10:9));
  if(pool.length<(rolling?10:12))continue;
  let layout;try{layout=searchGrid(pool.map(e=>themeEntry(t,e)),hard?12:11,rng,true);}catch(error){if(error.message!=='Could not make a full word search')throw error;continue;}
  return {...layout,theme:t.title,themeDescription:t.description,themeId:'search-v8-'+t.id,catalogVersion:8};
 }
 if(!rolling)throw Error('Not enough fresh themed search words. Saved boards have not changed.');
 const fallback=variedCluePool(hard,season).filter(e=>!excluded.has(e.word));
 const layout=searchGrid(fallback,hard?12:11,rng,true);
 return {...layout,theme:'A little of everything',themeDescription:'Fresh words from several familiar subjects.',themeId:'search-v9-mixed',catalogVersion:9};
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
function buildWeek(week,recent=[]){
 const result={},used=new Set(retirements[week]||[]);
 for(const d of weekDays(week)){
  const prior=(d<NO_REPEAT_START?[]:recent).filter(p=>p.day<d&&(Date.parse(d)-Date.parse(p.day))/86400000<REPEAT_GAP_DAYS).flatMap(roundWords);
  const published=d<NO_REPEAT_START?[]:INITIAL_ROUND_HISTORY.filter(p=>p.day<=d&&(Date.parse(d)-Date.parse(p.day))/86400000<REPEAT_GAP_DAYS).flatMap(p=>p.words);
  result[d]=freshRounds({day:d,used:[...used,...prior,...published],seed:week+':'+d});
  for(const p of Object.values(result[d]))roundWords(p).forEach(w=>used.add(w));
 }
 plans.set(week,result);
 return result;
}
export function weeklyRounds(day){
 const week=weekDays(day)[0];
 if(plans.has(week))return plans.get(week);
 if(weekDays(week)[6]<NO_REPEAT_START)return buildWeek(week);
 // Build in date order from the fixed cutover. Random-access generation must
 // produce exactly the same rolling history as a chronological calendar build.
 const first='2026-10-12';
 for(let at=Date.parse(first+'T12:00Z');at<=Date.parse(week+'T12:00Z');at+=7*86400000){
  const w=new Date(at).toISOString().slice(0,10);
  if(plans.has(w))continue;
  const recent=weekDays(w)[6]<NO_REPEAT_START?[]:[...plans].filter(([key])=>key<w&&(Date.parse(w)-Date.parse(key))/86400000<REPEAT_GAP_DAYS+7).flatMap(([,plan])=>Object.values(plan).flatMap(Object.values));
  buildWeek(w,recent);
 }
 return plans.get(week);
}

// Admin replacements also avoid answers scheduled within 30 days on either
// side, so a fresh reset cannot spoil an already compiled upcoming board.
export function scheduledCooldownWords(day){
 if(day<NO_REPEAT_START)return [];
 const offset=n=>new Date(Date.parse(day+'T12:00Z')+n*86400000).toISOString().slice(0,10);
 const first=offset(1-REPEAT_GAP_DAYS),last=offset(REPEAT_GAP_DAYS-1);
 weeklyRounds(last);
 return [...plans.values()].flatMap(plan=>Object.entries(plan).filter(([d])=>d>=first&&d<=last).flatMap(([,rounds])=>Object.values(rounds).flatMap(roundWords)));
}

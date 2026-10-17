import {wordPoints,wordCeiling,scoreWeek,weekForDay,newScoring} from './word-scores.js';
import {LEAGUE_START_DAY,PUZZLE_TYPES} from './daily-puzzles.js';
import {timedPoints,timedCeiling,timedOver,timeSaved} from './timed-game.js';
export const LEAGUE_WEEK=weekForDay(LEAGUE_START_DAY).start;
export function leagueWeek(day,words=[],timed=[],now=Date.now()){
 const score=scoreWeek(day,words),week=weekForDay(day);
 for(const date of week.days)if(date>=LEAGUE_START_DAY)for(const type of PUZZLE_TYPES)for(const person of ['her','him'])score.scores[person]+=timedPoints(timed.find(r=>r.day===date&&r.type===type&&r.person===person),now);
 const high=Math.max(score.scores.her,score.scores.him),format=week.start>=LEAGUE_WEEK?'trio':'word';
 const winners=high?['her','him'].filter(p=>score.scores[p]===high):[];
 // From the scoring change, tied points go to whoever left more time on the
 // clock across fully solved boards. Only an exact time tie opens the hard rounds.
 if(winners.length===2&&newScoring(week.start)){
  const saved=weekTimeSaved(week,timed);
  if(saved.her!==saved.him)return {...score,scoreVersion:2,format,winners:[saved.her>saved.him?'her':'him'],decidedBy:'time',saved};
 }
 return {...score,scoreVersion:2,format,winners};
}
// Milliseconds left on the clock across the week's fully solved timed boards.
export function weekTimeSaved(week,timed=[]){
 const saved={her:0,him:0};
 for(const date of week.days)for(const type of PUZZLE_TYPES)for(const person of ['her','him']){
  const game=timed.find(r=>r.day===date&&r.type===type&&r.person===person);
  if(game?.done)saved[person]+=timeSaved(game);
 }
 return saved;
}
export function trioProgress(day,carry,words=[],timed=[],now=Date.now()){
 const scores={her:carry.her||0,him:carry.him||0},ceiling={...scores},finished={her:0,him:0};
 for(const person of ['her','him']){
  const word=words.find(w=>w.day===day&&w.person===person);
  scores[person]+=wordPoints(word);
  const remainingWord=wordCeiling(word,day);
  ceiling[person]+=remainingWord;
  if(word?.done)finished[person]++;
  for(const type of PUZZLE_TYPES){
   const game=timed.find(w=>w.day===day&&w.person===person&&w.type===type);
   scores[person]+=timedPoints(game,now);ceiling[person]+=timedCeiling(game,type,now,day);
   if(timedOver(game,now))finished[person]++;
  }
 }
 const outcome=scores.her>ceiling.him?'her':scores.him>ceiling.her?'him':finished.her===3&&finished.him===3?(scores.her===scores.him?'tie':scores.her>scores.him?'her':'him'):'';
 return {scores,ceiling,finished,outcome};
}

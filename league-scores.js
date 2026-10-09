import {wordPoints,scoreWeek,weekForDay} from './word-scores.js';
import {LEAGUE_START_DAY,PUZZLE_TYPES} from './daily-puzzles.js';
import {timedPoints,timedCeiling,timedOver} from './timed-game.js';
export const LEAGUE_WEEK=weekForDay(LEAGUE_START_DAY).start;
export function leagueWeek(day,words=[],timed=[],now=Date.now()){
 const score=scoreWeek(day,words),week=weekForDay(day);
 for(const date of week.days)if(date>=LEAGUE_START_DAY)for(const type of PUZZLE_TYPES)for(const person of ['her','him'])score.scores[person]+=timedPoints(timed.find(r=>r.day===date&&r.type===type&&r.person===person),now);
 const high=Math.max(score.scores.her,score.scores.him);
 return {...score,scoreVersion:2,format:week.start>=LEAGUE_WEEK?'trio':'word',winners:high?['her','him'].filter(p=>score.scores[p]===high):[]};
}
export function trioProgress(day,carry,words=[],timed=[],now=Date.now()){
 const scores={her:carry.her||0,him:carry.him||0},ceiling={...scores},finished={her:0,him:0};
 for(const person of ['her','him']){
  const word=words.find(w=>w.day===day&&w.person===person);
  scores[person]+=wordPoints(word);
  const remainingWord=word?.done?wordPoints(word):([200,80,60,40,20][word?.attempts||0]||0);
  ceiling[person]+=remainingWord;
  if(word?.done)finished[person]++;
  for(const type of PUZZLE_TYPES){
   const game=timed.find(w=>w.day===day&&w.person===person&&w.type===type);
   scores[person]+=timedPoints(game,now);ceiling[person]+=timedCeiling(game,type,now);
   if(timedOver(game,now))finished[person]++;
  }
 }
 const outcome=scores.her>ceiling.him?'her':scores.him>ceiling.her?'him':finished.her===3&&finished.him===3?(scores.her===scores.him?'tie':scores.her>scores.him?'her':'him'):'';
 return {scores,ceiling,finished,outcome};
}

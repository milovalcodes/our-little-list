export const WORD_ATTEMPTS=5;
// Greens claim their copies first. Yellow must consume only the copies left.
export function scoreGuess(guess,answer) {
  const marks=Array(5).fill('absent'),remaining={};
  for(let i=0;i<5;i++)if(guess[i]===answer[i])marks[i]='correct';else remaining[answer[i]]=(remaining[answer[i]]||0)+1;
  for(let i=0;i<5;i++)if(marks[i]!=='correct'&&remaining[guess[i]]>0){marks[i]='present';remaining[guess[i]]--;}
  return marks;
}
export function nextWordAttempt(before,puzzle,{day,person,guess,expectedCount,now=Date.now()}) {
  if(!puzzle||puzzle.day!==day||now<puzzle.opensAt||now>=puzzle.closesAt)throw Error('This daily word has closed. Open today’s activities.');
  if(!['her','him'].includes(person)||!/^[a-z]{5}$/.test(guess))throw Error('Use a five-letter word.');
  const guesses=before?.guesses||[];
  if(before&&(before.person!==person||before.day!==day))throw Error('This is not your puzzle.');
  if(before?.done||guesses.length>=WORD_ATTEMPTS)throw Error('You’ve finished this one. Another word arrives at 9 a.m.');
  if(guesses.length!==expectedCount)throw Error('Your other screen made a guess. The board is catching up.');
  if(guesses.includes(guess))throw Error('Already tried that one. No attempt used.');
  const next=[...guesses,guess],won=guess===puzzle.word;
  return {day,person,guesses:next,won,done:won||next.length===WORD_ATTEMPTS,updatedAt:now};
}
export function wordSummary(game){return {day:game.day,person:game.person,attempts:game.guesses.length,done:game.done,won:game.won,updatedAt:game.updatedAt};}

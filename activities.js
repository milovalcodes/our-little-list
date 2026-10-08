import { bootPage } from './page-boot.js';
import { startPresence } from './presence.js';
import { startDailyQuestion } from './daily-question.js';
import { startDailyWord } from './daily-word.js';
import { startWordTiebreakers } from './word-tiebreaker.js';
import { activityClock } from './activity-clock.js';
const context=await bootPage();
startPresence(context.data,context.viewer,'activities');
startDailyQuestion(context);
startDailyWord(context);
startWordTiebreakers(context);
document.getElementById('daily-date').textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(activityClock().day+'T12:00:00Z'))+' · new daily pair at 9 a.m. Eastern';
function openDaily(){
  if(location.hash==='#question')document.getElementById('daily-question').open=true;
  if(location.hash==='#wordle')document.getElementById('wordle').open=true;
  if(location.hash==='#scoreboard')document.getElementById('scoreboard').open=true;
}
openDaily();addEventListener('hashchange',openDaily);
await import('./game-panel.js');

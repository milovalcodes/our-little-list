import { bootPage } from './page-boot.js';
import { startPresence } from './presence.js';
import { startDailyQuestion } from './daily-question.js';
import { startDailyWord } from './daily-word.js';
import { startWordTiebreakers } from './word-tiebreaker.js';
import { activityClock } from './activity-clock.js';
import {startWeeklyTracker} from './weekly-tracker.js';
import {startTimedGame} from './timed-games.js';
import {startPracticeLinks} from './practice-links.js';
const context=await bootPage();
startPracticeLinks(context.viewer);
startPresence(context.data,context.viewer,'activities');
startDailyQuestion(context);
startDailyWord(context);
startWeeklyTracker(context);
startWordTiebreakers(context);
for(const type of ['search','crossword'])startTimedGame(context,{type,host:document.getElementById(type+'-game'),summary:document.getElementById(type+'-summary'),disclosure:document.getElementById(type)});
document.getElementById('daily-date').textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(activityClock().day+'T12:00:00Z'))+' · fresh at 9 a.m. Eastern';
function openDaily(){
  if(location.hash==='#shelf'||/^#game(?:-|$)/.test(location.hash))history.replaceState(null,'',location.pathname+location.search+'#daily');
  if(location.hash==='#question')document.getElementById('daily-question').open=true;
  if(location.hash==='#wordle')document.getElementById('wordle').open=true;
  if(/^#scoreboard(?:-\d{4}-\d{2}-\d{2})?$/.test(location.hash))document.getElementById('scoreboard').open=true;
  for(const type of ['search','crossword'])if(location.hash==='#'+type)document.getElementById(type).open=true;
}
openDaily();addEventListener('hashchange',openDaily);

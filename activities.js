import {bootPage} from './page-boot.js';
import {startPresence} from './presence.js';
import {startDailyQuestion} from './daily-question.js';
import {startWinHistory} from './win-history.js';
import {activityClock} from './activity-clock.js';

// Bookmarks and already-delivered notifications cannot reopen a retired board.
function normalizeRoute(){
 const url=new URL(location.href);
 if(url.searchParams.has('game')||/^#(?:wordle|search|crossword|tiebreaker|shelf|game)(?:-|$)/.test(url.hash)){
  url.searchParams.delete('game');url.hash='#question';history.replaceState(null,'',url);
 }
}
normalizeRoute();addEventListener('hashchange',normalizeRoute);
const context=await bootPage();
startDailyQuestion(context);
startWinHistory(context);
startPresence(context.data,context.viewer,'activities');
document.getElementById('daily-date').textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(activityClock().day+'T12:00:00Z'))+' · a question at 9 a.m. Eastern';

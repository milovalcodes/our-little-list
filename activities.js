import {uiIcon} from './interface-icons.js';
import {startGameComfort} from './game-comfort.js';
import {watchDailyStates,startCountdowns} from './daily-habit.js';
import { bootPage } from './page-boot.js';
import { startPresence } from './presence.js';
import { startDailyQuestion } from './daily-question.js';
import { startDailyWord } from './daily-word.js';
import { startWordTiebreakers } from './word-tiebreaker.js';
import { activityClock } from './activity-clock.js';
import {startWeeklyTracker} from './weekly-tracker.js';
import {startTimedGame} from './timed-games.js';
import {startGameReset} from './game-reset.js';
const gameNames={wordle:'Little Word',search:'Word Search',crossword:'Crossword'};
const params=new URLSearchParams(location.search);
if(location.hash==='#shelf'||/^#game(?:-|$)/.test(location.hash))history.replaceState(null,'',location.pathname+location.search+'#daily');
const requested=location.hash.slice(1);
let game=requested==='tiebreaker'?'wordle':Object.hasOwn(gameNames,requested)?requested:params.get('game');
if(Object.hasOwn(gameNames,game)&&params.get('game')!==game){
 params.set('game',game);
 history.replaceState(null,'',location.pathname+'?'+params+location.hash);
}
if(!Object.hasOwn(gameNames,game))game=null;
const screen=document.querySelector('main');
screen.classList.add(game?'activity-game-screen':'activity-hub');
if(game){
 document.title=gameNames[game]+' · Our Little App';
 document.querySelector('h1').textContent=gameNames[game];
 const back=document.createElement('a');back.className='activity-back';
 const homeParams=new URLSearchParams(location.search);homeParams.delete('game');
 back.href='activities.html'+(homeParams.size?'?'+homeParams:'');back.innerHTML=uiIcon('chevronLeft')+' Activities';
 document.querySelector('.feature-hero').prepend(back);
 for(const id of ['scoreboard','daily-question',...Object.keys(gameNames).filter(id=>id!==game)])document.getElementById(id).remove();
 document.getElementById(game).open=true;
 document.querySelector('#'+game+'>summary').addEventListener('click',event=>event.preventDefault());
 if(game!=='wordle')document.getElementById('tiebreaker').remove();
 document.getElementById('practice').remove();
 const practice=document.createElement('a');practice.className='activity-practice-link';
 practice.href='practice.html#'+(game==='wordle'?'word':game)+'-normal';practice.textContent='Practice '+gameNames[game];screen.append(practice);
}else{
 const links=document.createElement('nav');links.className='activity-game-links';links.setAttribute('aria-label','Daily games');
 links.innerHTML='<h2>A little daily challenge</h2>';
 for(const [id,title] of Object.entries(gameNames)){
  const query=new URLSearchParams(location.search);query.set('game',id);
  const link=document.createElement('a');link.className='activity-game-link';link.id=id;
  link.href='activities.html?'+query;
  link.innerHTML='<span><strong>'+title+'</strong><small class="daily-state">open today’s game</small></span><span aria-hidden="true">'+uiIcon('chevron')+'</span>';
  document.getElementById(id).replaceWith(link);links.append(link);
 }
 document.getElementById('scoreboard').after(links);
 document.getElementById('scoreboard').before(document.getElementById('daily-question'));
 // The tie-break has its own game screen too.
 document.getElementById('tiebreaker').remove();
 document.getElementById('practice').innerHTML='<a class="activity-practice-link" href="practice.html">Browse practice games →</a>';
 for(const id of ['scoreboard','daily-question']){
  const panel=document.getElementById(id),heading=panel.querySelector(':scope > summary');
  const section=document.createElement('section');section.id=id;section.className=panel.className;
  const title=document.createElement('header');title.className='activity-panel-heading';title.innerHTML=heading.innerHTML;
  title.querySelector('.daily-chevron')?.remove();
  if(id==='scoreboard')title.querySelector('strong').textContent='Race to the Crown';
  section.append(title,...[...panel.children].filter(child=>child!==heading));panel.replaceWith(section);
 }
}
const context=await bootPage();
startGameReset(context);
startCountdowns();
if(game){
 const comfort=document.createElement('section');comfort.className='game-comfort';document.getElementById('daily-date').after(comfort);startGameComfort(comfort);
 if(game==='wordle'){startDailyWord(context);startWordTiebreakers(context);}
 else startTimedGame(context,{type:game,host:document.getElementById(game+'-game'),summary:document.getElementById(game+'-summary'),disclosure:document.getElementById(game)});
}else{
 watchDailyStates(context.data,context.viewer,states=>{for(const g of states){const status=document.querySelector('#'+g.hash+' .daily-state');if(status)status.textContent=g.label;}});
 startDailyQuestion(context);startWeeklyTracker(context);
 let duels=[],ends=[],finals=[];
 const showTie=()=>{document.getElementById('crown-tie-link')?.remove();if(!duels.some(d=>!ends.some(e=>e.id===d.puzzleId)&&!finals.some(w=>w.week===d.week)))return;const link=document.createElement('a');link.id='crown-tie-link';link.className='activity-game-link';const query=new URLSearchParams(location.search);query.set('game','wordle');link.href='activities.html?'+query+'#tiebreaker';link.textContent='Crown tie-break →';document.querySelector('.activity-game-links').append(link);};
 context.data.listenTo('wordDuels',rows=>{duels=rows;showTie();});context.data.listenTo('wordDuelEnds',rows=>{ends=rows;showTie();});context.data.listenTo('wordWeeks',rows=>{finals=rows;showTie();});
}
startPresence(context.data,context.viewer,'activities');
document.getElementById('daily-date').textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(activityClock().day+'T12:00:00Z'))+' · fresh at 9 a.m. Eastern';
function openDaily(){
 if(location.hash==='#shelf'||/^#game(?:-|$)/.test(location.hash)){history.replaceState(null,'',location.pathname+location.search+'#daily');return;}
 const target=location.hash.slice(1);
 if(target==='tiebreaker'&&game!=='wordle'){const query=new URLSearchParams(location.search);query.set('game','wordle');location.replace('activities.html?'+query+'#tiebreaker');return;}
 if(Object.hasOwn(gameNames,target)&&target!==game){const query=new URLSearchParams(location.search);query.set('game',target);location.replace('activities.html?'+query+'#'+target);}
}
addEventListener('hashchange',openDaily);

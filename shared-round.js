import {escapeHtml as esc} from './ui-helpers.js';
import {personName} from './profile-store.js';
import {revisionOf} from './round-revision.js';
import {scoreGuess,wordSummary} from './word-game.js';
import {wordPoints} from './word-scores.js';
import {timedOver,timedPoints} from './timed-game.js';

export const ROUND_REACTIONS=[['👑','Royal performance'],['😭','What a round'],['🔥','On fire'],['😂','Made me laugh']];
export function comparisonReady(type,mine,partner,puzzle){
 const ended=r=>type==='word'?r?.done:timedOver(r);
 return Boolean(puzzle&&ended(mine)&&ended(partner)&&revisionOf(mine)===revisionOf(puzzle)&&revisionOf(partner)===revisionOf(puzzle));
}
export const reactionId=({day,type,revision,person})=>`${day}-${type}-${revision}-${person}`;

// One inline reveal per player and puzzle revision. Only finished boards are
// fetched; reactions never write into scores or send notification messages.
export function createSharedRound({data,viewer,other,day,type,host,onChange}){
 let state=null,key='',rows=[],stop=null,disposed=false,busy=false,error='',peek=null,peekError='',loading=false,request=0,observer=null;
 const seen=new Set();
 const storageKey=()=>`our-little-list-round-reveal:${viewer}:${key}`;
 function remembered(){try{return seen.has(key)||localStorage.getItem(storageKey())==='1';}catch{return seen.has(key);}}
 function clear(){stop?.();stop=null;observer?.disconnect();request++;rows=[];peek=null;peekError='';loading=false;busy=false;error='';}
 function subscribe(){
  stop?.();error='';
  stop=data.listenToQuery('gameReactions',{where:[{field:'day',value:day},{field:'type',value:type},{field:'revision',value:revisionOf(state.puzzle)}]},next=>{rows=next;onChange();},{onError:()=>{error='Reactions couldn’t sync. Try again.';onChange();}});
 }
 async function loadBoard(){
  if(type!=='word'||loading||peek||!state)return;
  const token=++request,revision=revisionOf(state.puzzle);loading=true;peekError='';let timer;
  try{
   const board=await Promise.race([data.readDoc('wordGames',`${day}-${other}`),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),12000);})]);
   if(disposed||token!==request)return;
   if(!board?.done||board.day!==day||board.person!==other||revisionOf(board)!==revision||!Array.isArray(board.guesses)||!board.guesses.length||board.guesses.length>6||board.guesses.some(g=>!(/^[a-z]{5}$/i.test(g))))throw Error('not ready');
   peek=board;
  }catch{if(!disposed&&token===request)peekError='Their grid couldn’t load.';}
  finally{clearTimeout(timer);if(!disposed&&token===request){loading=false;onChange();}}
 }
 function miniGrid(game,label){
  return `<div class="shared-grid"><small>${esc(label)}</small><div role="group" aria-label="${esc(label)}: ${game.guesses.length} guesses">${game.guesses.map((guess,row)=>`<div class="shared-word-row" role="group" aria-label="Guess ${row+1}">${scoreGuess(guess,state.puzzle.word).map((mark,i)=>`<span role="img" class="word-tile ${mark}" aria-label="${esc(guess[i].toUpperCase())}, ${mark}">${esc(guess[i])}</span>`).join('')}</div>`).join('')}</div></div>`;
 }
 const click=async event=>{
  if(event.target.closest('[data-round-retry]')){subscribe();return;}
  if(event.target.closest('[data-round-grid-retry]')){void loadBoard();return;}
  const button=event.target.closest('[data-round-react]');
  if(!button||!state||busy)return;
  if(!navigator.onLine){error='Reconnect to send a reaction.';onChange();return;}
  const emoji=button.dataset.roundReact,revision=revisionOf(state.puzzle),currentKey=key;
  if(!ROUND_REACTIONS.some(([value])=>value===emoji))return;
  busy=true;error='';onChange();
  try{await data.saveGameReaction({day,type,revision,person:viewer,emoji});}
  catch{if(currentKey===key)error='That reaction didn’t save. Try again.';}
  finally{if(!disposed&&currentKey===key){
   const restoreFocus=document.activeElement===document.body||Boolean(document.activeElement?.matches('[data-round-react]')&&host.contains(document.activeElement));
   busy=false;onChange();const next=host.querySelector(`[data-round-react="${emoji}"]`);
   if(restoreFocus&&next?.getClientRects().length)next.focus({preventScroll:true});
  }}
 };
 host.addEventListener('click',click);
 return {
  update(next){
   if(!comparisonReady(type,next.mine,next.partner,next.puzzle)){if(key){clear();key='';}state=null;return;}
   const nextKey=`${day}-${type}-${revisionOf(next.puzzle)}`;state=next;
   if(nextKey!==key){clear();key=nextKey;subscribe();void loadBoard();}
  },
  markup(){
   if(!state)return '';
   const points=type==='word'?wordPoints:timedPoints,a=points(type==='word'?wordSummary(state.mine):state.mine),b=points(state.partner);
   const result=a===b?'You tied this round':a>b?'You take this round':`${personName(other)} takes this round`;
   const mine=rows.find(r=>r.person===viewer),theirs=rows.find(r=>r.person===other);
   return `<section class="shared-round" data-shared-round aria-label="Our round together"><p class="shared-round-result">${esc(result)}</p>${type==='word'?peek?`<div class="shared-grids">${miniGrid(state.mine,'You')}${miniGrid(peek,personName(other))}</div>`:`<p class="shared-grid-status" role="status">${peekError||'Opening your grids…'} ${peekError?'<button type="button" data-round-grid-retry>retry grids</button>':''}</p>`:''}<p class="shared-reaction-label">React to ${esc(personName(other))}’s round</p><div class="round-reactions" role="group" aria-label="React to your partner’s round">${ROUND_REACTIONS.map(([emoji,label])=>`<button type="button" data-round-react="${emoji}" aria-label="${label}" aria-pressed="${mine?.emoji===emoji}" ${busy?'disabled':''}>${emoji}</button>`).join('')}</div><p class="shared-reaction-status" role="status">${esc(error||(busy?'Sending…':theirs?`${personName(other)} reacted ${theirs.emoji} to your round`:mine?'Your reaction is saved.':'One little reaction for their round.'))}${error?'<button type="button" data-round-retry>retry sync</button>':''}</p></section>`;
  },
  mounted(){
   observer?.disconnect();const node=host.querySelector('[data-shared-round]');if(!node||remembered())return;
   observer=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting)||disposed)return;
    if(type==='word'&&!peek)return;
    observer.disconnect();seen.add(key);try{localStorage.setItem(storageKey(),'1');}catch{}
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.documentElement.hasAttribute('data-quiet-motion'))node.classList.add('is-revealing');
   },{threshold:.25});observer.observe(node);
  },
  dispose(){disposed=true;clear();host.removeEventListener('click',click);}
 };
}

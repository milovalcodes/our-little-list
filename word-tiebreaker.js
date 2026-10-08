import { startDailyWord } from './daily-word.js';
import { personName } from './profile-store.js';
import { escapeHtml } from './ui-helpers.js';
export function startWordTiebreakers(context){
  const host=document.getElementById('tiebreaker');
  let duels=[],ends=[],finals=[],active='',lastDuel='',stop=null,selected='';
  function render(){
    const pending=duels.filter(d=>!ends.some(e=>e.id===d.puzzleId)&&!finals.some(w=>w.week===d.week)).sort((a,b)=>a.week.localeCompare(b.week)||b.round-a.round);
    const next=pending.find(d=>d.puzzleId===selected)||pending[0];
    if(next?.puzzleId===active)return;
    if(active)lastDuel=active;
    const previous=lastDuel;
    stop?.();stop=null;active=next?.puzzleId||'';
    host.hidden=!next;
    if(!next){
      host.innerHTML='';
      const end=ends.find(e=>e.id===previous&&e.outcome!=='tie');
      if(end){host.hidden=false;host.innerHTML='<p class="tie-result" role="status">'+escapeHtml(personName(end.outcome))+' takes the crown ♛</p>';context.data.readDoc('wordPuzzles',previous).then(p=>{if(!active&&p)host.querySelector('.tie-result')?.append(' The word was '+p.word.toUpperCase()+'.');}).catch(()=>{});}
      return;
    }
    host.innerHTML=`<details class="daily-entry tie-entry"><summary><span aria-hidden="true">⚔</span><span><strong>Tie-break · round ${next.round}</strong><small class="tie-summary">the crown is still up for grabs</small></span><span aria-hidden="true">＋</span></summary><p class="tie-week">Week of ${escapeHtml(next.week)} · no time limit</p>${pending.length>1?`<nav class="tie-other-weeks" aria-label="Unfinished tie-breaks">${pending.map(d=>`<button type="button" data-tie="${escapeHtml(d.puzzleId)}" aria-pressed="${d.puzzleId===active}">${escapeHtml(d.week)}</button>`).join('')}</nav>`:''}<section class="tie-board"></section></details>`;
    const disclosure=host.querySelector('details');
    if(location.hash==='#tiebreaker')disclosure.open=true;
    stop=startDailyWord(context,{day:next.puzzleId,host:host.querySelector('.tie-board'),summary:host.querySelector('.tie-summary'),disclosure});
  }
  context.data.listenTo('wordDuels',items=>{duels=items;render();});
  context.data.listenTo('wordDuelEnds',items=>{ends=items;render();});
  context.data.listenTo('wordWeeks',items=>{finals=items;render();});
  host.addEventListener('click',event=>{const button=event.target.closest('[data-tie]');if(button){selected=button.dataset.tie;render();}});
  addEventListener('hashchange',()=>{if(location.hash==='#tiebreaker'&&host.querySelector('details'))host.querySelector('details').open=true;});
}

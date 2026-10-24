import {normalizeWeekRecord} from './win-records.js';
import {validMemoryDate} from './memory-catalog.js';
import {personName} from './profile-store.js';
import {escapeHtml as esc} from './ui-helpers.js';
import {uiIcon} from './interface-icons.js';

// Only saved final records are shown. Never infer a winner from unfinished weeks.
export function recordedWins(rows){
 const seen=new Set();
 return rows.filter(w=>validMemoryDate(w.week)&&!seen.has(w.week)&&(seen.add(w.week),true))
  .map(w=>normalizeWeekRecord(w)).sort((a,b)=>b.week.localeCompare(a.week));
}
export function startWinHistory({data}){
 const host=document.getElementById('wins-history');let rows=[],stop,timer,version=0,loaded=false;
 const name=p=>esc(personName(p)===p?(p==='her'?'Sun':'Moon'):personName(p));
 function render(){
  if(!loaded)return;
  const wins=recordedWins(rows);
  host.innerHTML=wins.length?'<ol class="wins-list">'+wins.map(w=>{
   const title=w.winners.length===1?name(w.winners[0])+' won':w.winners.length===2?'A shared win':'No winner recorded';
   const date=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(w.week+'T12:00Z'));
   return `<li id="win-${w.week}"><div class="win-mark" aria-hidden="true">${uiIcon('crown')}</div><div><h3>${title}</h3><p>Week of ${date}</p><p class="win-scores">${name('her')} <b>${w.scores.her}</b> · ${name('him')} <b>${w.scores.him}</b></p></div></li>`;
  }).join('')+'</ol>':'<p class="wins-empty">Our recorded wins will stay here.</p>';
  route();
 }
 function route(){const week=/^#scoreboard-(\d{4}-\d{2}-\d{2})$/.exec(location.hash)?.[1];if(week)document.getElementById('win-'+week)?.scrollIntoView({block:'center'});}
 function load(){
  const current=++version;stop?.();clearTimeout(timer);loaded=false;
  host.innerHTML='<p role="status">Loading our wins…</p>';
  const fail=()=>{if(current!==version)return;clearTimeout(timer);loaded=false;host.innerHTML='<p role="status">Couldn’t load our wins.</p><button type="button" data-retry-wins>Try again</button>';};
  timer=setTimeout(fail,12000);
  stop=data.listenTo('wordWeeks',items=>{if(current!==version)return;clearTimeout(timer);rows=items;loaded=true;render();},{onError:fail});
 }
 host.addEventListener('click',e=>{if(e.target.closest('[data-retry-wins]'))load();});
 addEventListener('online',load);addEventListener('hashchange',route);addEventListener('littlelist:profile',render);load();
 return()=>{version++;clearTimeout(timer);stop?.();removeEventListener('online',load);removeEventListener('hashchange',route);removeEventListener('littlelist:profile',render);};
}

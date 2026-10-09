import {activityClock} from './activity-clock.js';
import {weekForDay} from './word-scores.js';
import {weeklyReport,SCORE_GAMES} from './weekly-report.js';
import {personName} from './profile-store.js';
import {escapeHtml as esc} from './ui-helpers.js';

export function startWeeklyTracker({data}){
 const host=document.getElementById('weekly-board'),headline=document.getElementById('weekly-score'),current=weekForDay(activityClock().day).start;
 const hashWeek=()=>{const value=/^#scoreboard-(\d{4}-\d{2}-\d{2})$/.exec(location.hash)?.[1];return value&&Number.isFinite(Date.parse(value+'T12:00Z'))&&value<=current&&weekForDay(value).start===value?value:null;};
 let selected=hashWeek()||current,weeks=[],duels=[],words=[],timed=[],loaded=new Set(),failures=new Set(),stops=[],revision=0,failed=false,timedOut=false,signature='',disposed=false,loadTimer;
 const name=p=>esc(personName(p)===p?(p==='her'?'Sun':'Moon'):personName(p)),names=games=>games.map(g=>g.name).join(' & ');
 const label=day=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(day+'T12:00Z'));
 function load(){
  stops.forEach(f=>f());stops=[];clearTimeout(loadTimer);words=[];timed=[];loaded=new Set();failures=new Set();failed=false;timedOut=false;signature='';const token=++revision,week=weekForDay(selected);
  const received=name=>{loaded.add(name);failures.delete(name);failed=failures.size>0||(timedOut&&loaded.size<4);render();};
  const failure=name=>{if(token!==revision)return;failures.add(name);failed=true;render();};
  stops.push(data.listenTo('wordWeeks',rows=>{if(token!==revision)return;weeks=rows;received('wordWeeks');},{onError:()=>failure('wordWeeks')}));
  stops.push(data.listenTo('wordDuels',rows=>{if(token!==revision)return;duels=rows;received('wordDuels');},{onError:()=>failure('wordDuels')}));
  for(const collection of ['wordResults','timedResults'])stops.push(data.listenToQuery(collection,{where:[{field:'day',op:'>=',value:week.start},{field:'day',op:'<=',value:week.end}]},rows=>{
   if(token!==revision)return;if(collection==='wordResults')words=rows;else timed=rows;received(collection);
  },{onError:()=>failure(collection)}));
  loadTimer=setTimeout(()=>{if(token===revision&&loaded.size<4){timedOut=true;failed=true;render();}},12000);
  render();
 }
 function render(){
  if(disposed)return;
  const record=weeks.find(w=>w.week===selected),report=weeklyReport(selected,words,timed,record);
  const choices=[...new Set([current,selected,...[...weeks,...duels].map(w=>w.week).filter(w=>/^\d{4}-\d{2}-\d{2}$/.test(w)&&w<=current)])].sort().reverse();
  const next=JSON.stringify({report,choices,failed,loaded:[...loaded],names:['her','him'].map(p=>personName(p))});
  if(next===signature)return;signature=next;
  const ready=loaded.size===4&&!failed,previousTotals=host.dataset.totals;
  if(ready)clearTimeout(loadTimer);
  const open=[...host.querySelectorAll('details[open][data-score-detail]')].map(d=>d.dataset.scoreDetail);
  const focus=host.querySelector(':focus')?.id;
  headline.textContent=ready?`☀ ${report.totals.her} · ☾ ${report.totals.him}`:'…';
  const dateRow=`<div class="score-week-picker"><label for="score-week">${record?'Weekly recap':'The weekly race'}</label><select id="score-week" aria-label="Score week">${choices.map(w=>`<option value="${w}" ${w===selected?'selected':''}>${w===current?'This week':'Week of '+label(w)}</option>`).join('')}</select></div>`;
  if(!ready){host.innerHTML=dateRow+`<p role="status">${failed?'Couldn’t load the points. Check your connection and try again.':'adding up the week…'}</p>${failed?'<button type="button" data-score-retry>retry</button>':''}`;return;}
  const leading=report.totals.her===report.totals.him?'':report.totals.her>report.totals.him?'her':'him';
  const margin=Math.abs(report.totals.her-report.totals.him);
  const outcome=record?(report.winner?`${name(report.winner)} takes the crown · ${margin} point lead`:'A quiet week · the crown rests'):leading?`${name(leading)} leads by ${margin}`:report.totals.her?'neck and neck':'a fresh scoreboard';
  const hero=`<div class="score-podium">${['her','him'].map(p=>`<div class="score-person ${report.winner===p?'is-winner':''}"><span class="score-avatar"><img src="${p==='her'?'sun':'moon'}-profile.png" alt="">${report.winner===p?'<span aria-label="Weekly winner">♛</span>':''}</span><strong>${name(p)}</strong><b class="score-number">${report.totals[p]}<small>points</small></b></div>`).join('')}</div><p class="score-outcome" role="status">${outcome}</p>`;
  const sources=`<section class="score-sources"><h3>Where the points came from</h3><p class="score-column-head"><span>${name('her')}</span><span>${name('him')}</span></p>${SCORE_GAMES.map(g=>{
   const a=report.stats.her[g.id].points,b=report.stats.him[g.id].points,max=Math.max(a,b,1);
   return `<div class="score-source score-source-${g.id}"><h4><span aria-hidden="true">${g.icon}</span> ${g.name}</h4><div class="score-source-pair">${[['her',a],['him',b]].map(([p,n])=>`<div><b aria-label="${name(p)}, ${g.name}: ${n} points">${n}<small> pts</small></b><span class="score-bar" aria-hidden="true"><i style="--fill:${n/max*100}%"></i></span></div>`).join('')}</div></div>`;
  }).join('')}</section>`;
  const recap=`<section class="score-recap"><h3>${record?'The week, in a nutshell':'Your week so far'}</h3>${report.edge?`<p class="score-winning-edge">♛ Biggest advantage: <b>${esc(names(report.edge))}</b> gave ${name(report.winner)} ${report.edge[0].margin} more points ${report.edge.length>1?'each ':''}than ${name(report.winner==='her'?'him':'her')}.</p>`:''}${!report.complete?'<p>Some older point details aren’t available. The official final score above is unchanged.</p>':''}<div class="score-highlights">${['her','him'].map(p=>{
   const h=report.highlights[p];return `<article><h4>${name(p)}</h4>${h.sources.length?`<p>Biggest haul<br><b>${esc(names(h.sources))}</b></p><p>Best scoring rate<br><b>${esc(names(h.best))} · ${h.rate}%</b></p>`:'<p>First points still to come.</p>'}</article>`;
  }).join('')}</div><p class="score-footnote">Scoring rate = points earned out of the maximum for finished rounds.</p></section>`;
  const days=`<section class="score-daily"><h3>Every point, accounted for</h3>${report.entries.map(entry=>{
   const a=entry.games.reduce((n,g)=>n+g.people.her.points,0),b=entry.games.reduce((n,g)=>n+g.people.him.points,0);
   return `<details class="score-day" data-score-detail="${esc(entry.day)}"><summary><strong>${entry.tie?'Tie-break '+entry.tie:label(entry.day)}${entry.hard?' <small>2×</small>':''}</strong><span>☀ ${a} <i>·</i> ☾ ${b}</span></summary><div class="score-day-rows">${entry.games.map(row=>`<div><b>${SCORE_GAMES.find(g=>g.id===row.type).name}</b>${['her','him'].map(p=>`<span><strong>${name(p)} · ${row.people[p].points} pts</strong><small>${esc(row.people[p].detail)}</small></span>`).join('')}</div>`).join('')}</div></details>`;
  }).join('')}</section>`;
  host.innerHTML=dateRow+hero+sources+recap+days+`<details class="score-help" data-score-detail="help"><summary>how points work</summary><p>Little Word: 100 / 40 / 30 / 20 / 10 for 1–5 guesses. Miss it: 0.</p><p>Word Search and Mini crossword: words found ÷ total × 50, rounded. Two minutes each. No words: 0. Sunday and tie-breaks double the points. Tie-break points are included above.</p></details>`;
  for(const d of host.querySelectorAll('[data-score-detail]'))d.open=open.includes(d.dataset.scoreDetail);
  if(focus)document.getElementById(focus)?.focus({preventScroll:true});
  const totals=JSON.stringify(report.totals);host.dataset.totals=totals;
  if(previousTotals&&previousTotals!==totals&&!matchMedia('(prefers-reduced-motion: reduce)').matches)host.querySelectorAll('.score-number').forEach(el=>el.animate([{transform:'scale(.93)',opacity:.65},{transform:'scale(1)',opacity:1}],{duration:380,easing:'ease-out'}));
 }
 host.addEventListener('change',event=>{if(event.target.id==='score-week'){selected=event.target.value;history.replaceState(null,'',location.pathname+location.search+'#scoreboard-'+selected);host.dataset.totals='';load();}});
 host.addEventListener('click',event=>{if(event.target.closest('[data-score-retry]'))load();});
 const route=()=>{const week=hashWeek()||(location.hash==='#scoreboard'?current:null);if(week&&week!==selected){selected=week;load();}};
 addEventListener('littlelist:profile',render);addEventListener('online',load);addEventListener('hashchange',route);
 const timer=setInterval(render,30000);load();
 return()=>{disposed=true;revision++;stops.forEach(f=>f());clearTimeout(loadTimer);clearInterval(timer);removeEventListener('littlelist:profile',render);removeEventListener('online',load);removeEventListener('hashchange',route);};
}

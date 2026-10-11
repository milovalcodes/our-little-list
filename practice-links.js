import {PRACTICE_COUNTS,PRACTICE_NAMES} from './practice-catalog.js';
import {practiceStore} from './practice-store.js';
import {HOUSEHOLD_ID} from './household.js';
export function startPracticeLinks(viewer){
 const host=document.getElementById('practice-links');
 if(!host)return;
 const refresh=()=>{
  const store=practiceStore(HOUSEHOLD_ID+':'+viewer);
  host.innerHTML=['normal','hard'].map(level=>`<section><h3>${level==='hard'?'Hard practice':'Normal practice'}</h3>${Object.entries(PRACTICE_COUNTS).map(([type,total])=>`<a class="practice-link" href="practice.html#${type}-${level}"><span><strong>${PRACTICE_NAMES[type]}</strong><small>${store.completed(type,level)} finished</small></span><span class="practice-count">${store.cursor(type,level)-(level==='hard'?total/2:0)+1} / ${total/2} <i aria-hidden="true">›</i></span></a>`).join('')}</section>`).join('');
 };
 refresh();addEventListener('pageshow',refresh);addEventListener('storage',refresh);
}

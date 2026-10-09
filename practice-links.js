import {PRACTICE_COUNTS,PRACTICE_NAMES} from './practice-catalog.js';
import {practiceStore} from './practice-store.js';
import {HOUSEHOLD_ID} from './household.js';
export function startPracticeLinks(viewer){
 const host=document.getElementById('practice-links');
 if(!host)return;
 const refresh=()=>{
  const store=practiceStore(HOUSEHOLD_ID+':'+viewer);
  host.innerHTML=Object.entries(PRACTICE_COUNTS).map(([type,total])=>`<a class="practice-link" href="practice.html#${type}"><span><strong>${PRACTICE_NAMES[type]}</strong><small>${store.completed(type)} finished</small></span><span class="practice-count">${store.cursor(type)+1} / ${total} <i aria-hidden="true">›</i></span></a>`).join('');
 };
 refresh();addEventListener('pageshow',refresh);addEventListener('storage',refresh);
}

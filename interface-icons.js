// App-owned interface marks use one drawing on every OS. Emoji chosen for a
// note, reaction, status or personal content are deliberately outside this map.
// New controls should call uiIcon(name); the scoped adapter supports existing
// textContent renderers. Mark intentional emoji with data-keep-emoji.
export const iconPaths={
 home:'<path d="m4 10 8-7 8 7v11h-6v-7h-4v7H4Z"/>',
 check:'<path d="m5 12 5 5L20 6"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 notes:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
 dice:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" stroke-width="3"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 moon:'<path d="M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z"/>',
 pair:'<circle cx="7" cy="11" r="3"/><path d="M7 4v1m0 12v1M0 11h1m12 0h1M2 6l1 1m8 8 1 1M2 16l1-1m8-8 1-1M23 16a7 7 0 0 1-4-12 7 7 0 1 0 4 12Z"/>',
 crown:'<path d="m3 6 5 5 4-7 4 7 5-5-2 13H5ZM6 22h12"/>',
 search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
 sparkle:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>',
 heart:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1-5 5 2 10 8 15 6-5 13-10 8-15Z"/>',
 settings:'<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
 book:'<path d="M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v16"/>',
 edit:'<path d="m4 16 12-12 4 4L8 20l-5 1ZM14 6l4 4"/>',
 memories:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m3 17 6-5 4 3 4-6 4 6"/>',
 bellOff:'<path d="m3 3 18 18M6 6a6 6 0 0 1 12 2c0 2 .3 4 .8 5M6 10c0 4-3 6-3 6h13M9 21h6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M9 21h6"/>',
 pin:'<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
 clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>',
 cart:'<path d="M2 3h3l3 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/>',
 person:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M8 15q4 4 8 0"/>',
 sad:'<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01M8 17q4-4 8 0"/>',
 refresh:'<path d="M20 8a9 9 0 1 0 1 7M20 2v6h-6"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 arrowUp:'<path d="M12 20V4m-6 6 6-6 6 6"/>',
 arrowLeft:'<path d="M20 12H4m6-6-6 6 6 6"/>',
 arrowOut:'<path d="M5 19 19 5M6 5h13v13"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 flame:'<path d="M12 2c0 6-7 7-7 13a7 7 0 0 0 14 0c0-3-1-5-3-7 0 4-2 5-3 5 1-5 1-7-1-11Z"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
 flag:'<path d="M5 22V3c5-3 9 3 14 0v11c-5 3-9-3-14 0"/>',
 car:'<path d="m4 10 2-6h12l2 6v9H4Zm0 0h16M7 14h1m8 0h1M6 19v3m12-3v3"/>',
 camera:'<path d="M3 6h4l2-3h6l2 3h4v15H3Z"/><circle cx="12" cy="13" r="4"/>',
 laptop:'<path d="M5 3h14v13H5ZM2 16h20v4H2Z"/>',
 swords:'<path d="m3 3 11 11M3 3l1 5 7 7M3 3l5 1 7 7m-4 5 5-5m-2 3 7 7M21 3 10 14m11-11-1 5-7 7m8-12-5 1-7 7m4 5-5-5m2 3-7 7"/>',
 pushpin:'<path d="m8 3 8 0-1 6 4 4H5l4-4Zm4 10v9"/>',
 moonHalf:'<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/>',
 warning:'<path d="m12 3 10 18H2ZM12 9v5m0 3h.01"/>',
 volume:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8q4 4 0 8m3-11q7 7 0 14"/>',
 pause:'<path d="M8 4v16M16 4v16"/>',
 play:'<path d="m6 3 15 9-15 9Z"/>',
 backspace:'<path d="m9 5-7 7 7 7h13V5ZM12 9l6 6m0-6-6 6"/>',
 swap:'<path d="M3 7h18m-5-4 5 4-5 4M21 17H3m5-4-5 4 5 4"/>',
 chevronLeft:'<path d="m15 5-7 7 7 7"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>'
};
export function uiIcon(name,label=''){
 if(!Object.hasOwn(iconPaths,name))throw new Error('Unknown interface icon: '+name);
 const safe=String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return `<svg class="ui-icon" data-ui-icon="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false" ${safe?`role="img" aria-label="${safe}"`:'aria-hidden="true"'}>${iconPaths[name]}</svg>`;
}
export const symbolIcons={
 '◷':'clock','●':'person','◎':'clock','✉️':'notes','📧':'notes','☀︎☾':'pair','☀☾':'pair','☀️☾':'pair','☀':'sun','🌞':'sun','☾':'moon','🌙':'moon',
 '✓':'check','✔':'check','✅':'check','🫡':'check','✗':'close','×':'close','✕':'close',
 '＋':'plus','⋯':'more','•••':'more','⌕':'search','⚄':'dice','▦':'grid','▧':'grid',
 '✉':'notes','💌':'notes','♛':'crown','👑':'crown','★':'star','☆':'star','✦':'sparkle','✧':'sparkle','✨':'sparkle',
 '♡':'heart','♥':'heart','❤':'heart','⚙':'settings','✎':'edit','◒':'memories','🔕':'bellOff','🔔':'bell','📍':'pin','📱':'phone',
 '⏱':'clock','⏰':'clock','🛒':'cart','🙋':'person','☺':'smile','☹':'sad','↻':'refresh','↗':'arrowOut',
 '→':'arrow','←':'arrowLeft','↑':'arrowUp','›':'chevron','🔥':'flame','⚡':'bolt','🚗':'car','📷':'camera',
 '⌂':'home','⌫':'backspace','⇄':'swap','‹':'chevronLeft','🕵':'search','🏠':'home','💻':'laptop','📚':'book','⚔':'swords','📌':'pushpin','◐':'moonHalf','⚠':'warning','🔊':'volume'
};
const tokenPattern=new RegExp(Object.keys(symbolIcons).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
// Only these app-owned slots are adapted. Never walk arbitrary prose, form
// values, note moods, reaction pickers, personal status symbols or saved text.
export const iconSlots=[
 '.feature-icon','.auth-icon','.celestial-loader>span','.celestial-loader>i',
 '.home-wordmark','.mini-brand','.landing-profile-link a','.landing-foot','.landing-copy>.tiny-kicker','.sky-doodle',
 '.topbar-search','.context-add>i','.more-grid i','.update-row>i','.sheet-head>[data-close-sheet]',
 '.search-box>span','.search-start>span','.search-hit>i','.search-hit>span:first-child',
 '#quick-thinking>span','.empty-state>span','.setup-nudge>span','.setup-nudge>button',
 '.daily-stamp','.weekly-entry>summary>span:first-child','#weekly-score','.trio-score','.score-day>summary>span',
 '.score-crown','.score-avatar>span','.score-winning-edge','.word-crown','.coronation-crown','.tie-entry>summary>span:first-child',
 '.game-badges>span','#question-summary','.question-card.is-folded #question-prompt','.daily-state',
 '.settings-jump a','.settings-group-icon','.status-symbol','#health-summary','#ask-install','#save-state',
 '.delete-task','[data-close-memory]','.question-memory span[aria-hidden]','.routine-actions>small','.task-check','.inline-check','.row-more','.home-next-row>span','.home-next-row>i',
 '.date-actions>button','.date-done-toggle','.date-random-icon','.roulette-icon',
 '.home-today-heading>button','.focus-card .today-card-head>span','.focus-ask-dialog>span',
 '.guide-topic>summary>span','.profile-photo-edit','.memory-delete','.memory-random-close','#alter-ego-close','.emoji-picker-close',
 '#trip-toggle','.personal-badges>span','.word-finale-icon','.life-spark',
 '.fridge-paper>i','[data-pin-note]','#note-quick-send','.crossword-current>[data-step]',
 '.word-keyboard button[data-key="⌫"]','.word-keyboard button[data-letter="⌫"]','.word-keyboard button[data-letter="⇄"]',
 '.word-keyboard button[data-ckey="⌫"]','.word-keyboard button[data-ckey="⇄"]',
 '.saved-place-row>button','.memory-crown','.crown-memory small:last-of-type','.incoming-note-close','.incoming-note-link>span',
 '.home-link','.back-to-side','.sky-star','.failure-icon','.failure-close','#pick-random','#date-plan button',
 '.score-source h4>span','.weekly-search-label>span','[data-board-view="current"]','[data-ui-symbols]'
].join(',');
export function startInterfaceIcons(){
 const blocked='svg,script,style,input,textarea,select,[data-keep-emoji]';
 function paint(host){
  if(!host.isConnected||host.closest(blocked))return;
  const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT),texts=[];
  while(walker.nextNode()){
   const node=walker.currentNode;
   if(node.parentElement?.closest(blocked))continue;
   if(host.id==='question-summary'&&node.data!=='both answered ✓')continue;
   if(host.matches('.score-winning-edge')&&(node.parentElement!==host||!node.data.startsWith('♛')))continue;
   texts.push(node);
  }
  for(const node of texts){
   const raw=node.data.replace(/[\uFE0E\uFE0F]/g,'');
   const matches=[...raw.matchAll(tokenPattern)];if(!matches.length)continue;
   const fragment=document.createDocumentFragment();let from=0;
   for(const match of matches){
    fragment.append(raw.slice(from,match.index));
    const name=symbolIcons[match[0]],template=document.createElement('template');
    const label=host.matches('#weekly-score,.trio-score,.score-day>summary>span,.crown-memory small:last-of-type')?({sun:'Sun',moon:'Moon'}[name]||''):'';
    template.innerHTML=uiIcon(name,label);fragment.append(template.content);
    from=match.index+match[0].length;
   }
   fragment.append(raw.slice(from));node.replaceWith(fragment);
  }
 }
 function scan(root){
  if(root.nodeType!==1||root.closest(blocked))return;
  if(root.matches('.reaction-trigger:not(.note-tool)')&&!root.querySelector('.ui-icon'))root.insertAdjacentHTML('afterbegin',uiIcon('smile')+' ');
  root.querySelectorAll('.reaction-trigger:not(.note-tool)').forEach(button=>{if(!button.querySelector('.ui-icon'))button.insertAdjacentHTML('afterbegin',uiIcon('smile')+' ')});
  if(root.matches(iconSlots))paint(root);
  root.querySelectorAll(iconSlots).forEach(paint);
 }
 scan(document.body);
 // Added rows and textContent updates use the same rendering, without scanning
 // the whole app on every clock tick or touching account data.
 new MutationObserver(records=>{
  const hosts=new Set();
  for(const r of records){
   const parent=r.target.nodeType===1?r.target:r.target.parentElement;
   if(!parent||parent.closest(blocked))continue;
   const host=parent.closest(iconSlots);if(host)hosts.add(host);
   for(const node of r.addedNodes)if(node.nodeType===1)scan(node);
  }
  hosts.forEach(paint);
 }).observe(document.body,{subtree:true,childList:true,characterData:true});
}

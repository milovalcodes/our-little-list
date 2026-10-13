import {activityClock} from './activity-clock.js';
import {timedPuzzle,PUZZLE_NAMES,entryCells,selectedSearchWord} from './daily-puzzles.js';
import {millis,timedPoints,timedOver,timedLimit} from './timed-game.js';
import {escapeHtml as esc} from './ui-helpers.js';
import {personName} from './profile-store.js';
import {createWordCelebration} from './word-celebration.js';
import {revisionOf} from './round-revision.js';
const time=ms=>`${Math.floor(Math.max(0,ms)/60000)}:${String(Math.floor(Math.max(0,ms)/1000)%60).padStart(2,'0')}`;
export function startTimedGame(context,{type,day=activityClock().day,host,summary,disclosure}){
 const {data,viewer,other}=context,openedDay=activityClock().day;
 host.classList.add('timed-game');
 let puzzle=null,mine=null,results=[],busy=false,message='',selected=0,draft='',dragStart=null,tapStart=null,peek=null,peekOpen=false,peekBusy=false,peekError='',closed=false,disposed=false,unsubs=[],action=0,flash=-1,flashTimer,expiredRetryAt=0,expiredDrawn=false;
 const celebration=createWordCelebration(host,viewer,day+'-'+type);
 // Immediate visual acknowledgement is separate from saved credit. Queue
 // quick finds serially so slow mobile networks never lock the search grid.
 const pendingSearch=new Set();
 let dragPointer=null;
 let renderedClue=-1;
 let partnerFinished=false;
 let latestMine=null;
 const finished=()=>mine&&(closed||timedOver(mine)||puzzle&&Date.now()>=puzzle.closesAt);
 const partner=()=>results.find(r=>r.person===other&&revisionOf(r)===revisionOf(puzzle));
 function listen(){
  unsubs.forEach(fn=>fn());unsubs=[];
  const fail=()=>{message='Couldn’t sync this puzzle. Check your connection and retry.';render();};
  unsubs.push(data.listenToQuery('timedPuzzles',{where:[{field:'day',value:day},{field:'type',value:type}]},rows=>{
   const next=rows[0]||(data.mode==='local'?timedPuzzle(day,type):null);
   if(puzzle&&next&&revisionOf(next)<revisionOf(puzzle))return;
   if(puzzle&&next&&revisionOf(next)!==revisionOf(puzzle)){
    action++;busy=false;selected=0;draft='';dragStart=null;tapStart=null;peek=null;peekOpen=false;peekBusy=false;expiredDrawn=false;expiredRetryAt=0;pendingSearch.clear();flash=-1;message='Fresh board · ready when you are.';
    mine=latestMine&&revisionOf(latestMine)===revisionOf(next)?latestMine:null;
   }
   puzzle=next;if(mine&&revisionOf(mine)!==revisionOf(puzzle))mine=null;if(!mine&&latestMine&&revisionOf(latestMine)===revisionOf(puzzle))mine=latestMine;render();
  },{onError:fail}));
  unsubs.push(data.listenToQuery('timedGames',{where:[{field:'day',value:day},{field:'type',value:type},{field:'person',value:viewer}]},(rows,meta)=>{
   const next=rows.find(g=>g.person===viewer);
   latestMine=next||null;
   if(next&&puzzle&&revisionOf(next)!==revisionOf(puzzle))return;
   // Server timestamps are null on unconfirmed local snapshots.
   if(next&&(!millis(next.startedAt)||next.done&&!millis(next.finishedAt)))return;
   if(next&&(!mine||next.solved.length>mine.solved.length||next.done&&!mine.done))message='';
   if(!next&&meta?.fromCache===false){mine=null;selected=0;draft='';peek=null;peekOpen=false;expiredDrawn=false;expiredRetryAt=0;pendingSearch.clear();}
   else if(!mine||next&&(next.solved.length>=mine.solved.length)&&(!mine.done||next.done))mine=next||null;
   render();
  },{onError:fail}));
  unsubs.push(data.listenToQuery('timedResults',{where:[{field:'day',value:day},{field:'type',value:type}]},rows=>{results=rows;partnerFinished=timedOver(partner());render();},{onError:fail}));
  if(day.includes('-tie-'))unsubs.push(data.listenTo('wordDuelEnds',ends=>{closed=ends.some(e=>e.id===day);if(closed)render();},{onError:fail}));
 }
 function render(){
  if(disposed)return;
  if(dragStart!==null){if(!finished())return;dragStart=null;tapStart=null;}
  const hadFocus=host.querySelector('[data-answer]')===document.activeElement;
  const previousScroll=host.querySelector('.puzzle-scroll')?.scrollLeft||0;
  const done=finished(),solved=new Set(mine?.solved||[]),available=Boolean(puzzle&&!closed&&Date.now()<puzzle.closesAt);
  host.classList.toggle('timed-playing',Boolean(mine&&!done));
  summary.textContent=closed?'set finished':done?`${timedPoints(mine)} points · ${solved.size} / ${puzzle?.entries.length||mine.total} found`:mine?`${solved.size} / ${puzzle?.entries.length||'…'} found`:puzzle?`${puzzle.hard?'hard · double points · ':''}${puzzle.entries.length} words · ${time(timedLimit(type,puzzle))}`:'getting your puzzle…';
  if(!puzzle){host.innerHTML=`<p role="status">${esc(message||'getting your puzzle…')}</p><button type="button" data-retry>retry</button>`;return;}
  if(!mine){
   host.innerHTML=`<div class="timed-ready"><p class="puzzle-theme">${esc(puzzle.theme)} · ${puzzle.hard?'hard':'normal'}</p><span class="puzzle-doodle" aria-hidden="true">${type==='search'?'a b c':'▦'}</span><p>${type==='search'?'Find as many words as you can.':'Solve the clues and fill the grid.'}</p><small>${time(timedLimit(type,puzzle))} · up to ${puzzle.hard?100:50} points, based on words found. The clock starts when you tap start and keeps going if you leave.</small><button type="button" data-start ${busy||!available||!navigator.onLine?'disabled':''}>${busy?'getting ready…':closed?'set finished':!available?'back at 9 a.m.':'start my round'}</button><p class="timed-feedback" role="status">${esc(message||(!navigator.onLine?'Reconnect to start.':''))}</p></div>`;return;
  }
  const revealed=new Set([...solved].flatMap(index=>entryCells(puzzle,index))),active=new Set(type==='crossword'?entryCells(puzzle,selected):[]);
  const pendingCells=new Set([...pendingSearch].filter(i=>!solved.has(i)).flatMap(i=>entryCells(puzzle,i)));
  const missed=new Set(type==='search'&&done?puzzle.entries.flatMap((_,i)=>solved.has(i)?[]:entryCells(puzzle,i)):[]);
  const numbers=new Map([...new Set(puzzle.entries.map(e=>e.start))].sort((a,b)=>a-b).map((p,i)=>[p,i+1]));
  const cells=[...puzzle.grid].map((letter,index)=>{
   if(letter==='#')return '<span class="puzzle-wall" aria-hidden="true"></span>';
   const known=type==='search'||revealed.has(index)||done;
   return `<button type="button" class="puzzle-cell ${pendingCells.has(index)?'pending-find':''} ${missed.has(index)?'missed-word':''} ${tapStart===index?'tracing':''} ${revealed.has(index)?'found':''} ${active.has(index)?'chosen':''} ${flash>=0&&entryCells(puzzle,flash).includes(index)?'just-found':''}" data-cell="${index}" tabindex="${index===[...puzzle.grid].findIndex(c=>c!=='#')?0:-1}" aria-label="${type==='crossword'&&numbers.has(index)?numbers.get(index)+', ':''}${known?letter:'empty'}, row ${Math.floor(index/puzzle.size)+1}, column ${index%puzzle.size+1}" ${done||(busy&&type!=='search')?'disabled':''}>${type==='crossword'&&numbers.has(index)?`<small>${numbers.get(index)}</small>`:''}<span>${known?letter:''}</span></button>`;
  }).join('');
  const clue=puzzle.entries[selected];
  host.innerHTML=`<p class="puzzle-theme">${esc(puzzle.theme)} · ${puzzle.hard?'hard · 2× points':'normal'}</p><div class="timed-toolbar"><strong data-timer>${done?'finished':time(timedLimit(type,mine||puzzle)-(Date.now()-millis(mine.startedAt)))}</strong><span>${solved.size} / ${puzzle.entries.length}</span></div><div class="puzzle-scroll"><div class="puzzle-grid ${type==='search'?'search-grid':'crossword-grid'}" style="--grid-size:${puzzle.size}" aria-label="${esc(PUZZLE_NAMES[type])} grid">${cells}</div></div>${type==='search'?`<div class="search-words">${puzzle.entries.map((e,i)=>`<span class="${solved.has(i)?'found':done?'missed-word':pendingSearch.has(i)?'pending-find':''}">${e.word}</span>`).join('')}</div><small class="puzzle-hint">${done?'Outlined letters show the words you missed.':'Drag a word, or tap its first letter, then its last.'}</small>`:`${!done?`<form class="crossword-answer"><label for="answer-${day}-${type}">${numbers.get(clue.start)} ${clue.step===1?'across':'down'} · ${esc(clue.clue)} <small>(${clue.word.length})</small></label><div class="crossword-pattern" aria-label="Letters revealed by crossings">${[...clue.word].map((letter,i)=>`<span class="${revealed.has(clue.start+i*clue.step)?'known':''}">${revealed.has(clue.start+i*clue.step)?letter:'·'}</span>`).join('')}</div><div><input id="answer-${day}-${type}" data-answer maxlength="${clue.word.length}" value="${esc(draft)}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Answer to selected clue" ${busy||solved.has(selected)?'disabled':''}><button type="submit" ${busy||solved.has(selected)?'disabled':''}>${busy?'saving…':'check'}</button></div></form>`:''}<div class="crossword-clues">${puzzle.entries.map((e,i)=>`<button type="button" data-clue="${i}" aria-pressed="${i===selected}" class="${solved.has(i)?'found':''}"><b>${numbers.get(e.start)}${e.step===1?'→':'↓'}</b> ${esc(e.clue)} <small>(${e.word.length})${solved.has(i)?' ✓':''}</small></button>`).join('')}</div>`}<p class="timed-feedback" role="status">${esc(message||(mine.done?(mine.solved.length?`${timedPoints(mine)} points · nicely done ♡`:'you did your best :c'):done?`time’s up · ${timedPoints(mine)} points`:pendingSearch.size?'saving selections…':busy?'saving…':''))}</p>${message?'<button type="button" data-retry>retry sync</button>':''}${done?peekMarkup():''}`;
  const pane=host.querySelector('.puzzle-scroll');
  if(pane&&type==='crossword'){
   const cell=host.querySelector(`[data-cell="${clue.start}"]`);
   pane.scrollLeft=renderedClue!==selected&&cell?cell.getBoundingClientRect().left-pane.getBoundingClientRect().left-pane.clientWidth/2:previousScroll;renderedClue=selected;
  }
  if(hadFocus&&!busy)host.querySelector('[data-answer]')?.focus({preventScroll:true});
 }
 function peekMarkup(){
  if(!timedOver(partner()))return '<p class="word-partner">waiting for '+esc(personName(other))+' · their process stays private</p>';
  return `<div class="word-peek"><button type="button" data-peek aria-expanded="${peekOpen}">${peekBusy?'getting their round…':peekOpen?'close their process':'peek their process'}</button>${peekOpen?`<div class="timed-peek" role="status">${peekError?esc(peekError):peek?`<h3>${esc(personName(other))}’s route</h3><ol>${peek.solved.map((i,n)=>`<li><b>${puzzle.entries[i]?.word||''}</b><span>${time(peek.foundAt[n])}</span></li>`).join('')}</ol>${!peek.solved.length?'<p>no words found this round</p>':''}`:'one second…'}</div>`:''}</div>`;
 }
 async function loadPeek(){
  if(!finished()||!timedOver(partner())||peekBusy)return;
  peekOpen=!peekOpen;if(!peekOpen||peek){render();return;}
  peekBusy=true;peekError='';render();let timeout;const revision=revisionOf(puzzle);
  try{const result=await Promise.race([data.readDoc('timedGames',`${day}-${type}-${other}`),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('timeout')),12000);})]);if(disposed||revision!==revisionOf(puzzle))return;if(!result||revisionOf(result)!==revision||result.person!==other||result.day!==day||result.type!==type||!Array.isArray(result.solved))throw Error('missing');peek=result;}
  catch(_){if(revision===revisionOf(puzzle))peekError='Couldn’t get their round. Close this and try again.';}
  finally{clearTimeout(timeout);if(!disposed&&revision===revisionOf(puzzle)){peekBusy=false;render();}}
 }
 async function play(options){
  if(busy||disposed||closed)return;
  if(!navigator.onLine){pendingSearch.clear();message='Reconnect to save. The clock keeps going.';render();return;}
  const resumeAnswer=type==='crossword'&&Boolean(document.activeElement?.closest('.crossword-answer'));
  busy=true;message='';const current=++action;render();let timer;
  try{
   const next=await Promise.race([data.playTimedPuzzle({day,type,person:viewer,expectedCount:mine?.solved.length||0,expectedRevision:revisionOf(puzzle),...options}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Still waiting for confirmation. Retry sync before continuing.')),15000);})]);
   if(disposed||current!==action||!next||revisionOf(next)!==revisionOf(puzzle))return;
   if(!mine||next.solved.length>=mine.solved.length)mine=next;
   if(Number.isInteger(options.index)){flash=options.index;clearTimeout(flashTimer);flashTimer=setTimeout(()=>{host.querySelectorAll('.just-found').forEach(c=>c.classList.remove('just-found'));flash=-1;},700);}
   if(type==='crossword'&&!next.done){selected=puzzle.entries.findIndex((_,i)=>!next.solved.includes(i));draft='';}
   if(next.done)celebration.play({done:true,won:next.complete,guesses:Array(3),revision:revisionOf(next)},next.solved.length?{tier:next.complete?'brilliant':'win',icon:'✦',text:`${timedPoints(next)} points · ${next.complete?'all found!':'nicely done ♡'}`,pieces:next.complete?24:0,duration:2600}:undefined);
  }catch(error){if(!disposed&&current===action){pendingSearch.clear();message=error.message||'Couldn’t save. Check your connection and retry.';expiredRetryAt=Date.now()+15000;}}
  finally{clearTimeout(timer);if(!disposed&&current===action){pendingSearch.delete(options.index);busy=false;if(finished())pendingSearch.clear();render();if(resumeAnswer&&!finished())host.querySelector('[data-answer]')?.focus({preventScroll:true});drainSearch();}}
 }
 function drainSearch(){
  if(busy||disposed||closed||finished()||!pendingSearch.size)return;
  for(const i of [...pendingSearch])if(mine?.solved.includes(i))pendingSearch.delete(i);
  const index=pendingSearch.values().next().value;
  if(index!==undefined)void play({index,answer:puzzle.entries[index].word});
 }
 function chooseCell(index){
  if(type!=='crossword'||busy||finished())return;
  const choices=puzzle.entries.map((_,i)=>i).filter(i=>entryCells(puzzle,i).includes(index));
  if(!choices.length)return;selected=choices.find(i=>i!==selected&&!mine.solved.includes(i))??choices[0];draft='';render();host.querySelector('[data-answer]')?.focus({preventScroll:true});
 }
 function search(start,end){
  if(finished()||!mine)return;
  const pick=selectedSearchWord(puzzle,start,end);tapStart=null;
  if(!pick){message='not one of these words · try another line';render();return;}
  if(mine.solved.includes(pick.index)||pendingSearch.has(pick.index)){message='already got that one';render();return;}
  if(!navigator.onLine){message='Reconnect to save. The clock keeps going.';render();return;}
  pendingSearch.add(pick.index);message='';render();drainSearch();
 }
 function cellAt(event){const node=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-cell]');return node&&host.contains(node)?Number(node.dataset.cell):null;}
 const down=event=>{if(type!=='search'||finished()||dragStart!==null||event.isPrimary===false||event.button>0||!event.target.closest('[data-cell]'))return;event.preventDefault();dragPointer=event.pointerId;dragStart=tapStart??Number(event.target.closest('[data-cell]').dataset.cell);host.querySelector(`[data-cell="${dragStart}"]`)?.classList.add('tracing');host.querySelector('.puzzle-grid').setPointerCapture?.(event.pointerId);};
 const move=event=>{if(dragStart==null)return;const end=cellAt(event);if(end==null)return;host.querySelectorAll('.tracing').forEach(c=>c.classList.remove('tracing'));const r=dragStart/puzzle.size|0,c=dragStart%puzzle.size,dr=(end/puzzle.size|0)-r,dc=end%puzzle.size-c;if(dr&&dc&&Math.abs(dr)!==Math.abs(dc))return;for(let i=0;i<=Math.max(Math.abs(dr),Math.abs(dc));i++)host.querySelector(`[data-cell="${dragStart+i*(Math.sign(dr)*puzzle.size+Math.sign(dc))}"]`)?.classList.add('tracing');};
 const up=event=>{if(dragStart==null||event.pointerId!==dragPointer)return;const end=cellAt(event),start=dragStart;dragStart=null;dragPointer=null;const grid=host.querySelector('.puzzle-grid');if(grid?.hasPointerCapture?.(event.pointerId))grid.releasePointerCapture(event.pointerId);if(end==null){cancel();return;}if(start===end){tapStart=tapStart===start?null:start;render();}else search(start,end);};
 const click=event=>{if(event.target.closest('[data-start]'))void play({start:true});if(event.target.closest('[data-retry]')){message='';listen();render();}if(event.target.closest('[data-peek]'))void loadPeek();const clue=event.target.closest('[data-clue]');if(clue){selected=Number(clue.dataset.clue);draft='';render();host.querySelector('[data-answer]')?.focus({preventScroll:true});}const cell=event.target.closest('[data-cell]');if(cell&&type==='crossword')chooseCell(Number(cell.dataset.cell));};
 const input=event=>{if(event.target.matches('[data-answer]'))draft=event.target.value.toUpperCase().replace(/[^A-Z]/g,'');};
 const submit=event=>{if(!event.target.matches('.crossword-answer'))return;event.preventDefault();if(busy||finished())return;if(draft!==puzzle.entries[selected].word){message='not quite · try that clue again';host.querySelector('.timed-feedback').textContent=message;const box=host.querySelector('[data-answer]');box.classList.remove('wrong-answer');void box.offsetWidth;box.classList.add('wrong-answer');return;}void play({index:selected,answer:draft});};
 const key=event=>{const button=event.target.closest('[data-cell]');if(!button)return;const p=Number(button.dataset.cell),offset={ArrowRight:1,ArrowLeft:-1,ArrowDown:puzzle.size,ArrowUp:-puzzle.size}[event.key];if(offset){event.preventDefault();let next=p+offset;while(next>=0&&next<puzzle.grid.length&&puzzle.grid[next]==='#')next+=offset;host.querySelector(`[data-cell="${next}"]`)?.focus();}if(type==='search'&&['Enter',' '].includes(event.key)){event.preventDefault();if(tapStart==null){tapStart=p;button.classList.add('tracing');}else search(tapStart,p);}};
 const cancel=()=>{dragStart=null;dragPointer=null;tapStart=null;host.querySelectorAll('.tracing').forEach(c=>c.classList.remove('tracing'));render();};
 host.addEventListener('click',click);host.addEventListener('input',input);host.addEventListener('submit',submit);host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancel);host.addEventListener('keydown',key);
 const tick=()=>{if(disposed)return;if(partnerFinished!==timedOver(partner())){partnerFinished=timedOver(partner());render();}if(!mine||mine.done||closed||!puzzle)return;const remaining=Math.min(timedLimit(type,mine||puzzle)-(Date.now()-millis(mine.startedAt)),puzzle.closesAt-Date.now());const timer=host.querySelector('[data-timer]');if(timer){timer.textContent=time(remaining);timer.classList.toggle('time-low',remaining<15000);}if(remaining<=0){if(!expiredDrawn){expiredDrawn=true;cancel();}if(!busy&&navigator.onLine&&Date.now()>=expiredRetryAt)void play({index:null});}};
 const interval=setInterval(tick,300);
 const resume=()=>{if(activityClock().day!==openedDay){location.reload();return;}if(!document.hidden){listen();tick();}};
 addEventListener('online',resume);addEventListener('offline',render);document.addEventListener('visibilitychange',resume);listen();
 return ()=>{disposed=true;action++;unsubs.forEach(fn=>fn());clearInterval(interval);clearTimeout(flashTimer);celebration.dispose();removeEventListener('online',resume);removeEventListener('offline',render);document.removeEventListener('visibilitychange',resume);for(const [name,handler]of Object.entries({click,input,submit,pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,keydown:key}))host.removeEventListener(name,handler);};
}

import {crosswordFocus,revealFocusedLetter,themeCaption,rememberClueScroll,crosswordWindow} from './crossword-view.js';
import {createCrosswordViewport} from './crossword-viewport.js';
import {createGameTyping,bringGameIntoView} from './game-typing.js';
import {gameFeedback} from './game-comfort.js';
import {countdownMarkup,DAILY_GAMES} from './daily-habit.js';
// Display names live with the daily games; the generator's own names feed the Worker fingerprint.
const PUZZLE_NAMES=Object.fromEntries(DAILY_GAMES.map(game=>[game.type,game.name]));
import {activityClock} from './activity-clock.js';
import {timedPuzzle,entryCells,selectedSearchWord,isHardDay} from './daily-puzzles.js';
import {millis,timedPoints,timedOver,timedLimit,timedStartLimit,timedMax,timeBonus,TIME_BONUS_MAX,timedSummary} from './timed-game.js';
import {newScoring} from './word-scores.js';
import {timedStats,timedTaken,timedShare,clock} from './daily-results.js';
import {shareResult} from './share-result.js';
import {escapeHtml as esc} from './ui-helpers.js';
import {personName} from './profile-store.js';
import {createWordCelebration} from './word-celebration.js';
import {revisionOf} from './round-revision.js';
import {competingRound,roundWaitMessage} from './timed-round-guard.js';
import {createSharedRound,comparisonReady} from './shared-round.js';
import {isAcross,clueOrder,clueNumbers,cleanLetters,firstCursor,activeEntry,selectCell,selectClue,toggleDirection,nextClue,typeLetter,eraseLetter,moveCursor,correctEntries,lockedCells,filledCount} from './crossword-entry.js';
const time=ms=>`${Math.floor(Math.max(0,ms)/60000)}:${String(Math.floor(Math.max(0,ms)/1000)%60).padStart(2,'0')}`;
// "52 points" or "60 points · +10 time bonus".
const pointsText=game=>`${timedPoints(game)} points${timeBonus(game)?` · +${timeBonus(game)*(isHardDay(game.day)?2:1)} time bonus`:''}`;
export function startTimedGame(context,{type,day=activityClock().day,host,summary,disclosure}){
 const {data,viewer,other}=context,openedDay=activityClock().day;
 host.classList.add('timed-game');
 let puzzle=null,mine=null,results=[],busy=false,message='',dragStart=null,tapStart=null,partnerRound=null,routeBusy=false,routeError='',routeRequest=0,closed=false,disposed=false,unsubs=[],action=0,flash=-1,flashTimer,expiredRetryAt=0,expiredDrawn=false;
 const celebration=createWordCelebration(host,viewer,day+'-'+type);
 const together=createSharedRound({data,viewer,other,day,type,host,onChange:render});
 // Immediate visual acknowledgement is separate from saved credit. Queue
 // quick finds serially so slow mobile networks never lock the search grid.
 const pendingSearch=new Set();
 let dragPointer=null;
 // Crossword squares live on this device until the round ends.
 let letters=[],lettersKey='',cursor=null,focusGrid=false;
 let history=[],shareNote='';
 let partnerFinished=false;
 let ownRounds=[],dayPuzzles=[];
 const conflict=()=>!mine&&competingRound(ownRounds,{day,type,person:viewer},dayPuzzles);
 let latestMine=null;
 const finished=()=>mine&&(closed||timedOver(mine)||puzzle&&Date.now()>=puzzle.closesAt);
 const partner=()=>results.find(r=>r.person===other&&revisionOf(r)===revisionOf(puzzle));
 const typing=type==='crossword'?createGameTyping(host,{label:'Crossword',enterLabel:'Next clue',onKey:k=>{if(!mine||!puzzle||finished())return;if(k==='⌫')edit(eraseLetter(puzzle,letters,cursor));else if(k==='↵')moveTo(nextClue(puzzle,letters,cursor));else edit(typeLetter(puzzle,letters,cursor,k.toUpperCase()));}}):null,view=typing?.view||host;
 const board=type==='crossword'?createCrosswordViewport({keepTyping:()=>typing.focus()}):null;
 let revealBoard=false;
 function listen(){
  unsubs.forEach(fn=>fn());unsubs=[];
  const fail=()=>{message='Couldn’t sync this puzzle. Check your connection and retry.';render();};
  unsubs.push(data.listenToQuery('timedGames',{where:[{field:'day',value:day},{field:'person',value:viewer}]},rows=>{ownRounds=rows;render();},{onError:fail}));
  unsubs.push(data.listenToQuery('timedPuzzles',{where:{field:'day',value:day}},rows=>{dayPuzzles=rows;render();},{onError:fail}));
  unsubs.push(data.listenToQuery('timedPuzzles',{where:[{field:'day',value:day},{field:'type',value:type}]},rows=>{
   const next=rows[0]||(data.mode==='local'?timedPuzzle(day,type):null);
   if(puzzle&&next&&revisionOf(next)<revisionOf(puzzle))return;
   if(puzzle&&next&&revisionOf(next)!==revisionOf(puzzle)){
    action++;busy=false;dragStart=null;tapStart=null;partnerRound=null;routeBusy=false;routeError='';routeRequest++;expiredDrawn=false;expiredRetryAt=0;pendingSearch.clear();flash=-1;message='Fresh board · ready when you are.';
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
   if(!next&&meta?.fromCache===false){mine=null;partnerRound=null;routeBusy=false;routeError='';routeRequest++;expiredDrawn=false;expiredRetryAt=0;pendingSearch.clear();}
   else if(!mine||next&&(next.solved.length>=mine.solved.length)&&(!mine.done||next.done))mine=next||null;
   render();
  },{onError:fail}));
  unsubs.push(data.listenToQuery('timedResults',{where:[{field:'day',value:day},{field:'type',value:type}]},rows=>{results=rows;partnerFinished=timedOver(partner());render();},{onError:fail}));
  // Your own finished boards feed the clear streak and best time.
  if(!day.includes('-tie-'))unsubs.push(data.listenToQuery('timedResults',{where:[{field:'person',value:viewer},{field:'type',value:type}]},rows=>{history=rows.filter(r=>r.person===viewer&&r.type===type);render();},{onError:()=>{}}));
  if(day.includes('-tie-'))unsubs.push(data.listenTo('wordDuelEnds',ends=>{closed=ends.some(e=>e.id===day);if(closed)render();},{onError:fail}));
 }
 function ensureLetters(){
  const key='our-little-list:crossword:'+day+':'+viewer+':'+revisionOf(puzzle);
  if(key===lettersKey){restoreSolved();return;}
  let raw=null;try{raw=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}
  lettersKey=key;letters=cleanLetters(puzzle,raw);restoreSolved();cursor=firstCursor(puzzle,letters);
 }
 function restoreSolved(){
  for(const i of mine?.solved||[])for(const c of entryCells(puzzle,i))letters[c]=puzzle.grid[c];
 }
 function saveLetters(){try{localStorage.setItem(lettersKey,JSON.stringify(letters));}catch(_){}}
 // Correct words turn green and lock immediately; saved credit still comes from the server.
 function creditWords(){
  if(type!=='crossword'||!mine||finished())return;
  for(const i of correctEntries(puzzle,letters))if(!mine.solved.includes(i))pendingSearch.add(i);
  drainSearch();
 }
 function edit(next){gameFeedback('key');letters=next.letters;cursor=next.cursor;revealBoard=true;saveLetters();creditWords();render();}
 function moveTo(next){cursor=next;revealBoard=true;render();}
 function render(){
  if(disposed)return;
  together.update({mine,partner:partner(),puzzle});
  if(comparisonReady(type,mine,partner(),puzzle)&&!partnerRound&&!routeBusy&&!routeError)void loadPartnerRound();
  if(dragStart!==null){if(!finished())return;dragStart=null;tapStart=null;}
  const done=finished(),solved=new Set(mine?.solved||[]),available=Boolean(puzzle&&!closed&&Date.now()<puzzle.closesAt);
  if(!puzzle||!mine||done)board?.finish();
  host.classList.toggle('timed-playing',Boolean(mine&&!done));
  typing?.update(Boolean(mine&&!done),!navigator.onLine);
  summary.textContent=closed?'set finished':done?`${pointsText(mine)} · ${solved.size} / ${puzzle?.entries.length||mine.total} found`:mine?`${solved.size} / ${puzzle?.entries.length||'…'} found`:puzzle?`${puzzle.hard?'hard · double points · ':''}${puzzle.entries.length} words · ${time(timedStartLimit(type,puzzle))}`:'getting your puzzle…';
  if(!puzzle){view.innerHTML=`<p role="status">${esc(message||'getting your puzzle…')}</p><button type="button" data-retry>retry</button>`;return;}
  if(!mine){
   view.innerHTML=`<div class="timed-ready"><p class="puzzle-theme">${esc(puzzle.theme)} · ${puzzle.hard?'hard':'normal'}</p>${type==='crossword'?themeCaption(puzzle):''}<span class="puzzle-doodle" aria-hidden="true">${type==='search'?'a b c':'▦'}</span><p>${type==='search'?'Find as many words as you can.':'Fill the grid square by square. Correct words turn green and lock in as you go.'}</p><small>${time(timedStartLimit(type,puzzle))} · up to ${timedMax(day)} points, based on words found${newScoring(day)?`, plus up to ${TIME_BONUS_MAX*(puzzle.hard?2:1)} for time left when you find them all`:''}. The clock starts when you tap start and keeps going if you leave.</small><button type="button" data-start ${busy||!available||!navigator.onLine||conflict()?'disabled':''}>${busy?'getting ready…':closed?'set finished':!available?'back at 9 a.m.':conflict()?esc(roundWaitMessage(conflict())):'start my round'}</button>${conflict()?`<button type="button" data-continue-round="${conflict().type}">continue my round →</button>`:''}<p class="timed-feedback" role="status">${esc(message||(!navigator.onLine?'Reconnect to start.':''))}</p></div>`;return;
  }
  if(type==='crossword'){ensureLetters();renderCrossword(done,solved);return;}
  const revealed=new Set([...solved].flatMap(index=>entryCells(puzzle,index))),active=new Set();
  const pendingCells=new Set([...pendingSearch].filter(i=>!solved.has(i)).flatMap(i=>entryCells(puzzle,i)));
  const missed=new Set(type==='search'&&done?puzzle.entries.flatMap((_,i)=>solved.has(i)?[]:entryCells(puzzle,i)):[]);
  const numbers=new Map([...new Set(puzzle.entries.map(e=>e.start))].sort((a,b)=>a-b).map((p,i)=>[p,i+1]));
  const cells=[...puzzle.grid].map((letter,index)=>{
   if(letter==='#')return '<span class="puzzle-wall" aria-hidden="true"></span>';
   const known=type==='search'||revealed.has(index)||done;
   return `<button type="button" class="puzzle-cell ${pendingCells.has(index)?'pending-find':''} ${missed.has(index)?'missed-word':''} ${tapStart===index?'tracing':''} ${revealed.has(index)?'found':''} ${active.has(index)?'chosen':''} ${flash>=0&&entryCells(puzzle,flash).includes(index)?'just-found':''}" data-cell="${index}" tabindex="${index===[...puzzle.grid].findIndex(c=>c!=='#')?0:-1}" aria-label="${type==='crossword'&&numbers.has(index)?numbers.get(index)+', ':''}${known?letter:'empty'}, row ${Math.floor(index/puzzle.size)+1}, column ${index%puzzle.size+1}" ${done||(busy&&type!=='search')?'disabled':''}>${type==='crossword'&&numbers.has(index)?`<small>${numbers.get(index)}</small>`:''}<span>${known?letter:''}</span></button>`;
  }).join('');
  view.innerHTML=`<p class="puzzle-theme">${esc(puzzle.theme)} · ${puzzle.hard?'hard · 2× points':'normal'}</p><div class="timed-toolbar"><strong data-timer>${done?'finished':time(timedLimit(type,mine||puzzle)-(Date.now()-millis(mine.startedAt)))}</strong><span>${solved.size} / ${puzzle.entries.length}</span></div>${type==='search'?`<div class="search-words">${puzzle.entries.map((e,i)=>`<span class="${solved.has(i)?'found':done?'missed-word':pendingSearch.has(i)?'pending-find':''}">${e.word}</span>`).join('')}</div>`:''}<div class="puzzle-scroll"><div class="puzzle-grid ${type==='search'?'search-grid':'crossword-grid'}" style="--grid-size:${puzzle.size}" aria-label="${esc(PUZZLE_NAMES[type])} grid">${cells}</div></div>${type==='search'?`<small class="puzzle-hint">${done?'Outlined letters show the words you missed.':'Drag a word, or tap its first letter, then its last.'}</small>`:''}<p class="timed-feedback" role="status">${esc(message||(mine.done?(mine.solved.length?`${pointsText(mine)} · nicely done ♡`:'you did your best :c'):done?`time’s up · ${timedPoints(mine)} points`:pendingSearch.size?'saving selections…':busy?'saving…':''))}</p>${message?'<button type="button" data-retry>retry sync</button>':''}${done?resultsMarkup():''}`;
  together.mounted();

 }
 function renderCrossword(done,solved){
  const restoreClue=rememberClueScroll(host);
  const hadFocus=Boolean(document.activeElement?.closest?.('.crossword-grid,.crossword-keys,.crossword-current,.crossword-focus'))&&host.contains(document.activeElement);
  const numbers=clueNumbers(puzzle),index=activeEntry(puzzle,cursor),clue=puzzle.entries[index];
  const locked=lockedCells(puzzle,letters),liveSolved=new Set([...solved,...correctEntries(puzzle,letters)]);
  const active=new Set(done?[]:entryCells(puzzle,index)),white=[...puzzle.grid].filter(c=>c!=='#').length;
  const wrong=new Set(done?[...puzzle.grid].flatMap((c,i)=>c!=='#'&&letters[i]!==c?[i]:[]):[]);
  const frame=crosswordWindow(puzzle),cells=frame.cells.map(i=>{const letter=puzzle.grid[i];
   if(letter==='#')return '<span class="puzzle-wall" aria-hidden="true"></span>';
   const shown=done?letter:letters[i],here=!done&&i===cursor.cell;
   return `<button type="button" class="puzzle-cell ${active.has(i)?'chosen':''} ${here?'cursor':''} ${wrong.has(i)?'missed-word':''} ${locked.has(i)?'found':''}" data-cell="${i}" tabindex="${here||done&&i===puzzle.grid.indexOf(letter)?0:-1}" aria-label="${numbers.has(i)?numbers.get(i)+', ':''}${shown||'empty'}${locked.has(i)?', locked':''}, row ${Math.floor(i/puzzle.size)+1}, column ${i%puzzle.size+1}" ${done?'disabled':''}>${numbers.has(i)?`<small>${numbers.get(i)}</small>`:''}<span>${shown||''}</span></button>`;
  }).join('');
  const clues=across=>clueOrder(puzzle).filter(i=>isAcross(puzzle.entries[i])===across).map(i=>{const e=puzzle.entries[i];return `<button type="button" data-clue="${i}" aria-pressed="${!done&&i===index}" class="${liveSolved.has(i)?'found':done?'missed-word':''}" ${done?'disabled':''}><b>${numbers.get(e.start)}</b> ${esc(e.clue)} <small>(${e.word.length})${e.word===puzzle.anchor?' · theme clue':''}${done?' · '+e.word+(solved.has(i)?' ✓':''):''}</small></button>`;}).join('');
  const keys=['QWERTYUIOP','ASDFGHJKL','⇄ZXCVBNM⌫'].map(row=>`<div>${[...row].map(k=>`<button type="button" data-ckey="${k}" class="${k==='⇄'||k==='⌫'?'wide-key':''}" aria-label="${k==='⌫'?'delete':k==='⇄'?'switch across or down':k}">${k}</button>`).join('')}</div>`).join('');
  const status=message||(done?(mine.complete?`${pointsText(mine)} · solved it ♡`:`time’s up · ${timedPoints(mine)} points · dashed squares were wrong`):'');
  board.render(view,`<p class="puzzle-theme">${esc(puzzle.theme)} · ${puzzle.hard?'hard · 2× points':'normal'}</p><div class="timed-toolbar"><strong data-timer>${done?'finished':time(timedLimit(type,mine||puzzle)-(Date.now()-millis(mine.startedAt)))}</strong><span>${done?`${solved.size} / ${puzzle.entries.length} words`:`${filledCount(puzzle,letters)} / ${white} squares`}</span></div>${done?'':`<div class="crossword-current"><button type="button" data-clue-step="-1" aria-label="Previous clue">‹</button><button type="button" data-flip title="Switch across or down"><b>${numbers.get(clue.start)} ${isAcross(clue)?'across':'down'}</b> ${esc(clue.clue)} <small>(${clue.word.length})${clue.word===puzzle.anchor?" · theme clue":""}</small></button><button type="button" data-clue-step="1" aria-label="Next clue">›</button></div>`}${done?'':crosswordFocus(puzzle,index,letters,cursor,'data-focus-cell')}<div class="puzzle-scroll"><div class="puzzle-grid crossword-grid" style="--grid-size:${frame.columns}" role="group" aria-label="${esc(PUZZLE_NAMES[type])} grid">${cells}</div></div>${done?'':`<div class="word-keyboard crossword-keys" aria-label="Crossword keyboard">${keys}</div><small class="puzzle-hint">Tap a square twice, or ⇄, to switch between across and down. Correct words turn green and lock, including their crossing letters.</small>`}<div class="crossword-clues"><h3>Across</h3>${clues(true)}<h3>Down</h3>${clues(false)}</div><p class="timed-feedback" role="status">${esc(status)}</p>${message?'<button type="button" data-retry>retry sync</button>':''}${done?resultsMarkup():''}`,{puzzleKey:lettersKey+":"+puzzle.grid,currentCell:cursor.cell,revealCurrent:revealBoard});
  together.mounted();
  const mark=host.querySelector('.puzzle-cell.cursor');revealBoard=false;
  revealFocusedLetter(host);restoreClue();
  // Starting the round hands the keyboard straight to the grid.
  if(focusGrid&&!done&&!view.closest('dialog[open]'))bringGameIntoView(()=>view.querySelector('.timed-toolbar'));
  if((focusGrid||hadFocus&&!host.contains(document.activeElement))&&!done){if(typing.active)typing.focus();else mark?.focus({preventScroll:true});focusGrid=false;}
 }
 // Side by side once your round is over; the partner column fills in when theirs is.
 function resultsMarkup(){
  const theirs=partner(),side=(label,r)=>{
   const over=timedOver(r),taken=timedTaken(r);
   return `<div class="result-side"><b>${label}</b><span class="${over?'':'waiting'}">${over?(r.count??r.solved?.length??0)+' / '+r.total:r?'still playing':'not played yet'}</span><small>${over?(taken!==null?clock(taken):'time ran out')+' · '+timedPoints(r)+' points':''}</small></div>`;
  };
  let stats='';
  if(!day.includes('-tie-')){
   const s=timedStats([...history.filter(r=>r.day!==day),timedSummary(mine)],type,day);
   stats=`<dl class="result-stats"><div><dt>played</dt><dd>${s.played}</dd></div><div><dt>cleared</dt><dd>${s.cleared}</dd></div><div><dt>streak</dt><dd>${s.current}</dd></div><div><dt>best time</dt><dd>${s.bestTime===null?'–':clock(s.bestTime)}</dd></div></dl>`;
  }
  return `<section class="daily-results" aria-label="Today’s results"><div class="result-compare">${side('You',mine)}${side(esc(personName(other)),theirs)}</div>${together.markup()}${routesMarkup()}${stats}${countdownMarkup()}<a class="practice-rematch" href="practice.html#${type}">A little more practice →</a><button type="button" data-share>share my result</button><small class="share-note" role="status">${esc(shareNote)}</small></section>`;
 }
 function routesMarkup(){
  if(!comparisonReady(type,mine,partner(),puzzle))return '<p class="word-partner">waiting for '+esc(personName(other))+' · their process stays private</p>';
  const route=(game,label)=>`<section class="timed-route"><h3>${esc(label)} · words found</h3><ol>${game.solved.map((i,n)=>`<li><b>${esc(puzzle.entries[i]?.word||'')}</b><span>${time(game.foundAt[n])}</span></li>`).join('')}</ol>${!game.solved.length?'<p>no words found this round</p>':''}</section>`;
  return `<div class="timed-routes">${route(mine,'You')}${partnerRound?route(partnerRound,personName(other)):`<p role="status">${routeError?esc(routeError)+' <button type="button" data-route-retry>retry their round</button>':'Opening their round…'}</p>`}</div>`;
 }
 async function loadPartnerRound(){
  if(disposed||!comparisonReady(type,mine,partner(),puzzle)||routeBusy||partnerRound)return;
  routeBusy=true;routeError='';let timeout;const revision=revisionOf(puzzle),request=++routeRequest;
  try{
   const result=await Promise.race([data.readDoc('timedGames',`${day}-${type}-${other}`),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('timeout')),12000);})]);
   if(disposed||request!==routeRequest||revision!==revisionOf(puzzle))return;
   if(!result||!timedOver(result)||revisionOf(result)!==revision||result.person!==other||result.day!==day||result.type!==type||!Array.isArray(result.solved)||!Array.isArray(result.foundAt)||result.solved.length!==result.foundAt.length||result.solved.some(i=>!Number.isInteger(i)||!puzzle.entries[i])||result.foundAt.some(t=>!Number.isFinite(t)||t<0))throw Error('missing');
   partnerRound=result;
  }catch(_){if(!disposed&&request===routeRequest)routeError='Couldn’t get their round. Try again.';}
  finally{clearTimeout(timeout);if(!disposed&&request===routeRequest){routeBusy=false;render();}}
 }
 async function play(options){
  if(busy||disposed||closed)return;
  if(options.start&&conflict()){message=roundWaitMessage(conflict());render();return;}
  if(!navigator.onLine){pendingSearch.clear();message='Reconnect to save. The clock keeps going.';render();return;}
  busy=true;message='';const current=++action;render();let timer;
  try{
   const next=await Promise.race([data.playTimedPuzzle({day,type,person:viewer,expectedCount:mine?.solved.length||0,expectedRevision:revisionOf(puzzle),...options}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Still waiting for confirmation. Retry sync before continuing.')),15000);})]);
   if(disposed||current!==action||!next||revisionOf(next)!==revisionOf(puzzle))return;
   if(!mine||next.solved.length>=mine.solved.length)mine=next;
   if(type==='search'&&Number.isInteger(options.index)){flash=options.index;clearTimeout(flashTimer);flashTimer=setTimeout(()=>{host.querySelectorAll('.just-found').forEach(c=>c.classList.remove('just-found'));flash=-1;},700);}
   if(next.done&&next.complete)gameFeedback('solve');
   else if(type==='search'&&Number.isInteger(options.index))gameFeedback('found');
   if(next.done)celebration.play({done:true,won:next.complete,guesses:Array(3),revision:revisionOf(next)},next.solved.length?{tier:next.complete?'brilliant':'win',icon:'✦',text:`${pointsText(next)} · ${next.complete?'all found!':'nicely done ♡'}`,pieces:next.complete?24:0,duration:2600}:undefined);
  }catch(error){if(!disposed&&current===action){pendingSearch.clear();message=error.message||'Couldn’t save. Check your connection and retry.';expiredRetryAt=Date.now()+15000;}}
  finally{clearTimeout(timer);if(!disposed&&current===action){pendingSearch.delete(options.index);busy=false;if(finished())pendingSearch.clear();render();drainSearch();}}
 }
 function drainSearch(){
  if(busy||disposed||closed||finished()||!pendingSearch.size)return;
  for(const i of [...pendingSearch])if(mine?.solved.includes(i))pendingSearch.delete(i);
  const index=pendingSearch.values().next().value;
  if(index!==undefined)void play({index,answer:puzzle.entries[index].word});
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
 const down=event=>{if(type!=='search'||finished()||dragStart!==null||event.isPrimary===false||event.button>0||!event.target.closest('[data-cell],[data-focus-cell]'))return;event.preventDefault();dragPointer=event.pointerId;dragStart=tapStart??Number(event.target.closest('[data-cell],[data-focus-cell]').dataset.cell);host.querySelector(`[data-cell="${dragStart}"]`)?.classList.add('tracing');host.querySelector('.puzzle-grid').setPointerCapture?.(event.pointerId);};
 const move=event=>{if(dragStart==null)return;const end=cellAt(event);if(end==null)return;host.querySelectorAll('.tracing').forEach(c=>c.classList.remove('tracing'));const r=dragStart/puzzle.size|0,c=dragStart%puzzle.size,dr=(end/puzzle.size|0)-r,dc=end%puzzle.size-c;if(dr&&dc&&Math.abs(dr)!==Math.abs(dc))return;for(let i=0;i<=Math.max(Math.abs(dr),Math.abs(dc));i++)host.querySelector(`[data-cell="${dragStart+i*(Math.sign(dr)*puzzle.size+Math.sign(dc))}"]`)?.classList.add('tracing');};
 const up=event=>{if(dragStart==null||event.pointerId!==dragPointer)return;const end=cellAt(event),start=dragStart;dragStart=null;dragPointer=null;const grid=host.querySelector('.puzzle-grid');if(grid?.hasPointerCapture?.(event.pointerId))grid.releasePointerCapture(event.pointerId);if(end==null){cancel();return;}if(start===end){tapStart=tapStart===start?null:start;render();}else search(start,end);};
 const click=event=>{const resume=event.target.closest('[data-continue-round]');if(resume){const target=disclosure.closest('[data-trio]')?.parentElement?.querySelector('[data-trio="'+resume.dataset.continueRound+'"]')||document.getElementById(resume.dataset.continueRound);if(target){target.open=true;bringGameIntoView(target);}else{const query=new URLSearchParams(location.search);query.set('game',resume.dataset.continueRound);location.href='activities.html?'+query;}return;}if(event.target.closest('[data-start]')){focusGrid=type==='crossword';void play({start:true});}if(event.target.closest('[data-retry]')){message='';listen();render();}if(event.target.closest('[data-route-retry]')){void loadPartnerRound();render();}if(event.target.closest('[data-share]')&&mine&&finished())void shareResult(timedShare(timedSummary(mine),PUZZLE_NAMES[type])).then(note=>{shareNote=note;render();});if(type!=='crossword'||!mine||!puzzle||finished())return;
  const clue=event.target.closest('[data-clue]'),cell=event.target.closest('[data-cell],[data-focus-cell]'),key=event.target.closest('[data-ckey]'),step=event.target.closest('[data-clue-step]');
  if(clue)moveTo(selectClue(puzzle,letters,Number(clue.dataset.clue)));
  else if(cell)moveTo(selectCell(puzzle,cursor,Number(cell.dataset.cell??cell.dataset.focusCell),{toggle:!cell.hasAttribute('data-focus-cell')}));
  else if(step)moveTo(nextClue(puzzle,letters,cursor,Number(step.dataset.clueStep)));
  else if(event.target.closest('[data-flip]'))moveTo(toggleDirection(puzzle,cursor));
  else if(key)key.dataset.ckey==='⌫'?edit(eraseLetter(puzzle,letters,cursor)):key.dataset.ckey==='⇄'?moveTo(toggleDirection(puzzle,cursor)):edit(typeLetter(puzzle,letters,cursor,key.dataset.ckey));
  if(clue||cell||step){if(typing.active)typing.focus();else host.querySelector('.puzzle-cell.cursor')?.focus({preventScroll:true});}
 };
 const key=event=>{
  if(type==='crossword'){
   if(!mine||!puzzle||finished()||event.ctrlKey||event.metaKey||event.altKey||!event.target.closest?.('.crossword-grid,.crossword-keys,.crossword-current,.crossword-focus'))return;
   const k=event.key;
   if(/^[a-zA-Z]$/.test(k)){event.preventDefault();edit(typeLetter(puzzle,letters,cursor,k.toUpperCase()));}
   else if(k==='Backspace'||k==='Delete'){event.preventDefault();edit(eraseLetter(puzzle,letters,cursor));}
   else if(k.startsWith('Arrow')){event.preventDefault();moveTo(moveCursor(puzzle,cursor,k));}
   else if(k===' '&&event.target.closest('.crossword-grid')){event.preventDefault();moveTo(toggleDirection(puzzle,cursor));}
   else if(k==='Enter'&&event.target.closest('.crossword-grid')){event.preventDefault();moveTo(nextClue(puzzle,letters,cursor,event.shiftKey?-1:1));}
   else return;
   host.querySelector('.puzzle-cell.cursor')?.focus({preventScroll:true});
   return;
  }
  const button=event.target.closest('[data-cell],[data-focus-cell]');if(!button)return;const p=Number(button.dataset.cell),offset={ArrowRight:1,ArrowLeft:-1,ArrowDown:puzzle.size,ArrowUp:-puzzle.size}[event.key];if(offset){event.preventDefault();let next=p+offset;while(next>=0&&next<puzzle.grid.length&&puzzle.grid[next]==='#')next+=offset;host.querySelector(`[data-cell="${next}"]`)?.focus();}if(type==='search'&&['Enter',' '].includes(event.key)){event.preventDefault();if(tapStart==null){tapStart=p;button.classList.add('tracing');}else search(tapStart,p);}};
 const cancel=()=>{dragStart=null;dragPointer=null;tapStart=null;host.querySelectorAll('.tracing').forEach(c=>c.classList.remove('tracing'));render();};
 host.addEventListener('click',click);host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancel);host.addEventListener('keydown',key);
 const tick=()=>{if(disposed)return;if(!mine){const button=view.querySelector('[data-start]'),blocked=conflict();if(button&&blocked)button.textContent=roundWaitMessage(blocked);else if(view.querySelector('[data-continue-round]'))render();}if(partnerFinished!==timedOver(partner())){partnerFinished=timedOver(partner());render();}if(!mine||mine.done||closed||!puzzle)return;const remaining=Math.min(timedLimit(type,mine||puzzle)-(Date.now()-millis(mine.startedAt)),puzzle.closesAt-Date.now());const timer=host.querySelector('[data-timer]');if(timer){timer.textContent=time(remaining);timer.classList.toggle('time-low',remaining<15000);}if(remaining<=0){if(!expiredDrawn){expiredDrawn=true;cancel();}if(!busy&&navigator.onLine&&Date.now()>=expiredRetryAt)void play({index:null});}};
 const interval=setInterval(tick,300);
 const toggle=()=>{if(!disclosure.open){typing?.suspend();board?.cancel();}else if(mine&&!finished())board?.open();};disclosure.addEventListener('toggle',toggle);
 const resume=()=>{if(activityClock().day!==openedDay){location.reload();return;}if(!document.hidden){listen();tick();creditWords();}};
 addEventListener('online',resume);addEventListener('offline',render);document.addEventListener('visibilitychange',resume);listen();
 return ()=>{disposed=true;together.dispose();board?.dispose();typing?.dispose();host.classList.remove('timed-playing');disclosure.removeEventListener('toggle',toggle);action++;unsubs.forEach(fn=>fn());clearInterval(interval);clearTimeout(flashTimer);celebration.dispose();removeEventListener('online',resume);removeEventListener('offline',render);document.removeEventListener('visibilitychange',resume);for(const [name,handler]of Object.entries({click,pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,keydown:key}))host.removeEventListener(name,handler);};
}

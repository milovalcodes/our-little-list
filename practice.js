import {bootPage} from './page-boot.js';
import {HOUSEHOLD_ID} from './household.js';
import {practicePuzzle,PRACTICE_COUNTS,PRACTICE_NAMES} from './practice-catalog.js';
import {practiceStore} from './practice-store.js';
import {entryCells,selectedSearchWord} from './daily-puzzles.js';
import {WORD_LEXICON} from './word-lexicon.js';
import {scoreGuess} from './word-game.js';
import {escapeHtml as esc} from './ui-helpers.js';
import {createWordCelebration} from './word-celebration.js';

const {viewer}=await bootPage();
const store=practiceStore(HOUSEHOLD_ID+':'+viewer);
const host=document.getElementById('practice-game'),picker=document.getElementById('practice-picker');
host.tabIndex=-1;
let type,index,puzzle,state,selected=0,message='',tapStart=null,drag=null,celebration,flashTimer;
const isDone=()=>type==='word'?state.guesses.includes(puzzle.word.toLowerCase())||state.guesses.length>=5:state.solved.length===puzzle.entries.length;
function save(){state.selected=selected;store.save(type,index,state);document.getElementById('practice-warning').textContent=store.warning;}
function progress(){
 document.getElementById('practice-progress').textContent=type==='word'
  ?`${store.completed(type)} finished · 5 tries, then retry anytime`
  :`${store.completed(type)} finished · take your time`;
}
function open(){
 const asked=location.hash.slice(1);type=Object.hasOwn(PRACTICE_COUNTS,asked)?asked:'word';
 index=store.cursor(type);load();
 document.querySelectorAll('[data-practice-tab]').forEach(a=>{if(a.dataset.practiceTab===type)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
}
function load(){
 cancelTrace();clearTimeout(flashTimer);celebration?.dispose();host.setAttribute('aria-busy','true');
 puzzle=practicePuzzle(type,index);state=store.load(type,index);message='';
 state.solved=state.solved.filter(n=>n<puzzle.entries?.length);
 selected=Math.min(state.selected,puzzle.entries?.length-1||0);
 if(type==='word')state.draft=state.draft.toLowerCase().replace(/[^a-z]/g,'').slice(0,5);
 else state.draft=state.draft.toUpperCase().replace(/[^A-Z]/g,'').slice(0,puzzle.entries[selected].word.length);
 // Practice celebrations never create score/result documents.
 celebration=createWordCelebration(host,viewer,'practice-'+type+'-'+index);
 document.getElementById('practice-title').textContent=PRACTICE_NAMES[type];
 picker.innerHTML=Array.from({length:PRACTICE_COUNTS[type]},(_,i)=>`<option value="${i}">${i+1} / ${PRACTICE_COUNTS[type]}</option>`).join('');
 picker.value=index;render();host.setAttribute('aria-busy','false');
}
function feedback(text){message=text;const node=host.querySelector('[data-feedback]');if(node)node.textContent=text;}
function celebrate(){
 state.completed=true;save();progress();
 celebration.play({done:true,won:true,guesses:Array(3)},{tier:'win',icon:'✦',text:'nicely done. just for you.',pieces:18,duration:2000});
}
function render(){
 if(type==='word')renderWord();else renderBoard();
 progress();document.getElementById('practice-warning').textContent=store.warning;
}
function hintText(){
 return [state.hints>=1?puzzle.clue:'',state.hints>=2?`Starts with ${puzzle.word[0]}.`:'',state.hints>=3?`Letter 3 is ${puzzle.word[2]}; last letter is ${puzzle.word[4]}.`:''].filter(Boolean).join(' ');
}
function renderWord(){
 const done=isDone(),won=state.guesses.includes(puzzle.word.toLowerCase()),keys={},rank={absent:1,present:2,correct:3};
 for(const guess of state.guesses)scoreGuess(guess,puzzle.word.toLowerCase()).forEach((mark,i)=>{if((rank[keys[guess[i]]]||0)<rank[mark])keys[guess[i]]=mark;});
 host.innerHTML=`<div class="word-grid" aria-label="Practice guesses">${Array.from({length:5},(_,row)=>{
  const guess=state.guesses[row],marks=guess?scoreGuess(guess,puzzle.word.toLowerCase()):[];
  return `<div class="word-row" ${!guess&&row===state.guesses.length?'data-draft-row':''}>${Array.from({length:5},(_,i)=>`<span class="word-tile ${marks[i]||''}" aria-label="${guess?guess[i].toUpperCase()+', '+{absent:'not in word',present:'wrong spot',correct:'right spot'}[marks[i]]:'empty'}">${guess?.[i]||(!guess&&row===state.guesses.length?state.draft[i]||'':'')}</span>`).join('')}</div>`;
 }).join('')}</div>
 <p class="word-message ${done?'practice-done':''}" data-feedback role="status">${esc(done?(won?'got it ♡':`It was ${puzzle.word}. Another go?`):message)}</p>
 <div class="word-legend"><span><i class="word-tile correct" aria-hidden="true">a</i>right spot</span><span><i class="word-tile present" aria-hidden="true">b</i>wrong spot</span><span><i class="word-tile absent" aria-hidden="true">c</i>not in word</span></div>
 ${!done?`<div class="word-keyboard" aria-label="Practice keyboard">${['qwertyuiop','asdfghjkl','↵zxcvbnm⌫'].map(row=>`<div>${[...row].map(letter=>`<button type="button" data-key="${letter}" class="${keys[letter]||''} ${letter==='↵'||letter==='⌫'?'wide-key':''}" aria-label="${letter==='↵'?'Submit guess':letter==='⌫'?'Delete letter':letter.toUpperCase()+(keys[letter]?', '+{correct:'right spot',present:'wrong spot',absent:'not in word'}[keys[letter]]:'')}">${letter==='↵'?'enter':letter}</button>`).join('')}</div>`).join('')}</div><div class="practice-hints"><button type="button" data-hint ${state.hints>=3?'disabled':''}>${state.hints===0?'a clue, please':state.hints>=3?'all clues open':'another little clue'}</button></div>`:''}
 <p class="practice-clue" data-hints>${esc(hintText())}</p>`;
}
function wordKey(key){
 if(type!=='word'||isDone())return;
 if(key==='↵'){
  const guess=state.draft;
  if(guess.length!==5){feedback('Five letters first.');return;}
  if(state.guesses.includes(guess)){feedback('Already tried that one. No try used.');return;}
  if(!WORD_LEXICON.has(guess)&&guess!==puzzle.word.toLowerCase()){feedback('Not in the dictionary. No try used.');return;}
  state.guesses.push(guess);state.draft='';message='';save();
  if(guess===puzzle.word.toLowerCase())celebrate();
  renderWord();progress();
  const row=host.querySelectorAll('.word-row')[state.guesses.length-1];row.classList.add('practice-reveal');
  clearTimeout(flashTimer);flashTimer=setTimeout(()=>row.classList.remove('practice-reveal'),350);
  return;
 }
 if(key==='⌫')state.draft=state.draft.slice(0,-1);
 else if(/^[a-z]$/.test(key)&&state.draft.length<5)state.draft+=key;
 else return;
 // Only the draft row changes while typing; previous coloured tiles never remount.
 host.querySelectorAll('[data-draft-row] .word-tile').forEach((tile,i)=>{tile.textContent=state.draft[i]||'';tile.setAttribute('aria-label',state.draft[i]?.toUpperCase()||'empty');});
 feedback('');save();
}
function renderBoard(){
 const done=isDone(),solved=new Set(state.solved),known=new Set(state.solved.flatMap(i=>entryCells(puzzle,i))),active=new Set(type==='crossword'?entryCells(puzzle,selected):[]);
 const numbers=new Map([...new Set(puzzle.entries.map(e=>e.start))].sort((a,b)=>a-b).map((p,i)=>[p,i+1]));
 host.innerHTML=`<div class="timed-toolbar"><span>A little of everything</span><strong>${solved.size} / ${puzzle.entries.length}</strong></div><div class="puzzle-grid ${type==='search'?'search-grid':'crossword-grid'}" style="--grid-size:${puzzle.size}" aria-label="Practice puzzle grid">${[...puzzle.grid].map((letter,i)=>{
 if(letter==='#')return '<span class="puzzle-wall" aria-hidden="true"></span>';
 const visible=type==='search'||known.has(i);
 return `<button type="button" class="puzzle-cell ${known.has(i)?'found':''} ${active.has(i)?'chosen':''}" data-cell="${i}" aria-label="${visible?letter:'empty'}, row ${Math.floor(i/puzzle.size)+1}, column ${i%puzzle.size+1}" tabindex="${i===puzzle.grid.search(/[A-Z]/)?0:-1}">${type==='crossword'&&numbers.has(i)?`<small>${numbers.get(i)}</small>`:''}<span>${visible?letter:''}</span></button>`;
 }).join('')}</div>${type==='search'?`<div class="search-words">${puzzle.entries.map((e,i)=>`<span class="${solved.has(i)?'found':''}">${e.word}</span>`).join('')}</div><p class="practice-caption">Drag across a word, or tap its first and last letter.</p>`:`
 ${!done?`<form class="crossword-answer"><label for="practice-answer">${numbers.get(puzzle.entries[selected].start)} ${puzzle.entries[selected].step===1?'across':'down'} · ${esc(puzzle.entries[selected].clue)} (${puzzle.entries[selected].word.length})</label><div><input id="practice-answer" maxlength="${puzzle.entries[selected].word.length}" value="${esc(state.draft)}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Answer to selected clue" ${solved.has(selected)?'disabled':''}><button type="submit" ${solved.has(selected)?'disabled':''}>check</button></div></form>`:''}
 <div class="crossword-clues">${puzzle.entries.map((e,i)=>`<button type="button" data-clue="${i}" aria-pressed="${i===selected}" class="${solved.has(i)?'found':''}"><b>${numbers.get(e.start)}${e.step===1?'→':'↓'}</b> ${esc(e.clue)} <small>(${e.word.length})${solved.has(i)?' ✓':''}</small></button>`).join('')}</div>`}
 <p class="timed-feedback ${done?'practice-done':''}" data-feedback role="status">${esc(done?'all found ♡':message)}</p>`;
}
function solve(i){
 if(isDone())return;
 if(state.solved.includes(i)){feedback('Already found that one.');return;}
 state.solved.push(i);state.draft='';message='nice, got it';save();
 if(isDone())celebrate();
 else if(type==='crossword')selected=puzzle.entries.findIndex((_,n)=>!state.solved.includes(n));
 save();render();
 for(const p of entryCells(puzzle,i))host.querySelector(`[data-cell="${p}"]`)?.classList.add('just-found');
 clearTimeout(flashTimer);flashTimer=setTimeout(()=>host.querySelectorAll('.just-found').forEach(n=>n.classList.remove('just-found')),600);
}
function search(start,end){
 cancelTrace();
 if(isDone())return;
 const pick=selectedSearchWord(puzzle,start,end);
 if(!pick){feedback('Try a straight line through one of the listed words.');return;}
 solve(pick.index);
}
function chooseClue(i){
 selected=i;state.draft='';save();renderBoard();host.querySelector('#practice-answer')?.focus({preventScroll:true});
}
function trace(start,end){
 host.querySelectorAll('.tracing').forEach(n=>n.classList.remove('tracing'));
 const dr=Math.floor(end/puzzle.size)-Math.floor(start/puzzle.size),dc=end%puzzle.size-start%puzzle.size;
 if(dr&&dc&&Math.abs(dr)!==Math.abs(dc))return;
 const step=Math.sign(dr)*puzzle.size+Math.sign(dc);
 for(let i=0;i<=Math.max(Math.abs(dr),Math.abs(dc));i++)host.querySelector(`[data-cell="${start+i*step}"]`)?.classList.add('tracing');
}
function cancelTrace(){drag=null;tapStart=null;host.querySelectorAll('.tracing').forEach(n=>n.classList.remove('tracing'));}
function cellAt(event){const el=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-cell]');return el&&host.contains(el)?Number(el.dataset.cell):null;}
host.addEventListener('pointerdown',e=>{
 const cell=e.target.closest('[data-cell]');
 if(type!=='search'||!cell||isDone()||drag||e.isPrimary===false||e.button>0)return;
 e.preventDefault();drag={id:e.pointerId,start:tapStart??Number(cell.dataset.cell)};
 host.querySelector('.puzzle-grid').setPointerCapture?.(e.pointerId);trace(drag.start,Number(cell.dataset.cell));
});
host.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const end=cellAt(e);if(end!==null)trace(drag.start,end);});
host.addEventListener('pointerup',e=>{
 if(!drag||e.pointerId!==drag.id)return;
 const start=drag.start,end=cellAt(e);drag=null;
 if(end===null){cancelTrace();return;}
 if(start===end){tapStart=start;trace(start,start);}else search(start,end);
});
host.addEventListener('pointercancel',cancelTrace);
host.addEventListener('click',e=>{
 const key=e.target.closest('[data-key]');if(key)wordKey(key.dataset.key);
 if(e.target.closest('[data-hint]')&&type==='word'&&state.hints<3&&!isDone()){state.hints++;save();renderWord();}
 const clue=e.target.closest('[data-clue]');if(clue)chooseClue(Number(clue.dataset.clue));
 const cell=e.target.closest('[data-cell]');
 if(cell&&type==='crossword'){
  const choices=puzzle.entries.map((_,i)=>i).filter(i=>entryCells(puzzle,i).includes(Number(cell.dataset.cell)));
  if(choices.length)chooseClue(choices.find(i=>i!==selected&&!state.solved.includes(i))??choices[0]);
 }
});
host.addEventListener('input',e=>{if(e.target.id==='practice-answer'){state.draft=e.target.value.toUpperCase().replace(/[^A-Z]/g,'');save();}});
host.addEventListener('submit',e=>{
 if(!e.target.matches('.crossword-answer'))return;e.preventDefault();
 if(isDone()||state.solved.includes(selected))return;
 if(state.draft!==puzzle.entries[selected].word){feedback('Not quite. Try that clue again.');return;}
 solve(selected);host.querySelector('#practice-answer')?.focus({preventScroll:true});
});
host.addEventListener('keydown',e=>{
 const cell=e.target.closest('[data-cell]');if(!cell||type==='word')return;
 const p=Number(cell.dataset.cell),offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-puzzle.size,ArrowDown:puzzle.size}[e.key];
 if(offset){e.preventDefault();let next=p+offset;while(next>=0&&next<puzzle.grid.length&&puzzle.grid[next]==='#')next+=offset;host.querySelector(`[data-cell="${next}"]`)?.focus();}
 if(type==='search'&&['Enter',' '].includes(e.key)){e.preventDefault();if(tapStart===null){tapStart=p;trace(p,p);}else search(tapStart,p);}
 if(e.key==='Escape')cancelTrace();
});
document.addEventListener('keydown',e=>{
 if(type!=='word'||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.target.closest('input,textarea,select,[contenteditable="true"],dialog,.app-sheet')||document.querySelector('dialog[open]'))return;
 if(e.target.closest('button,a')&&['Enter',' '].includes(e.key))return;
 const key=e.key==='Enter'?'↵':e.key==='Backspace'?'⌫':e.key.toLowerCase();
 if(key==='↵'||key==='⌫'||/^[a-z]$/.test(key)){e.preventDefault();wordKey(key);}
});
picker.addEventListener('change',()=>{index=Number(picker.value);store.move(type,index);load();});
document.getElementById('practice-next').addEventListener('click',()=>{index=(index+1)%PRACTICE_COUNTS[type];store.move(type,index);load();host.focus({preventScroll:true});});
document.getElementById('practice-restart').addEventListener('click',()=>{
 if(!confirm('Start this puzzle over? Your other practice puzzles stay saved.'))return;
 selected=0;state={guesses:[],solved:[],hints:0,draft:'',completed:state.completed,selected:0};save();load();host.focus({preventScroll:true});
});
addEventListener('hashchange',open);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelTrace();});
// Another tab may change the same practice puzzle. Load fresh rather than overwriting its progress.
addEventListener('storage',e=>{if(e.key?.startsWith('our-little-app-practice-'))location.reload();});
open();

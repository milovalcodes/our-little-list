import { activityClock } from './activity-clock.js';
import { DAILY_WORDS, SUNDAY_WORDS, wordForDay } from './daily-words.js';
import { WORD_LEXICON } from './word-lexicon.js';
import { scoreGuess, wordSummary } from './word-game.js';
import { wordPoints } from './word-scores.js';
import { escapeHtml } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { createWordCelebration, wordFinish } from './word-celebration.js';
import {wordTheme} from './puzzle-catalog.js';
import {SEASONAL_WORDS} from './seasonal-puzzles.js';
import {EDITION_WORDS} from './puzzle-edition.js';

let activeBoard=null;
const accepted=new Set([...WORD_LEXICON,...DAILY_WORDS,...SUNDAY_WORDS,...SEASONAL_WORDS.map(e=>e.word),...EDITION_WORDS.map(e=>e.word)]);
export function startDailyWord({data,viewer,other},options={}){
  const openedDay=activityClock().day,day=options.day||openedDay,host=options.host||document.getElementById('word-game');
  const tie=day.includes('-tie-');
  if(!host)return;
  let pendingGuess=null,disposed=false,completionToCelebrate=null;
  let peekOpen=false,peekBusy=false,peekGame=null,peekError='',peekRequest=0;
  const celebration=createWordCelebration(host,viewer,day);
  let puzzle=null,mine=null,results=[],draft='',busy=false,error='',syncFailure=false,unsub=[],loaded=new Set(),timer;
  const summary=options.summary||document.getElementById('word-summary');
  const closed=()=>Boolean(puzzle&&Date.now()>=puzzle.closesAt);
  function read(){
    unsub.forEach(stop=>stop());unsub=[];loaded=new Set();error='';syncFailure=false;clearTimeout(timer);
    const fail=()=>{syncFailure=true;error='Couldn’t sync the word. Check your connection, then retry.';render();};
    const listen=(name,options,handle)=>unsub.push(data.listenToQuery(name,options,items=>{loaded.add(name);handle(items);render();},{onError:fail}));
    listen('wordPuzzles',{where:{field:'day',value:day}},items=>{puzzle=items.find(p=>p.day===day)||(data.mode==='local'&&!tie?wordForDay(day):null);});
    listen('wordGames',{where:[{field:'person',value:viewer},{field:'day',value:day}]},items=>{
      const incoming=items.find(p=>p.person===viewer&&p.day===day)||null;
      // A cached snapshot must not rewind a guess already acknowledged by the server.
      if(!mine||(incoming?.guesses.length||0)>=mine.guesses.length)mine=incoming;
      if(pendingGuess&&incoming?.guesses[pendingGuess.index]===pendingGuess.word){
        if(incoming.done)completionToCelebrate=incoming;
        if(draft===pendingGuess.word)draft='';
        pendingGuess=null;error='';syncFailure=false;
      }
    });
    listen('wordResults',{where:{field:'day',value:day}},items=>{results=items;});
    timer=setTimeout(()=>{if(!ready()){syncFailure=true;error='Still waiting for today’s word. Reconnect and retry in a moment.';render();}},12000);
    render();
  }
  function ready(){return puzzle&&loaded.has('wordGames')&&loaded.has('wordPuzzles');}
  function render(){
    if(disposed)return;
    if(ready())clearTimeout(timer);
    const guesses=mine?.guesses||[],done=mine?.done||closed(),sunday=tie||new Date(day+'T12:00:00Z').getUTCDay()===0;
    const finish=wordFinish(mine);
    summary.textContent=mine?.done?(mine.won?`solved · ${wordPoints(wordSummary(mine))} points`:'all 5 tried · tomorrow’s a new one'):closed()?'today’s word has closed':tie?'hard word · tie-break round':sunday?'Sunday challenge · double points':guesses.length?`${guesses.length} / 5 tries`:'5 letters · 5 tries';
    const marks=puzzle?guesses.map(guess=>scoreGuess(guess,puzzle.word)):[];
    const keys={};
    guesses.forEach((guess,row)=>[...guess].forEach((letter,i)=>{const score=marks[row]?.[i];if(!score)return;if(!keys[letter]||['absent','present','correct'].indexOf(score)>['absent','present','correct'].indexOf(keys[letter]))keys[letter]=score;}));
    const focused=host.querySelector(':focus')?.dataset.key||'';
    const peekFocused=Boolean(host.querySelector('[data-word-peek]:focus'));
    const disabled=busy||!ready()||done||!navigator.onLine;
    host.innerHTML=`
      <div class="word-heading"><span>${puzzle?escapeHtml(puzzle.theme||wordTheme(puzzle.word,sunday)):'your guesses'}</span><span>${sunday?'hard · 2× points':`${guesses.length} / 5`}</span></div>
      <div class="word-grid" role="group" aria-label="Five guesses">${Array.from({length:5},(_,row)=>{
        const text=guesses[row]||(!done&&row===guesses.length?draft:'');
        return `<div class="word-row" aria-label="Guess ${row+1}">${Array.from({length:5},(_,i)=>`<span class="word-tile ${marks[row]?.[i]||''}" aria-label="${text[i]?escapeHtml(text[i].toUpperCase())+', '+(marks[row]?.[i]||'not submitted'):'empty'}">${escapeHtml(text[i]||'')}</span>`).join('')}</div>`;
      }).join('')}</div>
      <p class="word-message" role="status" aria-live="polite">${escapeHtml(error||(!navigator.onLine?'Offline. Reconnect to save your guess.':busy?'saving your guess…':!ready()?'getting today’s word…':finish?finish.text+(mine.won?'':` The word was ${puzzle.word.toUpperCase()}.`):done?`The word was ${puzzle.word.toUpperCase()}.`:' '))}</p>
      ${syncFailure?'<button type="button" data-word-retry>retry sync</button>':''}
      ${!done?`<div class="word-keyboard" aria-label="Word keyboard">${['qwertyuiop','asdfghjkl','↵zxcvbnm⌫'].map(row=>`<div>${[...row].map(letter=>`<button type="button" data-key="${letter}" class="${keys[letter]||''} ${letter==='↵'||letter==='⌫'?'wide-key':''}" aria-label="${letter==='↵'?'Submit guess':letter==='⌫'?'Delete letter':letter.toUpperCase()+(keys[letter]?', '+({correct:'right spot',present:'in the word',absent:'not in the word'}[keys[letter]]):', not tried')}" ${disabled?'disabled':''}>${letter==='↵'?'enter':letter}</button>`).join('')}</div>`).join('')}</div>`:''}
      <div class="word-legend"><span><i class="word-tile correct">A</i>right spot</span><span><i class="word-tile present">A</i>in the word</span><span><i class="word-tile absent">A</i>not in the word</span></div>
      <p class="word-partner">${partnerLabel()}</p>${peekMarkup()}`;
    if(focused)host.querySelector(`[data-key="${focused}"]`)?.focus({preventScroll:true});
    if(peekFocused)host.querySelector('[data-word-peek]')?.focus({preventScroll:true});
    if(completionToCelebrate&&!busy){celebration.play(completionToCelebrate);completionToCelebrate=null;}
  }
  function canPeek(){return mine?.done&&results.some(r=>r.day===day&&r.person===other&&r.done);}
  function peekMarkup(){
    if(!canPeek()||!puzzle)return '';
    const board=peekGame&&peekGame.guesses.map((guess,row)=>{
      const marks=scoreGuess(guess,puzzle.word);
      return `<div class="word-row" aria-label="Guess ${row+1}">${[...guess].map((letter,i)=>`<span class="word-tile ${marks[i]}" aria-label="${escapeHtml(letter.toUpperCase())}, ${marks[i]}">${escapeHtml(letter)}</span>`).join('')}</div>`;
    }).join('');
    return `<div class="word-peek"><button type="button" data-word-peek aria-expanded="${peekOpen}" ${peekBusy?'aria-busy="true"':''}>${peekBusy?'getting their guesses…':peekOpen?'close their process':'peek their process'}</button>${peekOpen?`<div class="word-peek-board"><h3>${escapeHtml(personName(other))}’s guesses</h3>${peekError?`<p role="status">${escapeHtml(peekError)}</p><button type="button" data-word-peek-retry>try again</button>`:peekBusy?'<p role="status">one second…</p>':`<div class="word-grid" role="group" aria-label="Partner’s guesses">${board||''}</div>`}</div>`:''}</div>`;
  }
  async function peek(retry=false){
    if(disposed||!canPeek())return;
    if(peekOpen&&!retry){peekOpen=false;render();return;}
    peekOpen=true;
    if(peekGame||peekBusy){render();return;}
    peekBusy=true;peekError='';render();
    const request=++peekRequest;let timeout;
    try{
      // A single-document read is checked by Firestore against both boards.
      // Never subscribe to or download the partner's unfinished guesses.
      const game=await Promise.race([data.readDoc('wordGames',day+'-'+other),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),12000);})]);
      if(disposed||request!==peekRequest)return;
      if(!game?.done||game.day!==day||game.person!==other||!Array.isArray(game.guesses)||!game.guesses.length||game.guesses.length>5||game.guesses.some(g=>typeof g!=='string'||!/^[a-z]{5}$/.test(g)))throw new Error('not ready');
      peekGame=game;
    }catch(_){if(!disposed&&request===peekRequest)peekError='Couldn’t get their guesses. Check your connection and try again.';}
    finally{clearTimeout(timeout);if(!disposed&&request===peekRequest){peekBusy=false;render();}}
  }
  function partnerLabel(){
    const result=results.find(r=>r.day===day&&r.person===other),name=escapeHtml(personName(other));
    if(!loaded.has('wordResults'))return 'checking the other side…';
    if(!result)return name+' hasn’t tried yet';
    if(!result.done)return name+` · ${result.attempts} / 5 tries`;
    return name+(result.won?` solved in ${result.attempts} · ${wordPoints(result)} points`:' · no luck today');
  }
  async function key(value){
    if(busy||!ready()||mine?.done||closed()||!navigator.onLine)return;
    error='';syncFailure=false;
    if(value==='⌫'){draft=draft.slice(0,-1);render();return;}
    if(value!=='↵'){if(/^[a-z]$/.test(value)&&draft.length<5)draft+=value;render();return;}
    if(draft.length!==5){error='Five letters, please. No try used.';render();return;}
    if(!accepted.has(draft)){error='Not in the word book. No try used—try another.';render();return;}
    if(mine?.guesses.includes(draft)){error='Already tried that one. No try used.';render();return;}
    busy=true;pendingGuess={word:draft,index:mine?.guesses.length||0};render();
    try{
      let timer;
      const next=await Promise.race([data.submitWordGuess({day,person:viewer,guess:draft,expectedCount:mine?.guesses.length||0}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('confirmation timeout')),20000);})]).finally(()=>clearTimeout(timer));
      if(!mine||next.guesses.length>=mine.guesses.length)mine=next;
      if(next.done)completionToCelebrate=next;
      draft='';
    }catch(problem){
      if(pendingGuess){
        syncFailure=!/other screen|finished|closed/.test(problem.message);
        error=!syncFailure?problem.message:problem.message==='confirmation timeout'?'Still waiting for confirmation. Retry sync before trying again.':'That guess didn’t save. Check your connection and try again.';
      }
    }
    finally{busy=false;render();}
  }
  host.addEventListener('click',event=>{const button=event.target.closest('[data-key]');if(button)void key(button.dataset.key);if(event.target.closest('[data-word-retry]'))read();if(event.target.closest('[data-word-peek]'))void peek();if(event.target.closest('[data-word-peek-retry]'))void peek(true);});
  const keydown=event=>{
    if(activeBoard!==host)return;
    if([...document.querySelectorAll('dialog[open],[role="dialog"]')].some(dialog=>dialog.getClientRects().length))return;
    if(!(options.disclosure||document.getElementById('wordle')).open||document.getElementById('daily').hidden||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    // Let focused buttons keep their ordinary Enter behavior.
    if(event.key==='Enter'&&event.target.closest('button,summary,a'))return;
    const value=event.key==='Enter'?'↵':event.key==='Backspace'?'⌫':event.key.toLowerCase();
    if(/^[a-z]$/.test(value)||value==='↵'||value==='⌫'){event.preventDefault();void key(value);}
  };
  document.addEventListener('keydown',keydown);
  const activate=()=>{activeBoard=host;};
  const disclosure=options.disclosure||document.getElementById('wordle');
  const opened=()=>{if(disclosure.open)activate();};
  host.addEventListener('pointerdown',activate);host.addEventListener('focusin',activate);disclosure.addEventListener('toggle',opened);if(disclosure.open||!activeBoard)activate();
  function resume(){if(activityClock().day!==openedDay){location.reload();return;}read();}
  addEventListener('online',resume);addEventListener('offline',render);
  const visible=()=>{if(!document.hidden)resume();};document.addEventListener('visibilitychange',visible);
  addEventListener('littlelist:profile',render);
  const interval=setInterval(()=>{if(activityClock().day!==openedDay)location.reload();else if(closed())render();},30000);
  read();
  return ()=>{disposed=true;celebration.dispose();if(activeBoard===host)activeBoard=null;unsub.forEach(stop=>stop());clearTimeout(timer);clearInterval(interval);disclosure.removeEventListener('toggle',opened);removeEventListener('online',resume);removeEventListener('offline',render);removeEventListener('littlelist:profile',render);document.removeEventListener('keydown',keydown);document.removeEventListener('visibilitychange',visible);};
}

import {gameFeedback} from './game-comfort.js';
import {countdownMarkup} from './daily-habit.js';
import { activityClock } from './activity-clock.js';
import { DAILY_WORDS, SUNDAY_WORDS, wordForDay } from './daily-words.js';
import { WORD_LEXICON } from './word-lexicon.js';
import { scoreGuess, wordSummary } from './word-game.js';
import { wordPoints, wordAttempts } from './word-scores.js';
import { wordStats, wordShare } from './daily-results.js';
import { shareResult } from './share-result.js';
import { escapeHtml } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { createWordCelebration, wordFinish } from './word-celebration.js';
import {wordTheme} from './puzzle-catalog.js';
import {SEASONAL_WORDS} from './seasonal-puzzles.js';
import {EDITION_WORDS} from './puzzle-edition.js';
import {revisionOf} from './round-revision.js';
import {answerPool} from './round-library.js';

let activeBoard=null;
const accepted=new Set([...WORD_LEXICON,...DAILY_WORDS,...SUNDAY_WORDS,...SEASONAL_WORDS.map(e=>e.word),...EDITION_WORDS.map(e=>e.word),...[false,true].flatMap(h=>['','october','december'].flatMap(s=>answerPool(h,s).map(e=>e.word)))]);
export function startDailyWord({data,viewer,other},options={}){
  const openedDay=activityClock().day,day=options.day||openedDay,host=options.host||document.getElementById('word-game');
  const tie=day.includes('-tie-');
  if(!host)return;
  let pendingGuess=null,disposed=false,completionToCelebrate=null;
  let latestMine=null,generation=0;
  let peekOpen=false,peekBusy=false,peekGame=null,peekError='',peekRequest=0;
  const celebration=createWordCelebration(host,viewer,day);
  let history=[],shareNote='';
  let puzzle=null,mine=null,results=[],draft='',busy=false,error='',syncFailure=false,unsub=[],loaded=new Set(),timer;
  const summary=options.summary||document.getElementById('word-summary');
  const closed=()=>Boolean(puzzle&&Date.now()>=puzzle.closesAt);
  function read(){
    unsub.forEach(stop=>stop());unsub=[];loaded=new Set();error='';syncFailure=false;clearTimeout(timer);
    const fail=()=>{syncFailure=true;error='Couldn’t sync the word. Check your connection, then retry.';render();};
    const listen=(name,options,handle)=>unsub.push(data.listenToQuery(name,options,(items,meta)=>{loaded.add(name);handle(items,meta);render();},{onError:fail}));
    listen('wordPuzzles',{where:{field:'day',value:day}},items=>{
      const next=items.find(p=>p.day===day)||(data.mode==='local'&&!tie?wordForDay(day):null);
      if(puzzle&&next&&revisionOf(next)<revisionOf(puzzle))return;
      if(puzzle&&next&&revisionOf(next)!==revisionOf(puzzle)){
        generation++;busy=false;draft='';pendingGuess=null;peekRequest++;peekBusy=false;peekGame=null;peekOpen=false;completionToCelebrate=null;error='Fresh round · your attempts start here.';syncFailure=false;
        mine=latestMine&&revisionOf(latestMine)===revisionOf(next)?latestMine:null;
      }
      puzzle=next;
      if(mine&&revisionOf(mine)!==revisionOf(puzzle))mine=null;
      if(!mine&&latestMine&&revisionOf(latestMine)===revisionOf(puzzle))mine=latestMine;
    });
    listen('wordGames',{where:[{field:'person',value:viewer},{field:'day',value:day}]},(items,meta)=>{
      const incoming=items.find(p=>p.person===viewer&&p.day===day)||null;
      latestMine=incoming;
      if(incoming&&puzzle&&revisionOf(incoming)!==revisionOf(puzzle))return;
      // A cached snapshot must not rewind a guess already acknowledged by the server.
      if(!incoming&&meta?.fromCache===false){mine=null;draft='';pendingGuess=null;peekGame=null;peekOpen=false;completionToCelebrate=null;}
      else if(!mine||(incoming?.guesses.length||0)>=mine.guesses.length)mine=incoming;
      if(pendingGuess&&incoming?.guesses[pendingGuess.index]===pendingGuess.word){
        if(incoming.done)completionToCelebrate=incoming;
        if(draft===pendingGuess.word)draft='';
        pendingGuess=null;error='';syncFailure=false;
      }
    });
    listen('wordResults',{where:{field:'day',value:day}},items=>{results=items;});
    // Your own finished words feed the streak and guess distribution.
    if(!tie)unsub.push(data.listenToQuery('wordResults',{where:{field:'person',value:viewer}},items=>{history=items.filter(r=>r.person===viewer);render();},{onError:()=>{}}));
    timer=setTimeout(()=>{if(!ready()){syncFailure=true;error='Still waiting for today’s word. Reconnect and retry in a moment.';render();}},12000);
    render();
  }
  function ready(){return puzzle&&loaded.has('wordGames')&&loaded.has('wordPuzzles');}
  function render(){
    if(disposed)return;
    if(ready())clearTimeout(timer);
    const guesses=mine?.guesses||[],done=mine?.done||closed(),sunday=tie||new Date(day+'T12:00:00Z').getUTCDay()===0;
    const finish=wordFinish(mine);
    summary.textContent=mine?.done?(mine.won?`solved · ${wordPoints(wordSummary(mine))} points`:`all ${wordAttempts(day)} tried · tomorrow’s a new one`):closed()?'today’s word has closed':tie?'hard word · tie-break round':sunday?'Sunday challenge · double points':guesses.length?`${guesses.length} / ${wordAttempts(day)} tries`:`5 letters · ${wordAttempts(day)} tries`;
    const marks=puzzle?guesses.map(guess=>scoreGuess(guess,puzzle.word)):[];
    const keys={};
    guesses.forEach((guess,row)=>[...guess].forEach((letter,i)=>{const score=marks[row]?.[i];if(!score)return;if(!keys[letter]||['absent','present','correct'].indexOf(score)>['absent','present','correct'].indexOf(keys[letter]))keys[letter]=score;}));
    const focused=host.querySelector(':focus')?.dataset.key||'';
    const peekFocused=Boolean(host.querySelector('[data-word-peek]:focus'));
    const announcement=guesses.length?`Guess ${guesses.length}: ${[...guesses.at(-1)].map((c,i)=>c.toUpperCase()+' '+({correct:'right spot',present:'in the word',absent:'not in the word'}[marks.at(-1)?.[i]]||'')).join(', ')}.`:'';
    const disabled=busy||!ready()||done||!navigator.onLine;
    host.innerHTML=`
      <div class="word-heading"><span>${puzzle?escapeHtml(puzzle.theme||wordTheme(puzzle.word,sunday)):'your guesses'}</span><span>${sunday?'hard · 2× points':`${guesses.length} / ${wordAttempts(day)}`}</span></div>
      <div class="word-grid" role="group" aria-label="${wordAttempts(day)} guesses">${Array.from({length:wordAttempts(day)},(_,row)=>{
        const text=guesses[row]||(!done&&row===guesses.length?draft:'');
        return `<div class="word-row" aria-label="Guess ${row+1}">${Array.from({length:5},(_,i)=>`<span class="word-tile ${marks[row]?.[i]||''}" aria-label="${text[i]?escapeHtml(text[i].toUpperCase())+', '+(marks[row]?.[i]||'not submitted'):'empty'}">${escapeHtml(text[i]||'')}</span>`).join('')}</div>`;
      }).join('')}</div>
      <p class="word-message" role="status" aria-live="polite">${escapeHtml(error||(!navigator.onLine?'Offline. Reconnect to save your guess.':busy?'saving your guess…':!ready()?'getting today’s word…':finish?finish.text+(mine.won?'':` The word was ${puzzle.word.toUpperCase()}.`):done?`The word was ${puzzle.word.toUpperCase()}.`:' '))}</p>
      ${syncFailure?'<button type="button" data-word-retry>retry sync</button>':''}
      ${!done?`<div class="word-keyboard" aria-label="Word keyboard">${['qwertyuiop','asdfghjkl','↵zxcvbnm⌫'].map(row=>`<div>${[...row].map(letter=>`<button type="button" data-key="${letter}" class="${keys[letter]||''} ${letter==='↵'||letter==='⌫'?'wide-key':''}" aria-label="${letter==='↵'?'Submit guess':letter==='⌫'?'Delete letter':letter.toUpperCase()+(keys[letter]?', '+({correct:'right spot',present:'in the word',absent:'not in the word'}[keys[letter]]):', not tried')}" ${disabled?'disabled':''}>${letter==='↵'?'enter':letter}</button>`).join('')}</div>`).join('')}</div>`:''}
      <p class="sr-only" role="status" aria-live="polite">${escapeHtml(announcement)}</p><div class="word-legend"><span><i class="word-tile correct">A</i>right spot</span><span><i class="word-tile present">A</i>in the word</span><span><i class="word-tile absent">A</i>not in the word</span></div>
      <p class="word-partner">${partnerLabel()}</p>${resultsMarkup()}${peekMarkup()}`;
    if(focused)host.querySelector(`[data-key="${focused}"]`)?.focus({preventScroll:true});
    if(peekFocused)host.querySelector('[data-word-peek]')?.focus({preventScroll:true});
    if(completionToCelebrate&&!busy){celebration.play(completionToCelebrate);completionToCelebrate=null;}
  }
  function canPeek(){return mine?.done&&results.some(r=>r.day===day&&r.person===other&&r.done&&revisionOf(r)===revisionOf(puzzle));}
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
      if(!game?.done||revisionOf(game)!==revisionOf(puzzle)||game.day!==day||game.person!==other||!Array.isArray(game.guesses)||!game.guesses.length||game.guesses.length>wordAttempts(day)||game.guesses.some(g=>typeof g!=='string'||!/^[a-z]{5}$/.test(g)))throw new Error('not ready');
      peekGame=game;
    }catch(_){if(!disposed&&request===peekRequest)peekError='Couldn’t get their guesses. Check your connection and try again.';}
    finally{clearTimeout(timeout);if(!disposed&&request===peekRequest){peekBusy=false;render();}}
  }
  function resultsMarkup(){
    if(!mine?.done||!puzzle)return '';
    const me=wordSummary(mine),partner=results.find(r=>r.day===day&&r.person===other&&revisionOf(r)===revisionOf(puzzle)),most=wordAttempts(day);
    const side=(label,r)=>`<div class="result-side"><b>${label}</b><span class="${r?.done?'':'waiting'}">${r?.done?(r.won?r.attempts:'X')+' / '+most:r?'still playing':'not played yet'}</span><small>${r?.done?wordPoints(r)+' points':''}</small></div>`;
    let stats='';
    if(!tie){
      const s=wordStats([...history.filter(r=>r.day!==day),me],day),top=Math.max(1,...s.distribution);
      stats=`<dl class="result-stats"><div><dt>played</dt><dd>${s.played}</dd></div><div><dt>win %</dt><dd>${s.winRate}</dd></div><div><dt>streak</dt><dd>${s.current}</dd></div><div><dt>best</dt><dd>${s.best}</dd></div></dl><div class="guess-bars" aria-label="Guess distribution">${s.distribution.slice(0,most).map((n,i)=>`<div class="${me.won&&me.attempts===i+1?'today':''}"><span>${i+1}</span><i style="--share:${n/top}"><b>${n}</b></i></div>`).join('')}</div>`;
    }
    return `<section class="daily-results" aria-label="Today’s results"><div class="result-compare">${side('You',me)}${side(escapeHtml(personName(other)),partner)}</div>${stats}${countdownMarkup()}<a class="practice-rematch" href="practice.html#word">A little more practice →</a><button type="button" data-share>share my grid</button><small class="share-note" role="status">${escapeHtml(shareNote)}</small></section>`;
  }
  function partnerLabel(){
    const result=results.find(r=>r.day===day&&r.person===other&&revisionOf(r)===revisionOf(puzzle)),name=escapeHtml(personName(other));
    if(!loaded.has('wordResults'))return 'checking the other side…';
    if(!result)return name+' hasn’t tried yet';
    if(!mine?.done)return name+(result.done?' has finished · yours first, then compare':' is playing');
    if(!result.done)return name+` · ${result.attempts} / ${wordAttempts(day)} tries`;
    return name+(result.won?` solved in ${result.attempts} · ${wordPoints(result)} points`:' · no luck today');
  }
  async function key(value){
    if(busy||!ready()||mine?.done||closed()||!navigator.onLine)return;
    error='';syncFailure=false;gameFeedback('key');
    if(value==='⌫'){draft=draft.slice(0,-1);render();return;}
    if(value!=='↵'){if(/^[a-z]$/.test(value)&&draft.length<5)draft+=value;render();return;}
    if(draft.length!==5){gameFeedback('invalid');error='Five letters, please. No try used.';render();return;}
    if(!accepted.has(draft)){gameFeedback('invalid');error='Not in the word book. No try used—try another.';render();return;}
    if(mine?.guesses.includes(draft)){error='Already tried that one. No try used.';render();return;}
    busy=true;pendingGuess={word:draft,index:mine?.guesses.length||0};const current=++generation;render();
    try{
      let timer;
      const next=await Promise.race([data.submitWordGuess({day,person:viewer,guess:draft,expectedCount:mine?.guesses.length||0,expectedRevision:revisionOf(puzzle)}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('confirmation timeout')),20000);})]).finally(()=>clearTimeout(timer));
      if(current!==generation||revisionOf(next)!==revisionOf(puzzle))return;
      if(!mine||next.guesses.length>=mine.guesses.length)mine=next;
      if(next.done){completionToCelebrate=next;if(next.won)gameFeedback('solve');}
      draft='';
    }catch(problem){
      if(current===generation&&pendingGuess){
        syncFailure=!/other screen|finished|closed/.test(problem.message);
        error=!syncFailure?problem.message:problem.message==='confirmation timeout'?'Still waiting for confirmation. Retry sync before trying again.':'That guess didn’t save. Check your connection and try again.';
      }
    }
    finally{if(current===generation){busy=false;render();}}
  }
  const click=event=>{const button=event.target.closest('[data-key]');if(button)void key(button.dataset.key);if(event.target.closest('[data-word-retry]'))read();if(event.target.closest('[data-word-peek]'))void peek();if(event.target.closest('[data-share]')&&mine?.done&&puzzle)void shareResult(wordShare(mine,puzzle.word)).then(note=>{shareNote=note;render();});if(event.target.closest('[data-word-peek-retry]'))void peek(true);};
  host.addEventListener('click',click);
  const keydown=event=>{
    if(activeBoard!==host)return;
    if([...document.querySelectorAll('dialog[open],[role="dialog"]')].some(dialog=>dialog.getClientRects().length))return;
    if(!(options.disclosure||document.getElementById('wordle')).open||document.getElementById('daily').hidden||event.ctrlKey||event.metaKey||event.altKey||event.isComposing||event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    // Let focused buttons keep their ordinary Enter behavior.
    if(event.key==='Enter'&&event.target.closest('button,summary,a'))return;
    const value=event.key==='Enter'?'↵':event.key==='Backspace'?'⌫':event.key.toLowerCase();
    if(/^[a-z]$/.test(value)||value==='↵'||value==='⌫'){
      event.preventDefault();
      // Typing starts keyboard play. Otherwise focus stays on the disclosure
      // that opened the game, and Enter closes it instead of sending the word.
      host.tabIndex=-1;host.focus({preventScroll:true});void key(value);
    }
  };
  const activate=()=>{activeBoard=host;};
  const disclosure=options.disclosure||document.getElementById('wordle');
  const opened=()=>{document.removeEventListener('keydown',keydown);if(disclosure.open){activate();document.addEventListener('keydown',keydown);requestAnimationFrame(()=>host.querySelector('.word-keyboard')?.scrollIntoView({block:'end',behavior:'instant'}));}};
  host.addEventListener('pointerdown',activate);host.addEventListener('focusin',activate);disclosure.addEventListener('toggle',opened);if(disclosure.open)opened();else if(!activeBoard)activate();
  function resume(){if(activityClock().day!==openedDay){location.reload();return;}read();}
  addEventListener('online',resume);addEventListener('offline',render);
  const visible=()=>{if(!document.hidden)resume();};document.addEventListener('visibilitychange',visible);
  addEventListener('littlelist:profile',render);
  const interval=setInterval(()=>{if(activityClock().day!==openedDay)location.reload();else if(closed())render();},30000);
  read();
  return ()=>{disposed=true;host.removeEventListener('click',click);host.removeEventListener('pointerdown',activate);host.removeEventListener('focusin',activate);celebration.dispose();if(activeBoard===host)activeBoard=null;unsub.forEach(stop=>stop());clearTimeout(timer);clearInterval(interval);disclosure.removeEventListener('toggle',opened);removeEventListener('online',resume);removeEventListener('offline',render);removeEventListener('littlelist:profile',render);document.removeEventListener('keydown',keydown);document.removeEventListener('visibilitychange',visible);};
}

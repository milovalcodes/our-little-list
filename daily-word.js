import { activityClock } from './activity-clock.js';
import { DAILY_WORDS, SUNDAY_WORDS, wordForDay } from './daily-words.js';
import { WORD_LEXICON } from './word-lexicon.js';
import { scoreGuess, wordSummary } from './word-game.js';
import { scoreWeek, weekForDay, wordPoints, normalizeWeekRecord } from './word-scores.js';
import { escapeHtml } from './ui-helpers.js';
import { personName } from './profile-store.js';

let activeBoard=null;
const accepted=new Set([...WORD_LEXICON,...DAILY_WORDS,...SUNDAY_WORDS]);
export function startDailyWord({data,viewer,other},options={}){
  const openedDay=activityClock().day,day=options.day||openedDay,week=weekForDay(day.slice(0,10)),host=options.host||document.getElementById('word-game');
  const tie=day.includes('-tie-');
  if(!host)return;
  let pendingGuess=null,disposed=false;
  let puzzle=null,mine=null,results=[],weeks=[],draft='',busy=false,error='',syncFailure=false,unsub=[],loaded=new Set(),timer;
  const summary=options.summary||document.getElementById('word-summary');
  const closed=()=>Boolean(puzzle&&Date.now()>=puzzle.closesAt);
  function read(){
    unsub.forEach(stop=>stop());loaded=new Set();error='';syncFailure=false;clearTimeout(timer);
    const fail=()=>{syncFailure=true;error='Couldn’t sync the word. Check your connection, then retry.';render();};
    const listen=(name,options,handle)=>unsub.push(data.listenToQuery(name,options,items=>{loaded.add(name);handle(items);render();},{onError:fail}));
    listen('wordPuzzles',{where:{field:'day',value:day}},items=>{puzzle=items.find(p=>p.day===day)||(data.mode==='local'&&!tie?wordForDay(day):null);});
    listen('wordGames',{where:[{field:'person',value:viewer},{field:'day',value:day}]},items=>{
      const incoming=items.find(p=>p.person===viewer&&p.day===day)||null;
      // A cached snapshot must not rewind a guess already acknowledged by the server.
      if(!mine||(incoming?.guesses.length||0)>=mine.guesses.length)mine=incoming;
      if(pendingGuess&&incoming?.guesses[pendingGuess.index]===pendingGuess.word){
        if(draft===pendingGuess.word)draft='';
        pendingGuess=null;error='';syncFailure=false;
      }
    });
    listen('wordResults',{where:[{field:'day',op:'>=',value:week.start},{field:'day',op:'<=',value:week.end}]},items=>{results=items;});
    unsub.push(data.listenTo('wordWeeks',items=>{weeks=items;render();},{onError:fail}));
    timer=setTimeout(()=>{if(!ready()){syncFailure=true;error='Still waiting for today’s word. Reconnect and retry in a moment.';render();}},12000);
    render();
  }
  function ready(){return puzzle&&loaded.has('wordGames')&&loaded.has('wordPuzzles');}
  function render(){
    if(disposed)return;
    if(ready())clearTimeout(timer);
    const guesses=mine?.guesses||[],done=mine?.done||closed(),sunday=tie||new Date(day+'T12:00:00Z').getUTCDay()===0;
    summary.textContent=mine?.done?(mine.won?`solved · ${wordPoints(wordSummary(mine))} points`:'all 5 tried · tomorrow’s a new one'):closed()?'today’s word has closed':tie?'hard word · tie-break round':sunday?'Sunday challenge · double points':guesses.length?`${guesses.length} / 5 tries`:'5 letters · 5 tries';
    const marks=puzzle?guesses.map(guess=>scoreGuess(guess,puzzle.word)):[];
    const keys={};
    guesses.forEach((guess,row)=>[...guess].forEach((letter,i)=>{const score=marks[row]?.[i];if(!score)return;if(!keys[letter]||['absent','present','correct'].indexOf(score)>['absent','present','correct'].indexOf(keys[letter]))keys[letter]=score;}));
    const focused=host.querySelector(':focus')?.dataset.key||'';
    const disabled=busy||!ready()||done||!navigator.onLine;
    host.innerHTML=`
      <div class="word-heading"><span>${tie?'tie-break round':sunday?'Sunday challenge':'your guesses'}</span><span>${sunday?'2× points':`${guesses.length} / 5`}</span></div>
      <div class="word-grid" role="group" aria-label="Five guesses">${Array.from({length:5},(_,row)=>{
        const text=guesses[row]||(!done&&row===guesses.length?draft:'');
        return `<div class="word-row" aria-label="Guess ${row+1}">${Array.from({length:5},(_,i)=>`<span class="word-tile ${marks[row]?.[i]||''}" aria-label="${text[i]?escapeHtml(text[i].toUpperCase())+', '+(marks[row]?.[i]||'not submitted'):'empty'}">${escapeHtml(text[i]||'')}</span>`).join('')}</div>`;
      }).join('')}</div>
      <p class="word-message" role="status" aria-live="polite">${escapeHtml(error||(!navigator.onLine?'Offline. Reconnect to save your guess.':busy?'saving your guess…':!ready()?'getting today’s word…':mine?.won?'nicely done ♡':done?`The word was ${puzzle.word.toUpperCase()}.`:' '))}</p>
      ${syncFailure?'<button type="button" data-word-retry>retry sync</button>':''}
      ${!done?`<div class="word-keyboard" aria-label="Word keyboard">${['qwertyuiop','asdfghjkl','↵zxcvbnm⌫'].map(row=>`<div>${[...row].map(letter=>`<button type="button" data-key="${letter}" class="${keys[letter]||''} ${letter==='↵'||letter==='⌫'?'wide-key':''}" aria-label="${letter==='↵'?'Submit guess':letter==='⌫'?'Delete letter':letter.toUpperCase()+(keys[letter]?', '+({correct:'right spot',present:'in the word',absent:'not in the word'}[keys[letter]]):', not tried')}" ${disabled?'disabled':''}>${letter==='↵'?'enter':letter}</button>`).join('')}</div>`).join('')}</div>`:''}
      <div class="word-legend"><span><i class="word-tile correct">A</i>right spot</span><span><i class="word-tile present">A</i>in the word</span><span><i class="word-tile absent">A</i>not in the word</span></div>
      <p class="word-partner">${partnerLabel()}</p>`;
    if(focused)host.querySelector(`[data-key="${focused}"]`)?.focus({preventScroll:true});
    if(!tie)renderScoreboard();
  }
  function partnerLabel(){
    const result=results.find(r=>r.day===day&&r.person===other),name=escapeHtml(personName(other));
    if(!loaded.has('wordResults'))return 'checking the other side…';
    if(!result)return name+' hasn’t tried yet';
    if(!result.done)return name+` · ${result.attempts} / 5 tries`;
    return name+(result.won?` solved in ${result.attempts} · ${wordPoints(result)} points`:' · no luck today');
  }
  function renderScoreboard(){
    const rawRecord=weeks.find(w=>w.week===week.start),record=rawRecord?normalizeWeekRecord(rawRecord):null,scores=normalizeWeekRecord(rawRecord,scoreWeek(day,results));
    const previous=weeks.map(w=>normalizeWeekRecord(w)).filter(w=>w.week<week.start).sort((a,b)=>b.week.localeCompare(a.week))[0];
    const champion=previous?'<p class="last-champion">Last week: '+(previous.winners.length?previous.winners.map(p=>escapeHtml(personName(p))).join(' & ')+' ♛':'no winner')+' · ☀ '+(previous.scores?.her||0)+' – ☾ '+(previous.scores?.him||0)+'</p>':'';
    document.getElementById('weekly-score').textContent=`☀ ${scores.scores.her} · ☾ ${scores.scores.him}`;
    document.getElementById('weekly-board').innerHTML=`<p>${week.start} — ${week.end}</p><div class="word-score-pair">${['her','him'].map(person=>`<div><img src="${person==='her'?'sun':'moon'}-profile.png" alt=""><strong>${escapeHtml(personName(person))}</strong><b>${scores.scores[person]} <small>pts</small></b></div>`).join('')}</div>${champion}<p>${record?(record.winners.length?record.winners.map(p=>escapeHtml(personName(p))).join(' & ')+' take the crown ♛':'A quiet week. The crown rests.'):'5 / 4 / 3 / 2 / 1 points. Sunday counts double.'}</p><div class="word-week-days">${week.days.map(date=>`<span><b>${new Intl.DateTimeFormat('en',{weekday:'short',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'))}</b><small>☀ ${wordPoints(results.find(r=>r.day===date&&r.person==='her'))} · ☾ ${wordPoints(results.find(r=>r.day===date&&r.person==='him'))}</small></span>`).join('')}</div>`;
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
      draft='';
    }catch(problem){
      if(pendingGuess){
        syncFailure=!/other screen|finished|closed/.test(problem.message);
        error=!syncFailure?problem.message:problem.message==='confirmation timeout'?'Still waiting for confirmation. Retry sync before trying again.':'That guess didn’t save. Check your connection and try again.';
      }
    }
    finally{busy=false;render();}
  }
  host.addEventListener('click',event=>{const button=event.target.closest('[data-key]');if(button)void key(button.dataset.key);if(event.target.closest('[data-word-retry]'))read();});
  const keydown=event=>{
    if(activeBoard!==host)return;
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
  return ()=>{disposed=true;if(activeBoard===host)activeBoard=null;unsub.forEach(stop=>stop());clearTimeout(timer);clearInterval(interval);disclosure.removeEventListener('toggle',opened);removeEventListener('online',resume);removeEventListener('offline',render);removeEventListener('littlelist:profile',render);document.removeEventListener('keydown',keydown);document.removeEventListener('visibilitychange',visible);};
}

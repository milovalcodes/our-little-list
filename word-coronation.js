import { personName } from './profile-store.js';
import { normalizeWeekRecord, reigningCrowns } from './word-scores.js';
import { scatterWordConfetti } from './word-celebration.js';

const seen=new Set();
// Only settled weeks can reach the ceremony. A pending tie has no winner yet.
export function coronationCandidate(records,now=Date.now()) {
  const latest=records.filter(w=>/^\d{4}-\d{2}-\d{2}$/.test(w?.week)).sort((a,b)=>b.week.localeCompare(a.week))[0];
  if(!latest||!Number.isFinite(latest.settledAt)||latest.settledAt>now||now-latest.settledAt>7*86400000)return null;
  const week=normalizeWeekRecord(latest);
  if(week.winners.length!==1)return null;
  return {...week,winner:week.winners[0],streak:reigningCrowns(records)[week.winners[0]]||1};
}

export function createWordCoronation(person) {
  let records=[],checkTimer=null,dialog=null,frame=null,revealTimer=null,finishTimer=null,returnFocus=null,disposed=false;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function key(week){return `our-little-list-coronation-v1:${person}:${week}`;}
  function alreadySeen(week){try{return seen.has(key(week))||Boolean(localStorage.getItem(key(week)));}catch(_){return seen.has(key(week));}}
  function schedule(){clearTimeout(checkTimer);if(!disposed)checkTimer=setTimeout(check,1200);}
  function occupied(){return document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')||document.activeElement?.closest('.word-keyboard')||document.querySelector('dialog[open],.app-sheet:not([hidden]),.word-finale,.timed-playing');}
  function check(){
    const week=coronationCandidate(records);
    if(disposed||!['her','him'].includes(person)||!week||alreadySeen(week.week)||dialog)return;
    if(document.hidden)return;
    if(occupied()){schedule();return;}
    const claim=()=>{
      if(disposed||alreadySeen(week.week)||dialog||document.hidden)return;
      if(occupied()||coronationCandidate(records)?.week!==week.week){schedule();return;}
      show(week);
    };
    if(navigator.locks)void navigator.locks.request(key(week.week),claim).catch(()=>{});else claim();
  }
  function show(week){
    // Claim before showing: subsequent snapshots and navigation must not replay.
    seen.add(key(week.week));try{localStorage.setItem(key(week.week),'seen');}catch(_){}
    if(!returnFocus)returnFocus=document.activeElement;
    dialog=document.createElement('dialog');dialog.className='word-coronation';
    dialog.setAttribute('aria-labelledby','word-coronation-title');
    dialog.innerHTML='<div class="coronation-sky" aria-hidden="true"><span>✦ · ✧ · ✦</span></div><p class="coronation-week"></p><h2 id="word-coronation-title">a crown needs a home</h2><div class="coronation-scores"></div><div class="coronation-winner"><div class="coronation-portrait"><img alt=""><span class="coronation-crown" aria-hidden="true">♛</span></div><h3></h3><p class="coronation-streak"></p></div><p class="coronation-result" role="status" aria-live="polite"></p><button type="button" class="coronation-close">skip animation</button>';
    dialog.querySelector('.coronation-week').textContent=(week.format==='trio'?'Daily games':'Little Word')+' · week of '+week.week;
    for(const side of ['her','him']){
      const card=document.createElement('div');card.className='coronation-score';
      const name=document.createElement('span');name.textContent=personName(side);
      const score=document.createElement('strong');score.dataset.score=side;score.textContent=motion.matches?String(week.scores[side]):'0';score.setAttribute('aria-label',`${week.scores[side]} points`);
      card.append(name,score);dialog.querySelector('.coronation-scores').append(card);
    }
    const portrait=dialog.querySelector('img');portrait.src=(week.winner==='her'?'sun':'moon')+'-profile.png';
    portrait.alt=personName(week.winner);
    dialog.querySelector('.coronation-winner h3').textContent=personName(week.winner);
    dialog.querySelector('.coronation-streak').textContent=week.streak>1?`${week.streak} weeks on the throne. getting comfortable?`:'a new reign begins ♡';
    dialog.style.setProperty('--crown-scale',String(1+Math.min(week.streak-1,4)*.08));
    if(week.streak>1){const count=document.createElement('small');count.textContent=String(week.streak);dialog.querySelector('.coronation-crown').append(count);}
    const close=()=>{cleanup();if(returnFocus?.isConnected)returnFocus.focus?.({preventScroll:true});returnFocus=null;};
    dialog.querySelector('button').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    document.body.append(dialog);document.body.classList.add('has-word-coronation');dialog.showModal();
    dialog.querySelector('button').focus({preventScroll:true});
    const reveal=()=>{
      if(!dialog)return;
      dialog.classList.add('is-crowned');
      dialog.querySelector('h2').textContent=week.streak>1?'the crown stays put':'all hail the word nerd';
      dialog.querySelector('.coronation-result').textContent=personName(week.winner)+' takes the crown'+(week.tieRound?' after the tie-break':'')+'!';
      if(!motion.matches){const confetti=document.createElement('div');confetti.className='coronation-confetti';scatterWordConfetti(confetti,84);dialog.append(confetti);}
    };
    const finish=()=>{if(dialog){dialog.classList.add('is-finished');dialog.querySelector('button').textContent='back to our day';dialog.querySelector('.coronation-confetti')?.remove();}};
    if(motion.matches){reveal();finish();return;}
    const start=performance.now();
    const count=now=>{
      if(!dialog)return;
      const progress=Math.min(1,(now-start)/1500),ease=1-(1-progress)**3;
      for(const el of dialog.querySelectorAll('[data-score]'))el.textContent=String(Math.round(week.scores[el.dataset.score]*ease));
      if(progress<1)frame=requestAnimationFrame(count);
    };
    frame=requestAnimationFrame(count);
    revealTimer=setTimeout(reveal,1800);finishTimer=setTimeout(finish,5300);
  }
  function cleanup(){clearTimeout(revealTimer);clearTimeout(finishTimer);cancelAnimationFrame(frame);dialog?.close();dialog?.remove();dialog=null;document.body.classList.remove('has-word-coronation');}
  function calmDown(){if(!motion.matches||!dialog)return;const week=coronationCandidate(records);cleanup();if(week)show(week);}
  motion.addEventListener('change',calmDown);
  document.addEventListener('visibilitychange',schedule);
  return { update(items){records=items;schedule();}, dispose(){disposed=true;clearTimeout(checkTimer);cleanup();returnFocus=null;motion.removeEventListener('change',calmDown);document.removeEventListener('visibilitychange',schedule);} };
}

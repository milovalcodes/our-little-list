const remembered = new Set();

export function scatterWordConfetti(layer,count) {
  for(let i=0;i<count;i++){
    const piece=document.createElement('i');piece.className='word-confetti';
    piece.style.setProperty('--x',`${(i*37)%100}%`);
    piece.style.setProperty('--drift',`${(i%2?1:-1)*(24+(i*13)%100)}px`);
    piece.style.setProperty('--delay',`${(i%9)*45}ms`);
    piece.style.setProperty('--fall',`${1800+(i%7)*130}ms`);
    piece.style.setProperty('--spin',`${(i%2?1:-1)*(180+(i%5)*90)}deg`);
    piece.style.setProperty('--ink',`var(--word-party-${i%4+1})`);
    layer.append(piece);
  }
}

export function wordFinish(game) {
  if (!game?.done) return null;
  if (!game.won) return { tier:'miss', icon:'☹', text:'you did your best :c', pieces:0, duration:2500 };
  if (game.guesses.length === 1) return { tier:'jackpot', icon:'☀︎ ✦ ☾', text:'how did you even do that?!', pieces:64, duration:3600 };
  if (game.guesses.length === 2) return { tier:'brilliant', icon:'✦', text:'two tries?! that was good.', pieces:24, duration:2800 };
  return { tier:'win', icon:'♡', text:'good job ♡', pieces:0, duration:1900 };
}

// A separate, short-lived layer: board redraws can never restart the animation.
// Call only after a guess from this screen is confirmed, never on initial load.
export function createWordCelebration(host, person, day) {
  const key=`our-little-list-word-finish-v1:${person}:${day}`;
  let layer=null, timer=null;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function clear() { clearTimeout(timer); timer=null; layer?.remove(); layer=null; }
  function stopWhenHidden() { if(document.hidden)clear(); }
  function motionChanged() { if(motion.matches)clear(); }
  document.addEventListener('visibilitychange',stopWhenHidden);
  motion.addEventListener('change',motionChanged);
  return {
    play(game) {
      const finish=wordFinish(game);
      if(!finish||remembered.has(key))return;
      try { if(localStorage.getItem(key))return; localStorage.setItem(key,'seen'); } catch (_) { /* private browsing */ }
      remembered.add(key);
      // The permanent result text still appears with reduced motion, when
      // returning to a background tab, or when this board is folded away.
      if(motion.matches||document.hidden||!host.isConnected||!host.getClientRects().length)return;
      clear();
      layer=document.createElement('div');
      layer.className=`word-finale word-finale-${finish.tier}`;
      layer.setAttribute('aria-hidden','true');
      const card=document.createElement('div');card.className='word-finale-card';
      const icon=document.createElement('span');icon.className='word-finale-icon';icon.textContent=finish.icon;
      const title=document.createElement('strong');title.textContent=finish.text;
      card.append(icon,title);layer.append(card);
      scatterWordConfetti(layer,finish.pieces);
      document.body.append(layer);
      timer=setTimeout(clear,finish.duration);
    },
    dispose() { clear(); document.removeEventListener('visibilitychange',stopWhenHidden); motion.removeEventListener('change',motionChanged); }
  };
}

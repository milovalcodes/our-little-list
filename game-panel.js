import { sharedLayer } from './data-hub.js';
import { awaitViewer, partnerOf } from './viewer.js';
import { personName } from './profile-store.js';
import { escapeHtml } from './ui-helpers.js';
import { GAME_ID, gameResult } from './couple-game.js';

const host=document.getElementById('game');
if(host)void start();
async function start(){
  const data=await sharedLayer();
  const viewer=await awaitViewer();
  if(!viewer)return;
  const other=partnerOf(viewer);
  let game=null, loaded=false, busy=false, expanded=false, folded=false, error='', confirmClose=false, selected='';
  const wantsGame=()=>/^#game(?:-[A-Za-z0-9_-]+)?$/.test(location.hash);
  data.listenTo('games', items=>{
    const next=items.find(item=>item.id===GAME_ID)||null;
    if(next?.round!==game?.round||next?.ply!==game?.ply){selected='';folded=false;confirmClose=false;}
    game=next;loaded=true;
    if(error.startsWith('Still connecting'))error='';
    render();
  });
  window.addEventListener('hashchange',()=>{expanded=wantsGame();folded=false;render();if(expanded)host.scrollIntoView({block:'center'});});
  window.addEventListener('littlelist:profile',render);
  window.addEventListener('offline',render);
  window.addEventListener('online',render);
  const loadingTimer=setTimeout(()=>{if(!loaded){error='Still connecting. Check your internet, then reopen Today.';render();}},10000);
  function render(){
    if(loaded)clearTimeout(loadingTimer);
    const result=gameResult(game), active=game&&!result.over;
    const count=game?.ply||0;
    const shifting=Object.values(game?.board||{}).filter(person=>person===viewer).length===3;
    const matchWon=result.winner&&game.score[result.winner]===3;
    const show=!folded&&(expanded||wantsGame()||(active&&game.turn===viewer));
    const yourTurn=active&&game.turn===viewer;
    const label=!loaded?'connecting…':!game?'a tiny game for two':game.closed?'put away for now':result.winner?`${result.winner===viewer?'you':personName(result.winner)} ${matchWon?'won the match 🏆':'took the round ✦'}`:result.draw?'a draw. suspiciously diplomatic.':yourTurn?'your turn':`waiting for ${personName(other)}`;
    const stale=/^#game-(.+)$/.exec(location.hash)?.[1];
    host.innerHTML=`<div class="today-card-head"><div><h2>Sun vs Moon</h2><p class="game-status" role="status">${escapeHtml(label)}</p></div><button type="button" data-game="expand" aria-expanded="${show}">${show?'fold':'play'}</button></div>
      ${show?`<div class="game-content">${stale&&stale!==game?.round&&loaded?'<p class="game-hint">That ping was for an older round. This is the latest board.</p>':''}
      <p class="game-hint">First to 3 rounds wins the match. No rush between turns.</p>
      <div class="game-players">${['her','him'].map(person=>`<div class="game-player ${game?.turn===person&&active?'is-turn':''}"><strong>${person==='her'?'☀︎':'☾'} ${escapeHtml(personName(person))}</strong><span class="game-score" aria-label="${game?.score[person]||0} rounds won">${[0,1,2].map(i=>`<i class="${i<(game?.score[person]||0)?'scored':''}"></i>`).join('')}</span><small>${game?.wins[person]||0} ${game?.wins[person]===1?'match':'matches'}</small></div>`).join('')}</div><p class="game-hint" role="status">${yourTurn?(shifting?(selected?'now tap an empty square':'pick one of your pieces to move'):'tap an empty square'):''}</p>
      ${game?`<div class="couple-board" role="group" aria-label="Sun vs Moon board">${Array.from({length:9},(_,cell)=>{const person=game.board[cell];return `<button type="button" data-cell="${cell}" ${busy||!yourTurn||(person&&!(person===viewer&&shifting))||!navigator.onLine?'disabled':''} aria-pressed="${selected===String(cell)}" class="${result.line.includes(cell)?'winning-cell':''} ${selected===String(cell)?'selected-piece':''}" aria-label="Row ${Math.floor(cell/3)+1}, column ${cell%3+1}: ${person?escapeHtml(personName(person)):'empty'}">${person?`<span class="game-token ${person}" aria-hidden="true">${person==='her'?'☀':'☾'}</span>`:''}</button>`;}).join('')}</div>`:''}
      <div class="game-actions">${!active?`<button class="primary-action" type="button" data-game="start" ${!loaded||busy||!navigator.onLine?'disabled':''}>${busy?'connecting…':matchWon?'invite to a rematch':game?'next round':`invite ${escapeHtml(personName(other))}`}</button>`:`<button type="button" data-game="close" ${busy?'disabled':''}>${confirmClose?'yes, end this round':'put this round away'}</button>${confirmClose?'<button type="button" data-game="cancel">keep playing</button>':''}`}</div>
      ${active&&!count?'<p class="game-hint">The invited person goes first. Either of you can put the round away.</p>':''}<details class="game-rules"><summary>how to play</summary><p>Take turns placing 3 pieces each. After that, tap one of yours and move it to any empty square. Get 3 in a row, across, down or diagonally. First to 3 rounds wins the match.</p><p>The invited person starts. A round draws after 30 turns. Putting it away gives neither person a point. There’s no timer.</p></details></div>`:''}
      ${!navigator.onLine?'<p class="game-hint">Offline — your board is saved. Reconnect to take a turn.</p>':''}
      ${busy?'<p class="game-hint" role="status">sending your move…</p>':''}
      ${error?`<p class="game-error" role="alert">${escapeHtml(error)}</p>`:''}`;
  }
  host.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||busy)return;
    const action=button.dataset.game;
    if(action==='expand'){
      const showing=button.getAttribute('aria-expanded')==='true';
      expanded=!showing;folded=showing;
      if(showing)history.replaceState(null,'',location.pathname+location.search);
      // Explicit folding lasts until the next board update.
      render();return;
    }
    if(action==='cancel'){confirmClose=false;render();return;}
    if(action==='close'&&!confirmClose){confirmClose=true;render();return;}
    if(!['start','close'].includes(action)&&button.dataset.cell===undefined)return;
    const cell=button.dataset.cell;
    if(cell!==undefined&&game?.board[cell]===viewer){selected=selected===cell?'':cell;error='';render();host.querySelector(`[data-cell="${cell}"]`)?.focus();return;}
    if(cell!==undefined&&Object.values(game?.board||{}).filter(person=>person===viewer).length===3&&!selected){error='Pick one of your pieces first, then an empty square.';render();return;}
    const options={action:action||'move',person:viewer,cell,fromCell:selected,expectedRound:game?.round||'',expectedPly:game?.ply,round:crypto.randomUUID(),now:Date.now()};
    busy=true;error='';confirmClose=false;expanded=true;render();
    try{
      const next=await data.playGame(options,personName(viewer));
      game={id:GAME_ID,...next};selected='';
      history.replaceState(null,'',`#game-${next.round}`);
    }catch(problem){error=problem?.code?'Couldn’t sync that move. Check your connection, then try again.':problem?.message||'Couldn’t sync that move. Try again.';}
    finally{busy=false;render();}
  });
  render();
}

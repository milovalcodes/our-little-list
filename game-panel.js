import { sharedLayer } from './data-hub.js';
import { awaitViewer, partnerOf } from './viewer.js';
import { personName } from './profile-store.js';
import { escapeHtml } from './ui-helpers.js';
import { GAME_ID, GAME_CATALOG, gameResult, gameRoute, gameHref } from './couple-game.js';
import { boxCounts } from './arcade-game.js';
import { watchGames } from './game-sync.js';

const host=document.getElementById('game');
if(host)void start();
async function start(){
  const data=await sharedLayer(), viewer=await awaitViewer();
  if(!viewer)return;
  const other=partnerOf(viewer);
  const rememberedKey=`littlelist-game-${viewer}`;
  let remembered='';try{remembered=sessionStorage.getItem(rememberedKey)||'';}catch(_){}
  let games=[], snapshotRevision=0, id=gameRoute(location.hash).id, loaded=false, busy=false, expanded=false, folded=false, error='', confirmClose=false, selected='', connection='connecting', chosen=false;
  let loadingTimer;
  const current=()=>games.find(item=>item.id===id)||null;
  const wantsGame=()=>/^#game(?:-[A-Za-z0-9_-]+)?$/.test(location.hash);
  watchGames(data, items=>{
    snapshotRevision++;
    if(!chosen&&!wantsGame()){
      const active=items.filter(game=>!gameResult(game).over);
      const preferred=active.find(game=>game.id===remembered)||active.find(game=>game.turn===viewer)||active[0];
      if(preferred){id=preferred.id;chosen=true;expanded=true;}
    }
    const before=current(),next=items.find(item=>item.id===id)||null;
    if(next?.round!==before?.round||next?.ply!==before?.ply){selected='';folded=false;confirmClose=false;}
    games=items;loaded=true;
    if(error.startsWith('Still connecting'))error='';
    render();
  },state=>{connection=state;render();});
  window.addEventListener('hashchange',()=>{if(wantsGame())id=gameRoute(location.hash).id;expanded=wantsGame();folded=false;selected='';error='';confirmClose=false;render();if(expanded)host.scrollIntoView({block:'center'});});
  window.addEventListener('littlelist:profile',render);
  window.addEventListener('offline',render);
  window.addEventListener('online',render);
  loadingTimer=setTimeout(()=>{if(!loaded){error='Still connecting. We’ll keep trying while this page is open.';render();}},10000);
  const token=person=>person?`<span class="game-token ${person}" aria-hidden="true">${person==='her'?'☀':'☾'}</span>`:'';
  function boardMarkup(game,result,yourTurn,shifting){
    const disabled=busy||connection!=='connected'||!yourTurn||!navigator.onLine;
    if(id==='connect-four')return `<div class="four-board" role="group" aria-label="Four in a Row board">${Array.from({length:7},(_,col)=>`<button type="button" class="four-column" data-cell="${col}" ${disabled||game.board[col]?'disabled':''} aria-label="Drop in column ${col+1}${game.board[col]?' (full)':''}"><span class="four-drop" aria-hidden="true">↓</span>${Array.from({length:6},(_,row)=>{const cell=row*7+col;return `<span class="four-slot ${result.line.includes(cell)?'winning-cell':''} ${game.lastCell===cell?'last-move':''}">${token(game.board[cell])}<span class="sr-only">Row ${row+1}: ${game.board[cell]?escapeHtml(personName(game.board[cell])):'empty'}.</span></span>`;}).join('')}</button>`).join('')}</div>`;
    if(id==='dots-boxes'){
      const counts=boxCounts(game);let board='';
      for(let row=0;row<7;row++)for(let col=0;col<7;col++){
        if(row%2===0&&col%2===0){board+='<span class="box-dot" aria-hidden="true"></span>';continue;}
        if(row%2&&col%2){const key=Math.floor(row/2)*3+Math.floor(col/2),owner=game.boxes[key];board+=`<span class="box-owned ${owner||''}" aria-label="Box ${key+1}: ${owner?escapeHtml(personName(owner)):'unclaimed'}">${token(owner)}</span>`;continue;}
        const horizontal=row%2===0,edge=horizontal?row/2*3+Math.floor(col/2):12+Math.floor(row/2)*4+col/2;
        const owner=game.board[edge];
        board+=`<button type="button" data-cell="${edge}" class="box-edge ${horizontal?'horizontal':'vertical'} ${owner||''} ${game.lastCell===edge?'last-move':''}" ${disabled||owner?'disabled':''} aria-label="${horizontal?'Horizontal':'Vertical'} line, row ${Math.floor(row/2)+1}, column ${Math.floor(col/2)+1}${owner?`: ${escapeHtml(personName(owner))}`:''}"><span aria-hidden="true"></span></button>`;
      }
      return `<p class="boxes-tally" aria-live="polite">☀︎ ${counts.her} <span>boxes</span> ☾ ${counts.him}</p><div class="boxes-board" role="group" aria-label="Dots and Boxes board">${board}</div>`;
    }
    return `<div class="couple-board" role="group" aria-label="Sun vs Moon board">${Array.from({length:9},(_,cell)=>{const person=game.board[cell];return `<button type="button" data-cell="${cell}" ${disabled||(person&&!(person===viewer&&shifting))?'disabled':''} aria-pressed="${selected===String(cell)}" class="${result.line.includes(cell)?'winning-cell':''} ${selected===String(cell)?'selected-piece':''}" aria-label="Row ${Math.floor(cell/3)+1}, column ${cell%3+1}: ${person?escapeHtml(personName(person)):'empty'}">${token(person)}</button>`;}).join('')}</div>`;
  }
  function render(){
    if(loaded)clearTimeout(loadingTimer);
    const game=current(),spec=GAME_CATALOG[id],result=gameResult(game),active=game&&!result.over;
    const shifting=id===GAME_ID&&Object.values(game?.board||{}).filter(person=>person===viewer).length===3;
    const matchWon=result.winner&&game.score[result.winner]===3;
    const show=!folded&&(expanded||wantsGame()||active);
    const yourTurn=active&&game.turn===viewer,pending=games.filter(g=>!gameResult(g).over&&g.turn===viewer).length;
    const label=!loaded?'connecting…':connection!=='connected'&&navigator.onLine?'syncing board…':!game?'pick a little rivalry':game.closed?'put away for now':result.winner?`${result.winner===viewer?'you':personName(result.winner)} ${matchWon?'won the match 🏆':'took the round ✦'}`:result.draw?'a draw. suspiciously diplomatic.':yourTurn?'your turn':`waiting for ${personName(other)}`;
    const stale=wantsGame()?gameRoute(location.hash).round:'';
    const hint=id==='connect-four'?'tap a column to drop your piece':id==='dots-boxes'?(game?.turn===game?.lastBy&&game?.ply?'box claimed. go again!':'tap a line · finish a box, go again'):shifting?(selected?'now tap an empty square':'pick one of your pieces to move'):'tap an empty square';
    const rules=id==='connect-four'?'Tap a column to drop a piece into its lowest empty space. Connect 4 across, down or diagonally. A full board without a line is a draw.':id==='dots-boxes'?'Take turns adding a line between two dots. Finish the fourth side of a box to claim it and take another turn. When all 9 boxes are claimed, whoever owns more wins. Watch out for long chains near the end.':'Take turns placing 3 pieces each. After that, tap one of yours and move it to any empty square. Get 3 in a row, across, down or diagonally. A round draws after 30 turns.';
    host.innerHTML=`<div class="today-card-head"><div><h2>Sun vs Moon</h2><p class="game-status" role="status">${escapeHtml(show?label:pending?`${pending} ${pending===1?'game needs':'games need'} your move`:label)}</p></div><button type="button" data-game="expand" aria-expanded="${show}">${show?'fold':'play'}</button></div>
      ${show?`<div class="game-content"><div class="game-picker" role="group" aria-label="Choose a game">${Object.entries(GAME_CATALOG).map(([key,item])=>{const board=games.find(g=>g.id===key),turn=board&&!gameResult(board).over&&board.turn===viewer;return `<button type="button" data-pick-game="${key}" aria-pressed="${id===key}" ${busy?'disabled':''}><strong>${item.name}</strong><small>${turn?'your turn':board&&!gameResult(board).over?'in play':'pick & play'}</small></button>`;}).join('')}</div>
      ${stale&&stale!==game?.round&&loaded?'<p class="game-hint">That ping was for an older round. This is the latest board.</p>':''}
      <p class="game-hint">First to 3 rounds. ${game?'':'Invite them to start.'}</p>
      <div class="game-players">${['her','him'].map(person=>`<div class="game-player ${game?.turn===person&&active?'is-turn':''}"><strong>${person==='her'?'☀︎':'☾'} ${escapeHtml(personName(person))}</strong><span class="game-score" aria-label="${game?.score[person]||0} rounds won">${[0,1,2].map(i=>`<i class="${i<(game?.score[person]||0)?'scored':''}"></i>`).join('')}</span><small>${game?.wins[person]||0} ${game?.wins[person]===1?'match':'matches'}</small></div>`).join('')}</div>
      <p class="game-hint game-turn-hint" role="status">${yourTurn?hint:active?`${escapeHtml(personName(other))} is up. Their move will appear here.`:''}</p>
      ${game?boardMarkup(game,result,yourTurn,shifting):`<div class="game-preview" aria-hidden="true">${spec.icon}</div>`}
      <div class="game-actions">${!active?`<button class="primary-action" type="button" data-game="start" ${!loaded||busy||connection!=='connected'||!navigator.onLine?'disabled':''}>${busy?'connecting…':matchWon?'invite to a rematch':game?'next round':`invite ${escapeHtml(personName(other))}`}</button>`:`<button type="button" data-game="close" ${busy||connection!=='connected'||!navigator.onLine?'disabled':''}>${confirmClose?'yes, end this round':'put this round away'}</button>${confirmClose?'<button type="button" data-game="cancel">keep playing</button>':''}`}</div>
      <details class="game-rules"><summary>how to play</summary><p>${rules}</p><p>First to 3 rounds wins the match; match wins are saved separately for each game. The invited person starts. Either of you can put a round away without awarding a point. There’s no timer.</p></details></div>`:''}
      ${!navigator.onLine?'<p class="game-hint">Offline — your board is saved. Reconnect to take a turn.</p>':''}
      ${navigator.onLine&&connection!=='connected'?'<p class="game-hint game-connection" role="status">Reconnecting the board… no need to refresh.</p>':''}
      ${busy?'<p class="game-hint" role="status">sending your move…</p>':''}
      ${error?`<p class="game-error" role="alert">${escapeHtml(error)}</p>`:''}`;
  }
  host.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||button.disabled||busy)return;
    const action=button.dataset.game;
    if(button.dataset.pickGame){
      id=button.dataset.pickGame;selected='';confirmClose=false;error='';expanded=true;folded=false;
      chosen=true;try{sessionStorage.setItem(rememberedKey,id);}catch(_){}
      history.replaceState(null,'',id===GAME_ID?'#game':`#game-${id}`);render();return;
    }
    if(action==='expand'){
      const showing=button.getAttribute('aria-expanded')==='true';expanded=!showing;folded=showing;
      if(showing)history.replaceState(null,'',location.pathname+location.search);
      render();return;
    }
    if(action==='cancel'){confirmClose=false;render();return;}
    if(action==='close'&&!confirmClose){confirmClose=true;render();return;}
    if(!['start','close'].includes(action)&&button.dataset.cell===undefined)return;
    if(connection!=='connected'){error='Wait for the board to reconnect, then try again.';render();return;}
    const game=current(),cell=button.dataset.cell;
    if(id===GAME_ID&&cell!==undefined&&game?.board[cell]===viewer){selected=selected===cell?'':cell;error='';render();host.querySelector(`[data-cell="${cell}"]`)?.focus();return;}
    if(id===GAME_ID&&cell!==undefined&&Object.values(game?.board||{}).filter(person=>person===viewer).length===3&&!selected){error='Pick one of your pieces first, then an empty square.';render();return;}
    const actingId=id,options={gameId:id,action:action||'move',person:viewer,cell,fromCell:selected,expectedRound:game?.round||'',expectedPly:game?.ply,round:crypto.randomUUID(),now:Date.now()};
    busy=true;error='';confirmClose=false;expanded=true;render();
    const beforeSave=snapshotRevision;
    try{
      const next=await data.playGame(options,personName(viewer));
      // A newer partner move can reach the listener before this acknowledgement.
      // The listener owns the board once it has delivered a fresh snapshot.
      if(snapshotRevision===beforeSave)games=[...games.filter(g=>g.id!==actingId),{id:actingId,...next}];
      selected='';
      if(id===actingId)history.replaceState(null,'',gameHref(current()||next).replace('today.html',''));
    }catch(problem){error=problem?.code?'Couldn’t sync that move. Check your connection, then try again.':problem?.message||'Couldn’t sync that move. Try again.';}
    finally{busy=false;render();}
  });
  render();
}

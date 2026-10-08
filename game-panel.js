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
  let games=[], snapshotRevision=0, id=gameRoute(location.hash).id, loaded=false, busy=false, error='', confirmClose=false, selected='', connection='connecting', rulesOpen=false;
  let loadingTimer;
  const current=()=>games.find(item=>item.id===id)||null;
  const wantsGame=()=>/^#game(?:-[A-Za-z0-9_-]+)?$/.test(location.hash);
  watchGames(data, items=>{
    snapshotRevision++;
    const before=current(),next=items.find(item=>item.id===id)||null;
    if(next?.round!==before?.round||next?.ply!==before?.ply){selected='';confirmClose=false;}
    games=items;loaded=true;
    if(error.startsWith('Still connecting'))error='';
    render();
  },state=>{connection=state;render();});
  window.addEventListener('hashchange',()=>{if(wantsGame())id=gameRoute(location.hash).id;selected='';error='';confirmClose=false;rulesOpen=false;render();});
  host.addEventListener('toggle',event=>{if(event.target.matches('.game-rules')&&event.target.isConnected)rulesOpen=event.target.open;},true);
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
  function miniBoard(key){
    return '<span class="game-cover cover-'+key+'" aria-hidden="true">'+Array.from({length:9},(_,i)=>'<i>'+((i===0||i===4)?'☀':i===2?'☾':'')+'</i>').join('')+'</span>';
  }
  function render(){
    if(loaded)clearTimeout(loadingTimer);
    const show=wantsGame(), game=current(), spec=GAME_CATALOG[id], result=gameResult(game), active=game&&!result.over;
    const yourTurn=active&&game.turn===viewer;
    const shifting=id===GAME_ID&&Object.values(game?.board||{}).filter(person=>person===viewer).length===3;
    const matchWon=result.winner&&game.score[result.winner]===3;
    const label=!loaded?'connecting…':connection!=='connected'&&navigator.onLine?'syncing board…':!game?'ready when you are':game.closed?'put away for now':result.winner?`${result.winner===viewer?'you':personName(result.winner)} ${matchWon?'won the match 🏆':'took the round ✦'}`:result.draw?'a draw. rematch?':yourTurn?'your turn':`waiting for ${personName(other)}`;
    document.querySelector('.game-room-intro')?.toggleAttribute('hidden',show);
    document.getElementById('daily')?.toggleAttribute('hidden',show);
    const stale=show?gameRoute(location.hash).round:'';
    const hint=id==='connect-four'?'tap a column':id==='dots-boxes'?(game?.turn===game?.lastBy&&game?.ply?'box claimed. go again!':'finish a box, take another turn'):shifting?(selected?'now tap an empty square':'pick a piece to move'):'tap an empty square';
    const rules=id==='connect-four'?'Drop a piece into a column. Connect 4 across, down or diagonally. A full board without a line is a draw.':id==='dots-boxes'?'Add a line between two dots. Finish the fourth side of a box to claim it and take another turn. Most boxes wins.':'Place 3 pieces each, then move one of yours to an empty square. Get 3 in a row. A round draws after 30 moves.';
    const notice=`${!navigator.onLine?'<p class="game-hint">Offline — your games are saved. Reconnect to play.</p>':''}${navigator.onLine&&connection!=='connected'?'<p class="game-hint game-connection" role="status">Reconnecting…</p>':''}${busy?'<p class="game-hint" role="status">sending your move…</p>':''}${error?`<p class="game-error" role="alert">${escapeHtml(error)}</p>`:''}`;
    if(!show){
      host.classList.add('is-game-shelf');
      host.innerHTML=`<div class="game-shelf" aria-label="Choose a game">${Object.entries(GAME_CATALOG).map(([key,item])=>{
        const board=games.find(g=>g.id===key),playing=board&&!gameResult(board).over;
        const turn=playing&&board.turn===viewer;
        const copy=!loaded?'loading…':playing?(turn?'your turn':`waiting for ${personName(other)}`):board&&!board.closed?'see result · play again':item.hint;
        return `<button type="button" class="game-shelf-item ${turn?'needs-move':''}" data-pick-game="${key}">${miniBoard(key)}<span><strong>${item.name}</strong><small>${escapeHtml(copy)}</small></span><i aria-hidden="true">›</i></button>`;
      }).join('')}</div>${notice}`;
      return;
    }
    host.classList.remove('is-game-shelf');
    host.innerHTML=`<button class="game-back" type="button" data-game="lobby">← activities</button>
      <div class="today-card-head"><div><h2>${spec.name}</h2><p class="game-status" role="status">${escapeHtml(label)}</p></div></div>
      <div class="game-content">
      ${stale&&stale!==game?.round&&loaded?'<p class="game-hint">That ping was for an older round. This is the latest board.</p>':''}
      <div class="game-players">${['her','him'].map(person=>`<div class="game-player ${game?.turn===person&&active?'is-turn':''}"><img src="${person==='her'?'sun':'moon'}-profile.png" alt=""><strong>${escapeHtml(personName(person))}</strong><span class="game-score" aria-label="${game?.score[person]||0} of 3 rounds won">${[0,1,2].map(i=>`<i class="${i<(game?.score[person]||0)?'scored':''}"></i>`).join('')}</span></div>`).join('')}</div>
      <p class="game-hint game-turn-hint" role="status">${yourTurn?hint:active?'their move will appear here':''}</p>
      ${game?boardMarkup(game,result,yourTurn,shifting):`<div class="game-preview">${miniBoard(id)}</div><p class="game-hint">${rules}</p>`}
      ${!active?`<div class="game-actions"><button class="primary-action" type="button" data-game="start" ${!loaded||busy||connection!=='connected'||!navigator.onLine?'disabled':''}>${busy?'connecting…':matchWon?'rematch':game?'next round':`invite ${escapeHtml(personName(other))}`}</button></div>`:''}
      <details class="game-rules" ${rulesOpen?'open':''}><summary>rules & round options</summary><p>${rules}</p><p>First to 3 rounds wins. The invited person starts. No timer.</p>
      <p>Matches won: ${escapeHtml(personName('her'))} ${game?.wins.her||0} · ${escapeHtml(personName('him'))} ${game?.wins.him||0}</p>
      ${active?`<div class="game-actions"><button type="button" data-game="close" ${busy||connection!=='connected'||!navigator.onLine?'disabled':''}>${confirmClose?'yes, end this round':'end this round'}</button>${confirmClose?'<button type="button" data-game="cancel">keep playing</button>':''}</div>`:''}</details></div>${notice}`;
  }
  host.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||button.disabled||busy)return;
    const action=button.dataset.game;
    if(button.dataset.pickGame){
      id=button.dataset.pickGame;selected='';confirmClose=false;error='';
      rulesOpen=false;
      history.pushState(null,'',id===GAME_ID?'#game':`#game-${id}`);render();return;
    }
    if(action==='lobby'){
      history.pushState(null,'',location.pathname+location.search);selected='';confirmClose=false;error='';rulesOpen=false;render();return;
    }
    if(action==='cancel'){confirmClose=false;render();return;}
    if(action==='close'&&!confirmClose){confirmClose=true;render();return;}
    if(!['start','close'].includes(action)&&button.dataset.cell===undefined)return;
    if(connection!=='connected'){error='Wait for the board to reconnect, then try again.';render();return;}
    const game=current(),cell=button.dataset.cell;
    if(id===GAME_ID&&cell!==undefined&&game?.board[cell]===viewer){selected=selected===cell?'':cell;error='';render();host.querySelector(`[data-cell="${cell}"]`)?.focus();return;}
    if(id===GAME_ID&&cell!==undefined&&Object.values(game?.board||{}).filter(person=>person===viewer).length===3&&!selected){error='Pick one of your pieces first, then an empty square.';render();return;}
    const actingId=id,options={gameId:id,action:action||'move',person:viewer,cell,fromCell:selected,expectedRound:game?.round||'',expectedPly:game?.ply,round:crypto.randomUUID(),now:Date.now()};
    busy=true;error='';confirmClose=false;render();
    const beforeSave=snapshotRevision;
    try{
      const next=await data.playGame(options,personName(viewer));
      // A newer partner move can reach the listener before this acknowledgement.
      // The listener owns the board once it has delivered a fresh snapshot.
      if(snapshotRevision===beforeSave)games=[...games.filter(g=>g.id!==actingId),{id:actingId,...next}];
      selected='';
      if(id===actingId)history.replaceState(null,'',gameHref(current()||next).replace('activities.html',''));
    }catch(problem){error=problem?.code?'Couldn’t sync that move. Check your connection, then try again.':problem?.message||'Couldn’t sync that move. Try again.';}
    finally{busy=false;render();}
  });
  render();
}

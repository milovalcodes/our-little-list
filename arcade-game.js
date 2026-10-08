// Original implementations of classic, public game mechanics. No APK code/assets.
export const ARCADE_MODES = {
  'connect-four': { name:'Four in a Row', icon:'▦', hint:'drop a piece · connect four', limit:42 },
  'dots-boxes': { name:'Dots & Boxes', icon:'⊡', hint:'close a box · steal another turn', limit:24 }
};
const other = side => side === 'her' ? 'him' : 'her';

export const FOUR_LINES = [];
for (let row=0;row<6;row++) for (let col=0;col<7;col++) {
  for (const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
    if (row+dr*3<6 && col+dc*3>=0 && col+dc*3<7) FOUR_LINES.push(Array.from({length:4},(_,i)=>(row+dr*i)*7+col+dc*i));
  }
}
// Horizontal edges 0..11 (four rows of three); vertical 12..23 (three rows of four).
export const BOX_EDGES = Array.from({length:9},(_,box)=>{
  const row=Math.floor(box/3),col=box%3;
  return [row*3+col,(row+1)*3+col,12+row*4+col,13+row*4+col];
});
export const boxCounts = game => ({her:Object.values(game?.boxes||{}).filter(s=>s==='her').length,him:Object.values(game?.boxes||{}).filter(s=>s==='him').length});
export function arcadeResult(game) {
  if (game.mode==='connect-four') {
    const line=FOUR_LINES.find(cells=>game.board[cells[0]] && cells.every(cell=>game.board[cell]===game.board[cells[0]]));
    if (line) return {over:true,winner:game.board[line[0]],line};
  } else if (game.ply===24) {
    const count=boxCounts(game);
    return {over:true,winner:count.her>count.him?'her':'him',line:[]};
  }
  return {over:game.closed||game.ply>=ARCADE_MODES[game.mode].limit,draw:!game.closed&&game.ply>=ARCADE_MODES[game.mode].limit,line:[]};
}

export function nextArcade(current, options) {
  const {action,person,cell,expectedRound,expectedPly,round,now=Date.now(),gameId}=options;
  if (!ARCADE_MODES[gameId]) throw new Error('Choose a game first.');
  if (!['her','him'].includes(person)) throw new Error('Sign in to play.');
  if (current && current.mode!==gameId) throw new Error('This is a different board. Reopen the game.');
  if ((current?.round||'')!==(expectedRound||'')) throw new Error('The board changed. Take another look.');
  if (action==='start') {
    if (current&&!arcadeResult(current).over) throw new Error('There’s already a round going.');
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(round||'')||round===current?.round) throw new Error('Try starting a fresh round.');
    const matchOver=current&&Math.max(current.score.her,current.score.him)>=3;
    return {mode:gameId,round,board:{},boxes:{},winner:'',turn:other(person),startedBy:person,lastBy:person,lastCell:-1,ply:0,
      score:!current||matchOver?{her:0,him:0}:{...current.score},wins:current?{...current.wins}:{her:0,him:0},createdAt:now,updatedAt:now,closed:false};
  }
  if (!current||arcadeResult(current).over) throw new Error('This round has ended.');
  if (current.ply!==expectedPly) throw new Error('The board changed. Take another look.');
  if (action==='close') return {...current,closed:true,lastBy:person,updatedAt:now};
  if (action!=='move'||current.turn!==person) throw new Error('It’s not your turn yet.');
  if (!/^\d+$/.test(String(cell))) throw new Error('Pick a space on the board.');
  let target=Number(cell);
  if (gameId==='connect-four') {
    if (target>6) throw new Error('Pick a column.');
    const column=target;
    target=Array.from({length:6},(_,i)=>(5-i)*7+column).find(key=>!current.board[key]);
    if (target===undefined) throw new Error('That column is full. Try another.');
  } else if (target>23||current.board[target]) throw new Error('That line is already taken.');
  const next={...current,board:{...current.board,[target]:person},boxes:{...current.boxes},turn:other(person),lastBy:person,lastCell:target,ply:current.ply+1,updatedAt:now,score:{...current.score},wins:{...current.wins}};
  if (gameId==='dots-boxes') {
    BOX_EDGES.forEach((edges,box)=>{if(!next.boxes[box]&&edges.every(edge=>next.board[edge]))next.boxes[box]=person;});
    if (Object.keys(next.boxes).length>Object.keys(current.boxes).length) next.turn=person;
  }
  const result=arcadeResult(next);
  next.winner=result.winner||'';
  // The final line need not belong to the person who captured the most boxes.
  if(result.winner){next.score[result.winner]++;if(next.score[result.winner]===3)next.wins[result.winner]++;}
  return next;
}

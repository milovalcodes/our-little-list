// A persistent viewport: typing and live updates may repaint the surrounding
// clues, but must not replace the surface holding a finger or reset its zoom.
let expandedPreferred=true;
export function createCrosswordViewport({keepTyping=()=>{}}={}){
 // Keep controls connected through saves and keystrokes. Replacing a pressed
 // key between pointerdown and pointerup loses fast taps on phones.
 function patch(node,next){
  if(node.nodeType!==next.nodeType||node.nodeName!==next.nodeName){node.replaceWith(next);return;}
  if(node.nodeType!==1){if(node.textContent!==next.textContent)node.textContent=next.textContent;return;}
  for(const attr of [...node.attributes])if(!next.hasAttribute(attr.name))node.removeAttribute(attr.name);
  for(const attr of next.attributes)if(node.getAttribute(attr.name)!==attr.value)node.setAttribute(attr.name,attr.value);
  const old=[...node.childNodes],fresh=[...next.childNodes];
  fresh.forEach((child,i)=>old[i]?patch(old[i],child):node.append(child));
  old.slice(fresh.length).forEach(child=>child.remove());
 }
 const dialog=document.createElement('dialog');dialog.className='crossword-play-dialog';dialog.setAttribute('aria-label','Crossword');
 const expand=document.createElement('button');expand.type='button';expand.className='crossword-expand';expand.textContent='Expand';
 const cluesToggle=document.createElement('button');cluesToggle.type='button';cluesToggle.className='crossword-clues-toggle';cluesToggle.textContent='Clues';cluesToggle.setAttribute('aria-expanded','false');
 const actions=document.createElement('div');actions.className='crossword-play-actions';actions.append(expand,cluesToggle);
 let host,viewRoot,inputControls,playing=false,cluesOpen=false;
 function showClues(show){cluesOpen=show;dialog.classList.toggle('show-clues',show);cluesToggle.setAttribute('aria-expanded',String(show));cluesToggle.textContent=show?'Grid':'Clues';}
 function viewportSize(){
  const viewport=window.visualViewport;
  dialog.style.setProperty('--crossword-screen-height',(viewport?.height||innerHeight)+'px');
  dialog.style.setProperty('--crossword-screen-top',(viewport?.offsetTop||0)+'px');
 }
 function restorePage(){
  if(dialog.open)return;
  document.documentElement.classList.toggle('crossword-play-open',Boolean(document.querySelector('.crossword-play-dialog[open]')));
  if(viewRoot?.parentNode===dialog){host.insertBefore(inputControls,dialog);host.insertBefore(viewRoot,dialog);}
  expand.textContent='Expand';cluesToggle.hidden=true;showClues(false);
 }
 function openPlay(){
  if(!playing||dialog.open||host.closest('[hidden]')||host.closest('details')?.open===false)return;
  viewportSize();dialog.append(inputControls,viewRoot);dialog.showModal();
  document.documentElement.classList.add('crossword-play-open');
  expand.textContent='Back';cluesToggle.hidden=false;
  viewRoot.querySelector('.cursor')?.focus({preventScroll:true});keepTyping();
 }
 function closePlay(){if(dialog.open)dialog.close();restorePage();viewRoot?.querySelector('.cursor')?.focus({preventScroll:true});}
 expand.addEventListener('click',()=>{expandedPreferred=!dialog.open;if(dialog.open)closePlay();else openPlay();});
 dialog.addEventListener('cancel',e=>{e.preventDefault();expandedPreferred=false;closePlay();});
 cluesToggle.addEventListener('pointerdown',e=>e.preventDefault());
 cluesToggle.addEventListener('click',()=>{showClues(!cluesOpen);keepTyping();});
 dialog.addEventListener('close',restorePage);
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-clue],[data-entry]')){showClues(false);keepTyping();}});
 window.visualViewport?.addEventListener('resize',viewportSize);
 window.visualViewport?.addEventListener('scroll',viewportSize);
 window.addEventListener('resize',viewportSize);
 const shell=document.createElement('section');shell.className='crossword-board';
 shell.innerHTML=`<div class="crossword-board-tools" role="group" aria-label="Board view"><button type="button" data-board-view="out" aria-label="Zoom out">−</button><output aria-label="Board zoom" aria-live="off">100%</output><button type="button" data-board-view="in" aria-label="Zoom in">+</button><button type="button" data-board-view="fit" aria-label="Fit whole board">Fit</button><button type="button" data-board-view="current" aria-label="Show current square" title="Current square">◎</button></div><div class="puzzle-scroll crossword-viewport" tabindex="0" role="region" aria-label="Crossword board. Drag to move, pinch to zoom. Use plus and minus to zoom, arrow keys to move."><div class="crossword-canvas"></div></div><p class="crossword-view-hint">Pinch to zoom · drag to move · tap a square to type</p>`;
 const pane=shell.querySelector('.crossword-viewport'),canvas=shell.querySelector('.crossword-canvas'),tools=shell.querySelector('.crossword-board-tools');
 const points=new Map();let grid,key,cell,word='',zoom=1,base=0,width=0,height=0,initialized=false,moved=false,suppressClick=false,disposed=false;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const maxZoom=()=>Math.max(3,Math.min(8,64*Number(grid?.style.getPropertyValue('--grid-size')||1)/Math.max(1,base)));
 const center=()=>{const r=pane.getBoundingClientRect();return {x:r.left+pane.clientLeft+pane.clientWidth/2,y:r.top+pane.clientTop+pane.clientHeight/2};};
 function controls(){
  tools.querySelector('output').value=Math.round(zoom*100)+'%';
  // Keep keyboard focus on the control at either limit.
  tools.querySelector('[data-board-view="out"]').setAttribute('aria-disabled',String(zoom<=1.001));
  tools.querySelector('[data-board-view="in"]').setAttribute('aria-disabled',String(zoom>=maxZoom()-.001));
  tools.querySelector('[data-board-view="current"]').hidden=!grid?.querySelector('.cursor:not(:disabled)');
 }
 function layout(){
  const size=base*zoom;
  grid.style.width=size+'px';grid.style.height=size+'px';
  grid.style.setProperty('--crossword-cell-size',size/Number(grid.style.getPropertyValue('--grid-size'))+'px');
  canvas.style.width=Math.max(pane.clientWidth,size+24)+'px';
  canvas.style.height=Math.max(pane.clientHeight,size+24)+'px';
  controls();
 }
 function zoomAt(next,from=center(),to=from){
  if(!initialized)return;
  const r=grid.getBoundingClientRect(),x=(from.x-r.left)/r.width,y=(from.y-r.top)/r.height;
  zoom=clamp(next,1,maxZoom());layout();
  const after=grid.getBoundingClientRect();
  pane.scrollLeft+=after.left+x*after.width-to.x;
  pane.scrollTop+=after.top+y*after.height-to.y;
 }
 function reveal(){
  const mark=grid?.querySelector('.cursor');if(!mark||!initialized)return;
  const a=mark.getBoundingClientRect(),b=pane.getBoundingClientRect(),left=b.left+pane.clientLeft,top=b.top+pane.clientTop;
  if(a.left<left+8)pane.scrollLeft-=left+8-a.left;else if(a.right>left+pane.clientWidth-8)pane.scrollLeft+=a.right-left-pane.clientWidth+8;
  if(a.top<top+8)pane.scrollTop-=top+8-a.top;else if(a.bottom>top+pane.clientHeight-8)pane.scrollTop+=a.bottom-top-pane.clientHeight+8;
 }
 function frameWord(){
  if(!initialized)return;
  const squares=[...grid.querySelectorAll('.chosen')].map(n=>n.getBoundingClientRect());
  if(squares.length){
   const paneRect=pane.getBoundingClientRect();
   const x=(Math.min(...squares.map(r=>r.left))+Math.max(...squares.map(r=>r.right)))/2;
   const y=(Math.min(...squares.map(r=>r.top))+Math.max(...squares.map(r=>r.bottom)))/2;
   pane.scrollLeft+=x-paneRect.left-pane.clientLeft-pane.clientWidth/2;
   pane.scrollTop+=y-paneRect.top-pane.clientTop-pane.clientHeight/2;
  }
  // A long word at a user's chosen zoom may not fit. Keep its cursor reachable.
  reveal();
 }
 function resize(){
  if(disposed||!grid||!pane.clientWidth||!pane.clientHeight)return;
  if(initialized&&width===pane.clientWidth&&height===pane.clientHeight)return;
  width=pane.clientWidth;height=pane.clientHeight;base=Math.max(1,Math.min(width,height)-24);
  if(!initialized){const cells=Number(grid.style.getPropertyValue('--grid-size'));zoom=base/cells>=28?1:clamp(32*cells/base,1,2);initialized=true;}
  zoom=clamp(zoom,1,maxZoom());layout();frameWord();
 }
 function fit(){if(!initialized)return;zoom=1;layout();pane.scrollLeft=0;pane.scrollTop=0;}
 function capture(id){try{pane.setPointerCapture(id);}catch(_){/* The pointer may have already ended. */}}
 const pair=()=>{const [a,b]=[...points.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};};
 function down(e){
  if(e.button>0||!initialized)return;
  // Panning from a wall or the padding must keep the phone input focused too.
  e.preventDefault();
  if(!points.size){moved=false;suppressClick=false;}
  points.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,target:e.target.closest('.puzzle-cell')});
  if(points.size>1){moved=true;suppressClick=true;for(const id of points.keys())capture(id);e.preventDefault();}
 }
 function move(e){
  const previous=points.get(e.pointerId);if(!previous)return;
  const before=points.size>1?pair():null;
  const dx=e.clientX-previous.x,dy=e.clientY-previous.y;
  points.set(e.pointerId,{...previous,x:e.clientX,y:e.clientY});
  if(before){const after=pair();zoomAt(zoom*after.distance/before.distance,before,after);}
  else {
   if(!moved&&Math.hypot(e.clientX-previous.startX,e.clientY-previous.startY)<6)return;
   if(!moved){capture(e.pointerId);pane.scrollLeft-=e.clientX-previous.startX;pane.scrollTop-=e.clientY-previous.startY;}
   else {pane.scrollLeft-=dx;pane.scrollTop-=dy;}
  }
  moved=true;suppressClick=true;pane.classList.add('is-panning');e.preventDefault();
 }
 function end(e){
  if(!points.has(e.pointerId))return;
  const target=points.get(e.pointerId).target;
  const tap=e.type==='pointerup'&&e.pointerType!=='mouse'&&!moved&&points.size===1;
  if(e.type==='pointercancel')suppressClick=true;
  points.delete(e.pointerId);
  if(pane.hasPointerCapture?.(e.pointerId))pane.releasePointerCapture(e.pointerId);
  if(!points.size)pane.classList.remove('is-panning');
  // Safari suppresses its compatibility click after a prevented touch down.
  // Activate a stationary touch exactly once, blocking any later native click.
  if(tap){e.preventDefault();suppressClick=true;if(target&&!target.disabled)target.click();}
 }
 function cancel(){
  const ids=[...points.keys()];points.clear();
  for(const id of ids)if(pane.hasPointerCapture?.(id))pane.releasePointerCapture(id);
  pane.classList.remove('is-panning');suppressClick=ids.length>0;
 }
 const click=e=>{if(suppressClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();}};
 const wheel=e=>{
  // Ordinary wheel movement pans the board natively. A trackpad pinch or
  // Ctrl+wheel zooms only this board.
  if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();
  const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?pane.clientHeight:1);
  zoomAt(zoom*Math.exp(-delta*.008),{x:e.clientX,y:e.clientY});
 };
 const command=action=>{if(action==='fit')fit();else if(action==='current')frameWord();else zoomAt(zoom*(action==='in'?1.25:.8));};
 const toolClick=e=>{const action=e.target.closest('[data-board-view]')?.dataset.boardView;if(action){command(action);keepTyping();}};
 const keyboard=e=>{
  if(e.target!==pane||e.ctrlKey||e.metaKey||e.altKey)return;
  if(['+','=','-','0','Home'].includes(e.key))command(e.key==='-'?'out':['0','Home'].includes(e.key)?'fit':'in');
  else if(e.key.startsWith('Arrow')){pane.scrollLeft+=({ArrowLeft:-40,ArrowRight:40}[e.key]||0);pane.scrollTop+=({ArrowUp:-40,ArrowDown:40}[e.key]||0);}
  else return;e.preventDefault();e.stopPropagation();
 };
 const preserveTyping=e=>{if(e.target.closest('[data-board-view]'))e.preventDefault();};
 pane.addEventListener('pointerdown',down);pane.addEventListener('pointermove',move);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])pane.addEventListener(name,end);
 pane.addEventListener('click',click,true);pane.addEventListener('wheel',wheel,{passive:false});pane.addEventListener('keydown',keyboard);
 tools.addEventListener('pointerdown',preserveTyping);tools.addEventListener('click',toolClick);
 // Resizing the canvas can affect the observed pane (especially in WebKit).
 // Apply those writes in the next frame, outside ResizeObserver delivery.
 let resizeFrame=0;
 const observer=new ResizeObserver(()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});});observer.observe(pane);
 const visibility=()=>{if(document.hidden)cancel();};document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',cancel);
 return {
  render(view,html,{puzzleKey,currentCell,revealCurrent=false}){
   const template=document.createElement('template');template.innerHTML=html;
   if(!host){host=view.parentNode;viewRoot=view;inputControls=host.querySelector('.game-input-controls');inputControls.prepend(actions);cluesToggle.hidden=true;host.append(dialog);}
   const active=Boolean(template.content.querySelector('.crossword-current')),starting=active&&!playing;playing=active;
   if(!active&&dialog.open){dialog.close();restorePage();}
   const freshPane=template.content.querySelector('.puzzle-scroll'),freshGrid=freshPane.querySelector('.crossword-grid');
   const changed=key!==puzzleKey;
   if(changed||!grid){cancel();key=puzzleKey;initialized=false;grid=freshGrid;canvas.replaceChildren(grid);}
   else {
    // Keep square nodes as well as the pane: a live save arriving between
    // pointerdown and pointerup must not turn a tap into a lost selection.
    for(let i=0;i<grid.children.length;i++){
     const old=grid.children[i],next=freshGrid.children[i];
     for(const attr of [...old.attributes])if(!next.hasAttribute(attr.name))old.removeAttribute(attr.name);
     for(const attr of next.attributes)if(old.getAttribute(attr.name)!==attr.value)old.setAttribute(attr.name,attr.value);
     if(old.innerHTML!==next.innerHTML)old.innerHTML=next.innerHTML;
    }
   }
   const old=[...view.childNodes],used=new Set();
   for(const fresh of [...template.content.childNodes]){
    let node=fresh===freshPane?shell:old.find(n=>!used.has(n)&&n!==shell&&n.nodeName===fresh.nodeName&&n.className===fresh.className);
    if(!node)node=fresh;else if(node!==shell)patch(node,fresh);
    used.add(node);
    // Do not detach an already correctly placed button (or its ancestors).
    const at=view.childNodes[used.size-1];if(at!==node)view.insertBefore(node,at||null);
   }
   old.filter(n=>!used.has(n)).forEach(n=>n.remove());
   if(starting&&expandedPreferred)openPlay();
   resize();controls();
   const nextWord=[...grid.querySelectorAll('.chosen')].map(n=>n.dataset.cell??n.dataset.square).join(',');
   if(!points.size){if(changed||word!==nextWord)frameWord();else if(cell!==currentCell||revealCurrent)reveal();}
   word=nextWord;
   cell=currentCell;
  },
  cancel,
  open(){if(expandedPreferred)openPlay();},
  finish(){playing=false;if(dialog.open){dialog.close();restorePage();}},
  dispose(){disposed=true;cancel();observer.disconnect();cancelAnimationFrame(resizeFrame);if(dialog.open)dialog.close();restorePage();dialog.remove();actions.remove();window.visualViewport?.removeEventListener('resize',viewportSize);window.visualViewport?.removeEventListener('scroll',viewportSize);window.removeEventListener('resize',viewportSize);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',cancel);shell.remove();}
 };
}

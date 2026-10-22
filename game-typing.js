// The game keys are sticky while a round is on; start the board at the top of
// the screen so they never open on top of it. Pass a function when the board
// may be redrawn before the next frame.
export function bringGameIntoView(target){
 const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
 requestAnimationFrame(()=>(typeof target==='function'?target():target)?.scrollIntoView?.({block:'start',behavior:motion}));
}
// Keep the real input outside the repainted board: replacing a focused input
// dismisses the iPhone keyboard after every letter.
export function createGameTyping(host,{label,onKey,enterLabel='Submit guess'}){
 const controls=document.createElement('div');controls.className='game-input-controls';controls.hidden=true;
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Use phone keyboard';toggle.setAttribute('aria-pressed','false');
 const field=document.createElement('label');field.className='game-native-field';field.hidden=true;
 const caption=document.createElement('span');caption.textContent='Tap to type';
 const input=document.createElement('input');input.type='text';input.inputMode='text';input.autocomplete='off';input.autocapitalize='characters';input.spellcheck=false;input.enterKeyHint='done';input.setAttribute('autocorrect','off');input.setAttribute('aria-label','Tap to type '+label+' letters');
 const submit=document.createElement('button');submit.type='button';submit.className='game-native-submit';submit.textContent=enterLabel;submit.hidden=true;
 field.append(caption,input);controls.append(toggle,field,submit);
 const view=document.createElement('div');view.className='game-board-content';host.replaceChildren(controls,view);
 let native=false,available=false,blocked=false;
 // The invisible sentinel gives iOS a character to delete even between keys.
 const reset=()=>{input.value='\u200b';input.setSelectionRange(1,1);};reset();
 const send=k=>{if(available&&!blocked)onKey(k);};
 submit.addEventListener('click',()=>send('↵'));
 const consume=event=>{if(event.isComposing)return;const text=input.value.replace(/[^a-z]/gi,'');reset();for(const letter of text)send(letter.toLowerCase());};
 input.addEventListener('input',consume);input.addEventListener('compositionend',consume);
 input.addEventListener('beforeinput',event=>{if(event.inputType?.startsWith('delete')){event.preventDefault();send('⌫');reset();}});
 input.addEventListener('keydown',event=>{if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;if(['Enter','Backspace','Delete'].includes(event.key)){event.preventDefault();event.stopPropagation();send(event.key==='Enter'?'↵':'⌫');reset();}});
 function focus(){if(native&&available&&!blocked)input.focus({preventScroll:true});}
 toggle.addEventListener('click',()=>{native=!native;host.classList.toggle('game-native-mode',native);toggle.textContent=native?'Game keys':'Use phone keyboard';toggle.setAttribute('aria-pressed',String(native));field.hidden=!native;submit.hidden=!native;if(native)focus();else input.blur();});
 // Prevent focus changes without losing Safari's touch activation. A prevented
 // touch down can suppress the compatibility click, so activate a stationary
 // touch on release and suppress a duplicate native click. The board handles
 // its own taps, drags and pinch gestures in crossword-viewport.js.
 let touch=null,lastTap=null;
 const preserve=event=>{
  lastTap=null;
  const button=event.target.closest('button');
  if(event.isPrimary===false){touch=null;return;}
  if(event.button>0)return;
  const typingArea=native&&available&&event.target.closest('.crossword-current,.crossword-clues,.crossword-focus,.word-grid');
  if(!button){if(typingArea)event.preventDefault();return;}
  if(!button.matches('.crossword-clues-toggle,[data-board-view],.game-native-submit')&&!typingArea)return;
  event.preventDefault();
  if(event.pointerType!=='mouse')touch={id:event.pointerId,button,x:event.clientX,y:event.clientY};
 };
 const move=event=>{if(touch?.id===event.pointerId&&Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>6){lastTap=touch.button;touch=null;}};
 const end=event=>{
  if(touch?.id!==event.pointerId)return;
  const tap=touch;touch=null;lastTap=tap.button;
  if(event.type!=='pointerup'||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>6||!tap.button.isConnected||tap.button.disabled)return;
  event.preventDefault();tap.button.click();
 };
 const click=event=>{if(lastTap&&event.detail!==0&&event.target.closest('button')===lastTap){event.preventDefault();event.stopImmediatePropagation();}};
 const clearTouch=()=>{touch=null;lastTap=null;};
 host.addEventListener('pointerdown',preserve);host.addEventListener('pointermove',move);
 for(const name of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(name,end);
 host.addEventListener('click',click,true);window.addEventListener('blur',clearTouch);
 return {view,get active(){return native&&available;},focus,
  update(show,disabled=false){available=show;blocked=disabled;controls.hidden=!show;input.readOnly=disabled;toggle.disabled=disabled;submit.disabled=disabled;if(!show)input.blur();},
  suspend(){clearTouch();input.blur();},dispose(){clearTouch();input.blur();host.removeEventListener('pointerdown',preserve);host.removeEventListener('pointermove',move);for(const name of ['pointerup','pointercancel','lostpointercapture'])host.removeEventListener(name,end);host.removeEventListener('click',click,true);window.removeEventListener('blur',clearTouch);host.classList.remove('game-native-mode');controls.remove();view.remove();}
 };
}

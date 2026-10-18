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
 submit.addEventListener('pointerdown',e=>e.preventDefault());submit.addEventListener('click',()=>send('↵'));
 const consume=event=>{if(event.isComposing)return;const text=input.value.replace(/[^a-z]/gi,'');reset();for(const letter of text)send(letter.toLowerCase());};
 input.addEventListener('input',consume);input.addEventListener('compositionend',consume);
 input.addEventListener('beforeinput',event=>{if(event.inputType?.startsWith('delete')){event.preventDefault();send('⌫');reset();}});
 input.addEventListener('keydown',event=>{if(event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;if(['Enter','Backspace','Delete'].includes(event.key)){event.preventDefault();event.stopPropagation();send(event.key==='Enter'?'↵':'⌫');reset();}});
 function focus(){if(native&&available&&!blocked)input.focus({preventScroll:true});}
 toggle.addEventListener('click',()=>{native=!native;host.classList.toggle('game-native-mode',native);toggle.textContent=native?'Game keys':'Use phone keyboard';toggle.setAttribute('aria-pressed',String(native));field.hidden=!native;submit.hidden=!native;if(native)focus();else input.blur();});
 // Selecting another square/clue should keep the phone keyboard open.
 const preserve=event=>{if(native&&available&&event.target.closest('.crossword-grid,.crossword-current,.crossword-clues,.crossword-focus,.word-grid'))event.preventDefault();};
 host.addEventListener('pointerdown',preserve);
 return {view,get active(){return native&&available;},focus,
  update(show,disabled=false){available=show;blocked=disabled;controls.hidden=!show;input.readOnly=disabled;toggle.disabled=disabled;submit.disabled=disabled;if(!show)input.blur();},
  suspend(){input.blur();},dispose(){input.blur();host.removeEventListener('pointerdown',preserve);host.classList.remove('game-native-mode');controls.remove();view.remove();}
 };
}

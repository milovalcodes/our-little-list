// Shared screen-filling layout for the existing minigames. No save/game changes.
let expanded=true;
try{expanded=localStorage.getItem('little-star-expanded-play')!=='false';}catch{}
function mountPlayView(){
 const screen=document.querySelector('#little-star-demo .arcade-screen[open]');
 if(!screen||screen.querySelector('[data-play-view]'))return;
 const bar=screen.querySelector('.arcade-topbar');if(!bar)return;
 const button=document.createElement('button');button.type='button';button.dataset.playView='';
 const paint=()=>{screen.dataset.expandedPlay=String(expanded);button.setAttribute('aria-pressed',String(expanded));button.textContent=expanded?'compact view':'expand game';button.setAttribute('aria-label',expanded?'Switch to compact game view':'Expand game to fill the screen');};
 button.onclick=()=>{window.dispatchEvent(new Event('star-play-view-change'));expanded=!expanded;try{localStorage.setItem('little-star-expanded-play',String(expanded));}catch{}paint();};
 (bar.querySelector('.arcade-tools')||bar).append(button);paint();
}
if(typeof MutationObserver!=='undefined'){
 new MutationObserver(mountPlayView).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 mountPlayView();
}

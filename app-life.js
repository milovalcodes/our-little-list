import {startInterfaceIcons} from './interface-icons.js';
startInterfaceIcons();
import {gameFeedback,comfortSettings,startGameComfort} from './game-comfort.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const moving=()=>!reduced.matches&&comfortSettings().motion&&!document.hidden;
const controls='button,a[href],summary,[role="button"]';
const gameTarget=node=>node.closest('#word-game,#practice-game,.timed-game,.word-coronation');
let lastPoint=null;
// The audio layer handles rate limits and lets a confirmed save outrank its tap.
function feedback(kind){gameFeedback(kind);}
function ripple(target,x,y){
 if(!moving()||!target.animate)return;
 const box=target.getBoundingClientRect(),dot=document.createElement('span');dot.className='life-tap';dot.setAttribute('aria-hidden','true');
 dot.style.left=(x??box.left+box.width/2)+'px';dot.style.top=(y??box.top+box.height/2)+'px';document.body.append(dot);
 const animation=dot.animate([{transform:'translate(-50%,-50%) scale(.3)',opacity:.5},{transform:'translate(-50%,-50%) scale(2.5)',opacity:0}],{duration:320,easing:'ease-out'});
 animation.finished.catch(()=>{}).finally(()=>dot.remove());
}
document.addEventListener('pointerup',e=>{const target=e.target.closest(controls);if(target&&!target.disabled&&!gameTarget(target)){lastPoint={x:e.clientX,y:e.clientY,at:performance.now()};ripple(target,e.clientX,e.clientY);}},{passive:true});
document.addEventListener('click',e=>{
 const target=e.target.closest(controls);
 if(!target||target.disabled||target.getAttribute('aria-disabled')==='true'||gameTarget(target)||target.closest('.game-comfort'))return;
 const kind=target.matches('[data-close-sheet]')?'close':target.matches('summary')?(target.closest('details')?.open?'close':'open'):target.matches('[data-open-sheet]')?'open':target.matches('a[href]')?'navigate':'tap';
 feedback(kind);
});
document.addEventListener('change',e=>{if(e.target.matches('input[type="checkbox"]')&&!e.target.closest('.game-comfort')&&!gameTarget(e.target))feedback(e.target.checked?'on':'off');});
document.addEventListener('littlelist:feedback',e=>{
 feedback(e.detail?.kind||'notice');
 if(e.detail?.kind!=='save'||!moving()||!lastPoint||performance.now()-lastPoint.at>4000)return;
 // Three tiny paper stars acknowledge a saved action; never a full-screen burst.
 for(let i=0;i<3;i++){
  const star=document.createElement('span');star.className='life-spark';star.textContent='✦';star.setAttribute('aria-hidden','true');star.style.left=lastPoint.x+'px';star.style.top=lastPoint.y+'px';document.body.append(star);
  star.animate([{transform:'translate(-50%,-50%) scale(.6)',opacity:1},{transform:`translate(${(i-1)*26-8}px,-45px) rotate(${(i-1)*35}deg) scale(.2)`,opacity:0}],{duration:560,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>star.remove());
 }
});
const captions={activities:'a little play, a little us',practice:'pick your pace. no clock or points.',tasks:'the little things, shared',notes:'a place to leave a little love',dates:'something to look forward to',memories:'the moments we get to keep',status:'two people, one little world', 'phone-check':'make yourself at home',guide:'a little help, whenever you need it'};
const hero=document.querySelector('.feature-hero'),page=document.body.hasAttribute('data-practice')?'practice':document.body.dataset.app;
if(hero&&captions[page]&&!hero.querySelector('.life-page-caption')){
 const caption=document.createElement('p');caption.className='life-page-caption';caption.textContent=captions[page];hero.append(caption);
}
// Nothing starts hidden. If JS, an observer or motion fails, every card stays
// fully readable. Only a short translation accompanies first arrival.
const seen=new WeakSet(),observer=new IntersectionObserver(entries=>{
 for(const {target,isIntersecting} of entries)if(isIntersecting){observer.unobserve(target);if(moving())target.animate([{translate:'0 7px'},{translate:'0 0'}],{duration:340,easing:'cubic-bezier(.2,.7,.2,1)'});}
},{threshold:.08});
function observe(){document.querySelectorAll('.app-shell>section,.app-shell>details').forEach(node=>{if(!seen.has(node)){seen.add(node);observer.observe(node);}});}
observe();const shell=document.querySelector('.app-shell');if(shell)new MutationObserver(observe).observe(shell,{childList:true});
const pause=()=>document.documentElement.classList.toggle('life-paused',document.hidden);
document.addEventListener('visibilitychange',pause);pause();
if(page==='phone-check'){
 const feel=document.createElement('section');feel.className='app-feel-settings game-comfort';feel.id='feel';document.querySelector('.settings-jump')?.after(feel);startGameComfort(feel,'App feel');
 const link=document.createElement('a');link.href='#feel';link.textContent='✦ app feel';document.querySelector('.settings-jump')?.append(link);
}

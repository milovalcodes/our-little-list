import { reigningCrowns } from './word-scores.js';
export function startWordCrowns(data){
  let crowns={her:0,him:0},frame=0;
  const badges=new Map();
  function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
  function paint(){
    frame=0;
    const images=[...document.querySelectorAll('img[src*="sun-profile"],img[src*="moon-profile"]')];
    const keep=new Set();
    for(const img of images){
      const side=img.getAttribute('src').includes('sun-profile')?'her':'him',streak=crowns[side]||0;
      const box=img.getBoundingClientRect();
      if(!streak||!box.width||!box.height||box.bottom<0||box.top>innerHeight||(img.checkVisibility&&!img.checkVisibility({checkVisibilityCSS:true})))continue;
      keep.add(img);
      let badge=badges.get(img);
      if(!badge){badge=document.createElement('span');badge.className='word-crown';badge.setAttribute('aria-hidden','true');const anchor=img.closest('.sky-avatar,.status-avatar');(anchor||document.body).append(badge);if(anchor)badge.classList.add('is-anchored');badges.set(img,badge);}
      const size=Math.min(24,Math.max(16,box.width*.32))+Math.min(streak-1,4)*2;
      badge.innerHTML='♛'+(streak>1?'<small>'+streak+'</small>':'');
      badge.style.cssText=badge.classList.contains('is-anchored')?`left:50%;top:${-size*.5}px;font-size:${size}px`:`left:${box.left+box.width/2}px;top:${box.top-size*.5}px;font-size:${size}px`;
      badge.title='Little Word champion · '+streak+' week'+(streak===1?'':'s')+' running';
    }
    for(const [img,badge] of badges)if(!keep.has(img)){badge.remove();badges.delete(img);}
  }
  data.listenTo('wordWeeks',items=>{crowns=reigningCrowns(items);schedule();});
  new MutationObserver(records=>{
    if(records.some(r=>!r.target.closest?.('.word-crown')&&(r.type==='attributes'||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('word-crown')))))schedule();
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','hidden','open']});
  addEventListener('scroll',schedule,true);addEventListener('resize',schedule);
  document.addEventListener('toggle',schedule,true);
}

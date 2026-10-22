// iOS can paint bottom-fixed controls halfway up a scrolling page (WebKit
// 301172). Anchor this one control in document coordinates instead, using the
// visible viewport. Other browsers keep native fixed positioning.
export function anchorDock(dock) {
  const appleTouch=/iPhone|iPad|iPod/.test(navigator.userAgent)||
    (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const viewport=window.visualViewport;
  if(!appleTouch||!viewport)return;
  dock.dataset.viewportAnchored='';
  let frame=0;
  const place=()=>{
    frame=0;
    if(!dock.offsetHeight||viewport.height<=0)return;
    // Rubber-band overscroll must not let this absolute element grow the page.
    const limit=Math.max(0,document.documentElement.scrollHeight-viewport.height);
    const pageTop=Math.max(0,Math.min(viewport.pageTop,limit));
    const bottom=pageTop+viewport.height-dock.offsetHeight;
    dock.style.top=`max(0px,calc(${bottom}px - var(--dock-bottom-gap)))`;
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(place);};
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('pageshow',schedule);
  viewport.addEventListener('scroll',schedule,{passive:true});
  viewport.addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  new ResizeObserver(schedule).observe(dock);
  place();
}

import {activityClock} from './activity-clock.js';
import {personalBadges,trioStreak} from './game-progress.js';
import {escapeHtml as esc} from './ui-helpers.js';
export function startPersonalProgress({data,viewer},host){
 if(!host)return ()=>{};
 let words=[],timed=[],ready=new Set();
 const paint=()=>{if(ready.size<2)return;const today=activityClock().day,streak=trioStreak(words,timed,viewer,today),badges=personalBadges(words,timed,viewer,today);host.innerHTML=`<h2>Your little milestones</h2><p>${streak.current} days with all three · ${streak.freezes} streak freeze${streak.freezes===1?'':'s'}</p><small>Play all three on five days in a week to earn a freeze. It protects one missed day, without adding points.</small><div class="game-badges">${badges.map(b=>`<span>${esc(b)}</span>`).join('')||'<span>Your first little milestone is waiting ✦</span>'}</div>`;};
 const stops=['wordResults','timedResults'].map(name=>data.listenToQuery(name,{where:{field:'person',value:viewer}},rows=>{if(name==='wordResults')words=rows;else timed=rows;ready.add(name);paint();},{onError:()=>{host.textContent='Progress will return when we reconnect.';}}));
 const timer=setInterval(paint,30000);return ()=>{stops.forEach(f=>f());clearInterval(timer);};
}

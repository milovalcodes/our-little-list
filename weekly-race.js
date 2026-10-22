import {activityWindow} from './activity-clock.js';
import {wordTable,doubledDay} from './word-scores.js';
import {timedMax} from './timed-game.js';
import {escapeHtml as esc} from './ui-helpers.js';

// Use only the spoiler-safe report. Hidden rounds retain their full ceiling,
// so a private result can never accidentally announce an unbeatable lead.
export function crownRace(report,today,now=Date.now()){
 const remaining={her:0,him:0};
 for(const entry of report.entries){
  if(entry.tie||now>=activityWindow(entry.day).closesAt)continue;
  for(const game of entry.games)for(const person of ['her','him']){
   const row=game.people[person];
   if(row.ended)continue;
   const max=game.type==='word'?wordTable(entry.day)[0]*(doubledDay(entry.day)?2:1):timedMax(entry.day);
   remaining[person]+=Math.max(0,max-row.points);
  }
 }
 const {her,him}=report.totals,leader=her===him?null:her>him?'her':'him';
 const secured=report.winner||(her>him+remaining.him?'her':him>her+remaining.her?'him':null);
 const index=report.days.indexOf(today),past=today>report.end;
 const elapsed=past?1:today<report.start?0:(index+.5)/7;
 const gap=Math.abs(her-him),chase=leader?remaining[leader==='her'?'him':'her']:0;
 const advantage=gap/(gap+chase||1);
 const positions={};
 for(const person of ['her','him']){
  const shift=leader?(person===leader?1:-1)*advantage*.22:0;
  positions[person]=secured===person?1:Math.max(.03,Math.min(.89,.06+elapsed*.77+shift));
 }
 return {remaining,leader,secured,positions,dayIndex:index,past,advantage};
}
const stops=[[45,249],[143,237],[247,218],[259,156],[151,146],[72,109],[154,59],[281,48]];
export function racePoint(progress){
 const n=Math.max(0,Math.min(1,progress))*7,i=Math.min(6,Math.floor(n)),f=n-i;
 return {x:stops[i][0]+(stops[i+1][0]-stops[i][0])*f,y:stops[i][1]+(stops[i+1][1]-stops[i][1])*f};
}
export function crownMap(report,race,name){
 const winner=race.secured,lead=race.leader;
 const title=winner?(race.past?`${name(winner)} has the crown`:`${name(winner)} has secured the crown`):lead?`${name(lead)} is out in front`:'Side by side, crown in sight';
 const subtitle=winner?(race.past?'This week belongs in the memory book.':'Just waiting for the coronation.'):race.past?'The finish is close. Waiting for the final result.':race.dayIndex===6?'The final stretch · Sunday counts double.':`${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][Math.max(0,race.dayIndex)]} on the trail · ${Math.max(0,6-race.dayIndex)} days still to play`;
 const path=stops.map(([x,y],i)=>(i?'L':'M')+x+','+y).join(' ');
 const portraits=globalThis.LittleSeasonAssets?.forSeason(globalThis.LittleSeason?.current||'normal')||{sun:'sun-profile.png',moon:'moon-profile.png'};
 const markers=['her','him'].map((person,i)=>{
  const point=racePoint(race.positions[person]),x=point.x+(winner===person?0:i===0?-9:9),y=point.y+(i===0?-10:10);
  return `<g class="crown-traveller traveller-${person}" data-racer="${person}" style="--marker-x:${x}px;--marker-y:${y}px"><circle r="20" fill="${person==='her'?'#f4bd62':'#b6b9e8'}"/><image href="${portraits[person==='her'?'sun':'moon']}" x="-18" y="-18" width="36" height="36" clip-path="url(#race-portrait)"/><title>${name(person)}${winner===person?' · crown secured':lead===person?' · leading':' · chasing'}</title></g>`;
 }).join('');
 return `<section class="crown-adventure ${winner?'crown-secured':''}" aria-label="Race to the Crown"><div class="crown-map-caption"><p class="tiny-kicker">${report.record?'the royal scrapbook':'this week’s adventure'}</p><h3>${title}</h3><p role="status">${subtitle}</p></div><svg class="crown-map" viewBox="0 0 330 290" role="img" aria-label="${esc(title.replace(/<[^>]*>/g,''))}. ${esc(subtitle)}"><defs><linearGradient id="race-land" x2="0" y2="1"><stop stop-color="#dcece8"/><stop offset="1" stop-color="#f8edc8"/></linearGradient><clipPath id="race-portrait"><circle r="18"/></clipPath></defs><rect width="330" height="290" rx="24" fill="url(#race-land)"/><g class="map-clouds" fill="#fff" opacity=".7"><ellipse cx="55" cy="37" rx="27" ry="8"/><ellipse cx="205" cy="25" rx="19" ry="6"/></g><path d="M0 165Q42 95 88 165T184 152T330 134V290H0Z" fill="#c5d9aa" opacity=".5"/><path d="M0 217Q70 179 130 221T330 201V290H0Z" fill="#adc893" opacity=".38"/><path d="M330 94Q228 68 222 110T135 185T0 186" fill="none" stroke="#a7d4dc" stroke-width="12" opacity=".5"/><g fill="#6c9474" opacity=".65">${[[28,95],[305,145],[185,188],[107,49],[38,202]].map(([x,y])=>`<path d="M${x} ${y-17}l-8 16h5l-7 12h20l-7-12h5Z"/><path d="M${x} ${y+8}v10" stroke="#79775c" stroke-width="3"/>`).join('')}</g><path d="${path}" stroke="#e3c994" stroke-width="23" stroke-linejoin="round" stroke-linecap="round" fill="none"/><path d="${path}" stroke="#fff1cf" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" fill="none"/><path d="${path}" stroke="#bba575" stroke-width="1.5" stroke-dasharray="2 8" fill="none"/>${stops.slice(0,7).map(([x,y],i)=>`<g><circle cx="${x}" cy="${y}" r="${i===race.dayIndex?10:7}" fill="${i<=race.dayIndex?'#c59954':'#f9efda'}" stroke="#ad915f" stroke-width="1.5"/><text x="${x}" y="${y+23}" text-anchor="middle" fill="#635942" font-size="9" font-family="Nunito,sans-serif" font-weight="800">${['MON','TUE','WED','THU','FRI','SAT','SUN'][i]}</text></g>`).join('')}<g class="map-crown" transform="translate(281 45)"><circle r="26" fill="#ffedac" opacity=".8"/><path d="M-17-8l8 7 9-15 9 15 8-7-4 22h-26Z" fill="#e8b851" stroke="#977038" stroke-width="2" stroke-linejoin="round"/><path d="M-12 8h24" stroke="#fff2b6" stroke-width="3"/><circle cy="2" r="3" fill="#e89c83"/></g>${markers}<g fill="#fff6c5" class="map-sparkles"><path d="M301 21v8m-4-4h8M256 17v6m-3-3h6M302 66v8m-4-4h8" stroke="currentColor" stroke-width="2"/></g></svg><div class="crown-map-legend"><span><i class="sun-dot"></i>${name('her')}</span><span><i class="moon-dot"></i>${name('him')}</span></div></section>`;
}

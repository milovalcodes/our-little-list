import {activityClock} from './activity-clock.js';
import {isRoutine,routineDue,checkedToday,listDay} from './list-schedule.js';
import {watchRoutineChecks} from './routine-checks.js';
import {timedOver} from './timed-game.js';
import {profileRoute} from './profile-route.js';

export function attentionCounts(b,viewer,seen={},now=Date.now()){
 const other=viewer==='her'?'him':'her',fresh=(row,section,field='createdAt')=>Number(row[field])>Number(seen[section]||0);
 const rows=name=>b[name]||[],day=listDay(now);
 const tasks=rows('items').filter(i=>!i.done&&(
  isRoutine(i)?b.routinesReady!==false&&routineDue(i,day)&&!checkedToday(i,rows('routineChecks'),day)
  :Boolean(i.due&&i.due<=day)||i.addedBy===other&&fresh(i,'tasks'))).length;
 const notes=rows('notes').filter(n=>(n.recipient||n.to)===viewer&&!n.read).length;
 const dates=rows('dates').filter(d=>d.addedBy===other&&!d.imported&&fresh(d,'dates')).length;
 const memories=rows('memories').filter(m=>m.addedBy===other&&fresh(m,'memories')).length;
 const status=rows('statuses').filter(s=>(s.person||s.id)===other&&['manual','custom','arrival','focus'].includes(s.updateKind)&&fresh(s,'status','updatedAt')).length;
 let activities=0;
 const activityDay=activityClock(now).day,question=rows('questions').find(q=>q.day===activityDay);
 if(b.dailyReady){
  if(question&&!question.answers?.[viewer]?.at)activities++;
  if((b.localPreview||rows('wordPuzzles').some(p=>p.day===activityDay))&&!rows('wordResults').some(r=>r.day===activityDay&&r.person===viewer&&r.done))activities++;
  for(const type of ['search','crossword'])if((b.localPreview||rows('timedPuzzles').some(p=>p.day===activityDay&&p.type===type))&&!rows('timedResults').some(r=>r.day===activityDay&&r.type===type&&r.person===viewer&&timedOver(r,now)))activities++;
 }
 return {tasks,notes,activities,dates,memories,status,more:dates+memories+status};
}

export function startNavigationAttention({data,viewer,page}){
 const b={localPreview:data.mode==='local',routinesReady:false},seen={},key='our-little-app-sections-seen:'+viewer;
 const readyCollections=new Set(),failedCollections=new Set(),stops=new Map(),versions=new Map();
 let dailyStops=[],day='',frame=0,iconCount=-1,dailyFailed=false;
 try{Object.assign(seen,JSON.parse(localStorage.getItem(key))||{});}catch(_){}
 function viewed(){
  if(document.hidden||!['tasks','dates','memories','status'].includes(page))return;
  if(page==='status'&&profileRoute(location.hash,viewer).person===viewer)return;
  if(!readyCollections.has({tasks:'items',status:'statuses'}[page]||page))return;
  seen[page]=Date.now();try{localStorage.setItem(key,JSON.stringify(seen));}catch(_){}
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
 function paint(){
  frame=0;const counts=attentionCounts(b,viewer,seen);
  const total=counts.tasks+counts.notes+counts.activities+counts.more;
  if(!document.hidden&&readyCollections.size===5&&b.routinesReady&&b.dailyReady&&total!==iconCount){
   iconCount=total;
   try{const operation=total?navigator.setAppBadge?.(total):navigator.clearAppBadge?.();operation?.catch?.(()=>{});}catch(_){}
  }
  for(const name of ['tasks','notes','activities','dates','memories','status','more']){
   const targets=name==='more'?document.querySelectorAll('.dock-item[data-open-sheet="more"]'):document.querySelectorAll(`.app-dock a[href="${name}.html"],.more-grid a[href="${name}.html"]`);
   for(const link of targets){
    let badge=link.querySelector('.attention-badge');
    if(!counts[name]){badge?.remove();continue;}
    if(!badge){badge=document.createElement('span');badge.className='attention-badge';badge.setAttribute('role','img');link.append(badge);}
    badge.setAttribute('aria-label',counts[name]+' waiting');badge.title=counts[name]+' waiting';
   }
  }
 }
 function listen(name){
  stops.get(name)?.();const version=(versions.get(name)||0)+1;versions.set(name,version);failedCollections.delete(name);
  const receive=rows=>{if(versions.get(name)!==version)return;b[name]=rows;readyCollections.add(name);viewed();schedule();};
  const onError=()=>{if(versions.get(name)!==version)return;delete b[name];readyCollections.delete(name);failedCollections.add(name);schedule();};
  let stop;
  if(name==='items')stop=data.listenToQuery(name,{where:{field:'done',value:false}},receive,{onError});
  // Legacy notes may omit read entirely; a read==false query excludes them.
  else if(name==='notes')stop=data.listenTo(name,receive,{onError});
  else if(name==='memories')stop=data.listenToQuery(name,{orderBy:{field:'createdAt',direction:'desc'},limit:50},receive,{onError});
  else stop=data.listenTo(name,receive,{onError});
  stops.set(name,stop);
 }
 ['items','notes','dates','memories','statuses'].forEach(listen);
 watchRoutineChecks(data,(rows,meta)=>{b.routineChecks=rows;b.routinesReady=meta.ready;schedule();},{onError:()=>{}});
 function daily(){
  const current=activityClock().day;
  if(current===day&&!dailyFailed){schedule();return;}
  day=current;dailyFailed=false;b.dailyReady=false;dailyStops.forEach(stop=>stop());dailyStops=[];
  const generation=dailyStops;
  const ready=new Set();
  for(const name of ['questions','wordResults','timedResults','wordPuzzles','timedPuzzles']){
   b[name]=[];
   dailyStops.push(data.listenToQuery(name,{where:{field:'day',value:day}},rows=>{
    if(dailyStops!==generation)return;b[name]=rows;ready.add(name);b.dailyReady=ready.size===5;schedule();
   },{onError:()=>{if(dailyStops!==generation)return;ready.delete(name);dailyFailed=true;b.dailyReady=false;schedule();}}));
  }
 }
 function refresh(){for(const name of [...failedCollections])listen(name);daily();}
 refresh();setInterval(refresh,30000);
 addEventListener('storage',e=>{if(e.key===key){try{Object.assign(seen,JSON.parse(e.newValue)||{});}catch(_){}schedule();}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){viewed();refresh();}});
 addEventListener('online',refresh);
 addEventListener('hashchange',()=>{viewed();schedule();});
}

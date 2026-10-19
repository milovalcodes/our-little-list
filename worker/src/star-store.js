// Server-owned nursery. No client snapshot, balance, clock or actor is accepted.
import {freshStar,projectStar,petSnapshot,applyAction,settleGrowth,servicePings,eggProgress,gameDay,clock,longRest} from '../../little-star/engine.mjs';
import {wordPoints} from '../../word-scores.js';
import {timedPoints} from '../../timed-game.js';

export const STAR_ACTIONS=new Set(['wish','incubate','hatch','visit','rename','feed','wash','cuddle','nap','wake','vacation','buy-food','buy-ingredients','coffee','start-cook','cook','cancel-cook','start-play','play','buy','equip','magic','transfer','goal','adopt-second','switch-pet','prefs']);
const clone=value=>structuredClone(value);
export function weekStart(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
function orient(state,petId){if(state.petId===petId||!state.otherPet)return state;if(state.otherPet.petId!==petId)throw Error('That star is not in this nursery.');const old=petSnapshot(state);return {...state,...state.otherPet,otherPet:old};}
function settle(state,now){let s=settleGrowth(state,now);if(s.otherPet){const other=settleGrowth({...s,...s.otherPet,otherPet:null},now);s.revision=Math.max(s.revision,other.revision);s.otherPet=petSnapshot(other);}return s;}
function view(record,actor,now){return {star:projectStar(orient(clone(record.state),record.selected[actor]),now),person:actor,now,weekly:record.weekly||{him:0,her:0},lastScoresAt:record.lastScoresAt||0};}
export function freshRecord(now){return {state:freshStar(now),selected:{him:'star-1',her:'star-1'},createdAt:now,firstDay:weekStart(gameDay(now)),lastScoresAt:0,weekly:{him:0,her:0},paid:{},pending:[],readySent:{}};}

export function creditResults(record,{words=[],timed=[]},now){
 const today=gameDay(now),monday=weekStart(today),weekly={him:0,her:0};let changed=false;
 for(const result of [...words.map(r=>({...r,game:'word'})),...timed.map(r=>({...r,game:r.type}))]){
  if(!['him','her'].includes(result.person)||!['word','crossword','search'].includes(result.game)||!/^\d{4}-\d{2}-\d{2}$/.test(result.day)||result.day<record.firstDay||result.day>today)continue;
  const points=result.game==='word'?wordPoints(result):timedPoints(result,now);
  if(!Number.isInteger(points)||points<0||points>200)continue;
  if(result.day>=monday)weekly[result.person]+=points;
  const key=`${result.day}:${result.game}:${result.person}`,paid=record.paid[key]||0;
  if(points>paid){const cash=Math.min(points-paid,999999-record.state.wallets[result.person]);record.paid[key]=points;record.state.wallets[result.person]+=cash;record.state.earnings.push({actor:result.person,kind:'daily',game:result.game,cash,points,at:now});changed=true;}
 }
 record.state.earnings=record.state.earnings.slice(-16);
 if(JSON.stringify(record.weekly)!==JSON.stringify(weekly))changed=true;
 record.weekly=weekly;record.lastScoresAt=now;if(changed)record.state.revision++;
}
export function collectStarPings(record,now){
 record.state=settle(record.state,now);
 const checked=servicePings(record.state,now);record.state=checked.state;
 const fresh=checked.newPings.map(p=>{const pet=[record.state,record.state.otherPet].find(s=>s?.petId===p.petId);return {...p,kind:p.kind==='care'?'star-care':'star-growth',cycles:Object.fromEntries((p.needs||[]).map(k=>[k,pet.needAlerts[k].cycle]))};});
 for(const pet of [record.state,record.state.otherPet].filter(Boolean)){
  if(pet.born||!eggProgress(pet,now).ready)continue;
  for(const to of ['him','her']){
   const key=`${pet.petId}:${pet.phaseAt}:${to}`,prefs=record.state.prefs[to],hour=clock(now).hour;
   if(record.readySent[key]||!prefs.enabled||!prefs.milestones||(prefs.quiet&&(hour>=22||hour<8)))continue;
   record.readySent[key]=true;fresh.push({id:'ready:'+key,petId:pet.petId,to,kind:'star-ready',at:now,title:'Your egg is ready',body:'Time to meet your little star.',route:'nursery',phaseAt:pet.phaseAt});
  }
 }
 for(const p of fresh)if(!record.pending.some(old=>old.id===p.id))record.pending.push(p);
 record.pending=record.pending.filter(p=>now-p.at<7*86400000).slice(-100);
}
export function starPingWanted(record,p,now){
 if(!record||!p)return false;
 const state=record.state,pet=[state,state.otherPet].find(s=>s?.petId===p.petId),prefs=state.prefs[p.to];
 if(!pet||pet.vacation||!prefs?.enabled||!prefs[p.kind==='star-care'?'care':'milestones'])return false;
 const current=projectStar({...state,...pet,otherPet:null},now);
 if(p.kind==='star-ready')return !current.born&&current.phaseAt===p.phaseAt&&eggProgress(current,now).ready;
 if(p.kind==='star-care')return current.born&&!longRest(current,now)&&current.sleepUntil<=now&&(p.needs||[]).some(k=>current.needs[k]<=0&&current.needAlerts[k].cycle===p.cycles?.[k]);
 return p.kind==='star-growth'&&now-p.at<48*3600000;
}

// Durable storage transactions serialize both phones. Receipts outlive the
// engine's short UI history, and bind IDs to the exact command and account.
export class StarNursery {
 constructor(ctx,env){this.ctx=ctx;this.env=env;}
 async fetch(request){
  try{
   const input=await request.json(),now=Date.now();
   const result=await this.ctx.storage.transaction(async tx=>{
    let record=await tx.get('nursery');
    if(input.op==='remember'){await tx.put('event:'+input.ref,input.ping);return {ok:true};}
    if(input.op==='queued-wanted'){const ping=await tx.get('event:'+input.ref);return ping?.to===input.to&&starPingWanted(record,ping,now);}
    if(input.op==='meta')return record?{firstDay:record.firstDay,lastScoresAt:record.lastScoresAt}:null;
    if(input.op==='wanted')return starPingWanted(record,input.ping,now);
    if(!record&&!['read','act'].includes(input.op))return {pending:[]};
    record??=freshRecord(now);
    // Pets saved before ingredient recipes have no larder. Upgrade at the
    // storage boundary so reads, purchases, arcade rewards and retries agree.
    record.state.larder??={};
    if(input.op==='ack'){record.pending=record.pending.filter(p=>!input.ids.includes(p.id));await tx.put('nursery',record);return {ok:true};}
    if(input.op==='sync'){creditResults(record,input.results,now);await tx.put('nursery',record);return {ok:true};}
    if(input.op==='tick'){collectStarPings(record,now);await tx.put('nursery',record);return {pending:record.pending};}
    if(!['him','her'].includes(input.actor))throw Error('Sign in to visit.');
    let reply={};
    if(input.op==='act'){
     const {command:c}=input;
     if(!c||!STAR_ACTIONS.has(c.type)||typeof c.id!=='string'||!/^[\w-]{5,90}$/.test(c.id)||!c.payload||Array.isArray(c.payload)||typeof c.payload!=='object')throw Error('Invalid nursery action.');
     // Older open kitchens send the original four-station marker for every
     // recipe. Count their real grades before fingerprinting, so stuck batches
     // and pending retries share a receipt with the corrected client. The
     // engine still requires every valid grade for the session's actual recipe.
     if(c.type==='cook'&&c.payload.steps===4&&Array.isArray(c.payload.grades)&&[3,5].includes(c.payload.grades.length))c.payload={...c.payload,steps:c.payload.grades.length};
     const key=`receipt:${input.actor}:${c.id}`,fingerprint=JSON.stringify([c.type,c.petId,c.payload]),receipt=await tx.get(key);
     if(receipt){if(receipt.fingerprint!==fingerprint)throw Error('This save ID belongs to a different action.');return {...view(record,input.actor,now),...receipt.reply,duplicate:true};}
     const oriented=orient(record.state,record.selected[input.actor]);
     if(c.petId!==oriented.petId)throw Error('Your active star changed. Reopen the nursery before trying again.');
     // Live results must come from the current scored protocol, never legacy demo shortcuts.
     if(c.type==='start-play'&&c.payload.arcadeVersion!==2)throw Error('Refresh the game to play.');
     if(c.type==='play'&&!c.payload.arcade)throw Error('Finish the challenge first.');
     if(c.type==='cook'&&(!Array.isArray(c.payload.grades)||c.payload.steps!==c.payload.grades.length))throw Error('Finish every cooking station.');
     if(c.type==='cook'&&now-(oriented.cookSessions[input.actor]?.at||now)<8000)throw Error('Finish the cooking stations before collecting.');
     if(c.type==='play'){
      const elapsed=Math.max(0,(now-(oriented.playSessions[input.actor]?.at||now))/1000),a=c.payload.arcade;
      const minimum=c.payload.game==='catch'?(a.caught||0)*.24:c.payload.game==='echo'?Math.max(0,(a.longest||0)-1)*(a.longest||0)*.1:(a.matched||0)*.16;
      if(minimum>elapsed+1)throw Error('That result arrived before the challenge could finish.');
     }
     const result=applyAction(oriented,{type:c.type,id:input.actor+'-'+c.id,actor:input.actor,payload:c.payload},now);
     record.state=result.state;record.selected[input.actor]=result.state.petId;
     reply={message:result.message,effect:result.effect};
     await tx.put(key,{fingerprint,reply,at:now});
    }else if(input.op!=='read')throw Error('Unknown nursery request.');
    // Sync polling is not care: an idle desktop tab must not suppress reminders.
    else{record.state=orient(record.state,record.selected[input.actor]);}
    collectStarPings(record,now);await tx.put('nursery',record);
    return {...view(record,input.actor,now),...reply};
   });
   return Response.json(result);
  }catch(error){return Response.json({error:error.message||'Nursery unavailable.'},{status:400});}
 }
}

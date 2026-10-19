import {applyAction,projectStar,RECIPES,clock,longRest} from '../../little-star/engine.mjs';
import {KITCHEN_VERSION,STATIONS,kitchenPayout} from '../../little-star/kitchen-rules.mjs';

// New skill sessions are settled here, while already-open legacy batches keep
// their original contract. The enclosing durable transaction owns receipts.
export function applyKitchenAction(input,command,now){
 const {actor,type,id,payload}=command,old=input.cookSessions?.[actor];
 if(type==='start-cook'&&payload.challengeVersion===KITCHEN_VERSION){
  if(payload.resumeSessionId){
   if(!old||old.done||old.id!==payload.resumeSessionId||old.recipe!==payload.recipe||old.challengeVersion!==KITCHEN_VERSION)throw Error('That cooking session is no longer active.');
   return {state:projectStar(input,now),message:'Resuming your batch.',effect:null};
  }
  const s=structuredClone(input),recipe=RECIPES[payload.recipe];if(!recipe)throw Error('Choose a recipe.');
  const extra=payload.withPet?(s.form==='giant'?2:['golden','blackhole'].includes(s.form)?1:0):0;
  if((s.pantry[recipe.dish]||0)>99-9-extra)throw Error('Make room for a perfect batch in the pantry first.');
  // Starting a different challenge forfeits the old ingredients. Legacy
  // sessions still use the engine's original refund behavior.
  if(old?.challengeVersion===KITCHEN_VERSION&&!old.done){s.cookSessions[actor].done=true;delete s.cookSessions[actor].reserved;}
  const result=applyAction(s,command,now);result.state.cookSessions[actor].challengeVersion=KITCHEN_VERSION;
  result.message='Ingredients ready. Failed dishes earn nothing; perfect cooking makes 9 meals.';return result;
 }
 if(old?.challengeVersion!==KITCHEN_VERSION||!['cook','cancel-cook'].includes(type))return null;
 if(old.done)throw Error('This batch has already been settled.');
 if(type==='cancel-cook')return fail(input,actor,id,now,'Batch discarded. No meals or stardust earned.');
 if(payload.sessionId!==old.id||old.petId!==input.petId)throw Error('Reopen your current cooking batch.');
 const proof=payload.challenge,stations=RECIPES[old.recipe].stations;
 if(!proof||proof.version!==KITCHEN_VERSION||proof.sessionId!==old.id||!Array.isArray(proof.stages)||!proof.stages.length||proof.stages.length>stations.length||typeof proof.failed!=='boolean')throw Error('Resume this batch to finish the skill challenge.');
 let elapsed=0;
 for(const [i,stage] of proof.stages.entries()){
  if(stage.kind!==stations[i]||!Number.isInteger(stage.score)||stage.score<0||stage.score>100||!Number.isFinite(stage.elapsed)||stage.elapsed<0||stage.elapsed>STATIONS[stage.kind].seconds+.5||typeof stage.failed!=='boolean')throw Error('Invalid cooking station result.');
  if(stage.failed&&(i!==proof.stages.length-1||!proof.failed||stage.score!==0))throw Error('Invalid failed cooking result.');
  if(!stage.failed&&!proof.failed&&stage.elapsed<(stage.kind==='heat'?6.2:stage.kind==='add'?3:.3))throw Error('That station finished too quickly.');
  elapsed+=stage.elapsed;
 }
 if(elapsed>(now-old.at)/1000+1)throw Error('That result arrived before the challenge could finish.');
 if(!proof.failed&&(proof.stages.length!==stations.length||proof.stages.some(s=>s.failed)))throw Error('Finish every cooking station.');
 const grades=stations.map((_,i)=>proof.stages[i]?.score||0);
 if(!Array.isArray(payload.grades)||payload.grades.length!==grades.length||payload.grades.some((v,i)=>v!==grades[i]))throw Error('Cooking grades do not match this batch.');
 const score=proof.failed?0:Math.floor(grades.reduce((a,b)=>a+b,0)/grades.length);
 if(proof.failed||score<55)return fail(input,actor,id,now,'Dish ruined. No meals or stardust earned. The ingredients were used.');
 const projected=projectStar(input,now),session=projected.cookSessions[actor],day=clock(now).day;
 // Keep the engine's care, memories and pet helpers for a successful meal,
 // then replace its legacy payout with the skill challenge's shared payout.
 const pay=kitchenPayout(projected,actor,{...session,form:longRest(projected,now)?null:session.form},score,false,day);
 const result=applyAction(input,command,now),s=result.state,def=RECIPES[session.recipe],key=day+':'+actor;
 s.pantry[def.dish]=Math.min(99,(projected.pantry[def.dish]||0)+pay.portions);
 s.wallets[actor]=projected.wallets[actor]+pay.tip;
 s.daily[key].cookBonuses=(projected.daily[key]?.cookBonuses||0)+(pay.tip?1:0);
 // Helpers are awarded by the engine only after success; no failed batch
 // goes through it, so a failure cannot mint food, care, XP or a memory.
 s.cookSessions[actor].challengeScore=score;
 result.message=`${pay.label} · ${score}%. ${pay.portions} meals in the pantry.${pay.tip?' +'+pay.tip+' stardust.':''}${score===100?' Triple the standard batch!':''}`;
 return result;
}
function fail(input,actor,id,now,message){
 const s=projectStar(input,now),session=s.cookSessions[actor];session.done=true;session.failed=true;delete session.reserved;
 s.revision++;s.receipts.push(id);s.receipts=s.receipts.slice(-80);
 return {state:s,message,effect:null};
}

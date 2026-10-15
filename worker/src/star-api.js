import {sideForUid} from '../../household.js';
import {createClient} from './firestore.js';
import {gameDay} from '../../little-star/engine.mjs';

export async function starCall(env,input){
 const stub=env.STAR_NURSERY.get(env.STAR_NURSERY.idFromName(env.HOUSEHOLD_ID));
 const response=await stub.fetch('https://nursery.internal/',{method:'POST',body:JSON.stringify(input)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Nursery unavailable.');return result;
}
export async function authorizeStar(request,env){
 const headers={'Access-Control-Allow-Origin':env.APP_ORIGIN,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Cache-Control':'no-store','Vary':'Origin'};
 const fail=(error,status)=>({response:Response.json({error},{status,headers})});
 if(request.headers.get('Origin')!==env.APP_ORIGIN)return fail('This origin is not allowed.',403);
 if(request.method==='OPTIONS')return {response:new Response(null,{status:204,headers})};
 if(request.method!=='POST')return fail('POST only.',405);
 const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
 if(!token||token.length>10000)return fail('Sign in to visit.',401);
 const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)return fail('Sign in again to visit.',response.status>=500?503:401);
 const payload=await response.json(),actor=sideForUid(payload.users?.[0]?.localId);
 if(!actor)return fail('This account is not part of this nursery.',403);
 return {headers,actor,token};
}
export async function handleStar(request,env){
 let auth;
 try{
  auth=await authorizeStar(request,env);if(auth.response)return auth.response;
  if(!env.STAR_NURSERY)throw Error('The nursery is being set up. Try again shortly.');
  if(Number(request.headers.get('Content-Length'))>12000)return Response.json({error:'Request too large.'},{status:413,headers:auth.headers});
  const raw=await request.text();if(raw.length>12000)return Response.json({error:'Request too large.'},{status:413,headers:auth.headers});
  let input;try{input=JSON.parse(raw);}catch{return Response.json({error:'Invalid request.'},{status:400,headers:auth.headers});}
  if(!['read','act'].includes(input?.op))return Response.json({error:'Invalid nursery request.'},{status:400,headers:auth.headers});
  // Initialize only after a real member deliberately opens the game.
  let meta=await starCall(env,{op:'meta'});
  if(!meta){await starCall(env,{op:'read',actor:auth.actor});meta=await starCall(env,{op:'meta'});}
  let scoresPending=false;
  if(Date.now()-meta.lastScoresAt>=30000){
   try{
    const db=createClient({projectId:env.FIREBASE_PROJECT_ID,idToken:auth.token}),household=`households/${env.HOUSEHOLD_ID}`,last=gameDay(Date.now());
    const [words,timed]=await Promise.all([db.dayRange(`${household}/wordResults`,meta.firstDay,last),db.dayRange(`${household}/timedResults`,meta.firstDay,last)]);
    await starCall(env,{op:'sync',results:{words,timed}});
   }catch{scoresPending=true;}
  }
  // Explicitly construct the internal command: a forged op/actor/results field
  // from the browser can never reach the durable object's trusted operations.
  let result;
  try{result=await starCall(env,{op:input.op,actor:auth.actor,...(input.op==='act'?{command:input.command}:{})});}
  catch(error){return Response.json({error:error.message},{status:400,headers:auth.headers});}
  return Response.json({...result,scoresPending},{headers:auth.headers});
 }catch{return Response.json({error:'Cannot reach the nursery. Reconnect and retry.'},{status:503,headers:auth?.headers||{'Access-Control-Allow-Origin':env.APP_ORIGIN,'Cache-Control':'no-store'}});}
}
async function eventKey(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function scheduleStar(env,db,household){
 if(!env.STAR_NURSERY)return;
 const {pending=[]}=await starCall(env,{op:'tick'}),ack=[];
 for(const ping of pending){
  if(!await starCall(env,{op:'wanted',ping})){ack.push(ping.id);continue;}
  const id=await eventKey(ping.id),marker=`${household}/deliveryLocks/star-event-${id}`;
  await starCall(env,{op:'remember',ref:'star/'+id,ping});
  if(await db.get(marker)){ack.push(ping.id);continue;}
  const created=await db.createMany([{path:marker,fields:{createdAt:Date.now()}},{path:`${household}/outbox/star-${id}`,fields:{to:ping.to,title:ping.title.slice(0,120),body:ping.body.slice(0,400),kind:ping.kind,ref:'star/'+id,url:`little-star.html?pet=${ping.petId}#${ping.route}`,createdAt:Date.now(),sendAt:Date.now()}}]);
  // Keep the source event after enqueue for a final stale-care check at send.
  if(created||await db.get(marker))ack.push(ping.id);
 }
 if(ack.length)await starCall(env,{op:'ack',ids:ack});
}
export async function queuedStarWanted(env,message){
 if(!env.STAR_NURSERY)return false;
 // Revalidate against the server's durable event history, never outbox input.
 return starCall(env,{op:'queued-wanted',ref:message.ref,to:message.to});
}

import {sideForUid} from '../../household.js';

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
  // Explicitly construct the internal command: a forged op/actor/results field
  // from the browser can never reach the durable object's trusted operations.
  let result;
  try{result=await starCall(env,{op:input.op,actor:auth.actor,...(input.op==='act'?{command:input.command}:{})});}
  catch(error){return Response.json({error:error.message},{status:400,headers:auth.headers});}
  return Response.json({...result,scoresPending:false},{headers:auth.headers});
 }catch{return Response.json({error:'Cannot reach the nursery. Reconnect and retry.'},{status:503,headers:auth?.headers||{'Access-Control-Allow-Origin':env.APP_ORIGIN,'Cache-Control':'no-store'}});}
}

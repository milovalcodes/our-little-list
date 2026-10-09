// The browser may wake delivery, but cannot supply a message or recipient.
// Firestore validates its Firebase ID token against the real household rules.
export async function authorizeWake(request, env) {
  const origin = env.APP_ORIGIN || 'https://milovalcodes.github.io';
  const headers = { 'Cache-Control':'no-store', Vary:'Origin' };
  if (request.headers.get('Origin') !== origin) return { response:new Response('Forbidden', {status:403,headers}) };
  Object.assign(headers, {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'});
  if (request.method === 'OPTIONS') return { response:new Response(null,{status:204,headers}) };
  if (request.method !== 'POST') return { response:new Response('POST only',{status:405,headers}) };
  const authorization=request.headers.get('Authorization')||'';
  if (!/^Bearer [A-Za-z0-9_.-]{20,4096}$/.test(authorization)) return {response:new Response('Sign in required',{status:401,headers})};
  // No payload is accepted: /dispatch checks saved outbox entries; the separate
  // /dispatch/activities path also checks saved answers and game results.
  // Cloudflare can expose an empty POST as a ReadableStream, not null. Check
  // its bytes, not its existence; read at most one chunk, with a deadline.
  if (Number(request.headers.get('Content-Length'))>0)return {response:new Response('No body allowed',{status:400,headers})};
  if(request.body){
    const reader=request.body.getReader();let timer;
    try{
      const chunk=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('body timeout')),2000);})]);
      if(chunk.value?.byteLength)return {response:new Response('No body allowed',{status:400,headers})};
    }catch(_){return {response:new Response('Invalid request',{status:400,headers})};}
    finally{clearTimeout(timer);void reader.cancel().catch(()=>{});}
  }
  try {
    const url=`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/households/${encodeURIComponent(env.HOUSEHOLD_ID)}/profiles?pageSize=1`;
    const checked=await fetch(url,{headers:{Authorization:authorization},signal:AbortSignal.timeout(5000)});
    // A successful LIST (even empty) proves authorization. Unlike a GET, a
    // missing document is never mistaken for membership. Don't return data.
    if(!checked.ok)return {response:new Response('Unable to authorize',{status:[401,403].includes(checked.status)?403:503,headers})};
    await checked.arrayBuffer();
    return {headers};
  } catch (_) { return {response:new Response('Try again later',{status:503,headers})}; }
}

export async function wakeDelivery(env, deliver, {activities=false, sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  // A concurrent cron may already be sending. Retry its lock briefly rather
  // than create a second sender or defer a new note for another full minute.
  for(const delay of [0,300,700,1500,2500,4000]){
    if(delay)await sleep(delay);
    const result=await deliver(env,{scheduleQuestions:activities,scheduleReminders:false});
    if(result.skipped!=='already-running')return result;
  }
  return {checked:false,skipped:'backup-will-retry'};
}

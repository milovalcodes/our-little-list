import { DELIVERY_URL } from './push-config.js';

// Wake only after a real server acknowledgement, not an optimistic offline
// write. Failures leave the durable outbox intact for the minute backstop.
export function createDeliveryWake({getToken,fetcher=globalThis.fetch.bind(globalThis),url=DELIVERY_URL,timeoutMs=10000}={}) {
  let pending=false,activities=false,timer=null,running=false;
  async function flush(){
    timer=null;
    if(running||!pending)return;
    running=true;pending=false;
    const checkActivities=activities;activities=false;
    // AbortController also works on older Web-Push-capable iPhones where
    // AbortSignal.timeout is not available. Bound a stalled token refresh too.
    const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const aborted=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('wake timeout')),{once:true}));
      const token=await Promise.race([getToken(),aborted]);
      if(!token)return;
      const response=await fetcher(url+(checkActivities?'/activities':''),{
        method:'POST',headers:{Authorization:`Bearer ${token}`},mode:'cors',credentials:'omit',
        cache:'no-store',keepalive:true,signal:controller.signal
      });
      // No claim that the phone displayed anything: 202 means server work was
      // accepted. Cron owns recovery on a denied/offline/timed-out request.
      if(!response.ok)console.warn('Immediate notification wake unavailable; scheduled delivery remains queued.');
    }catch(_){/* best effort; never turn a saved action into a UI error */}
    finally{clearTimeout(deadline);running=false;if(pending&&!timer)timer=setTimeout(flush,100);}
  }
  return function wake(options={}){
    pending=true;activities ||= options.activities===true;
    if(!running&&!timer)timer=setTimeout(flush,100);
  };
}

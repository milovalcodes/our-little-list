import { VAPID_PUBLIC_KEY, PUSH_SUBS } from './push-config.js';
import { readNotificationPreferences } from './notification-preferences.js';
import { isStandalone, isApplePhone } from './device-mode.js';

// Turns the URL-safe base64 VAPID key into the Uint8Array pushManager wants.
function keyBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// A failed installation must not leave Settings or sign-in waiting forever.
async function readyRegistration() {
  let timer;
  try {
    return await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Notifications are still connecting. Please try again.')), 8000);
    })]);
  } finally { clearTimeout(timer); }
}

// Reports what is standing between this phone and a background notification,
// without asking for anything. Used by the phone checker.
export async function pushState() {
  if (!pushSupported()) {
    const installed = isStandalone();
    const apple = isApplePhone();
    if (apple && !installed) return 'needs-install';
    return 'unsupported';
  }
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('REPLACE')) return 'not-configured';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'needs-permission';
  try {
    const registration = await readyRegistration();
    const existing = await registration.pushManager.getSubscription();
    return existing ? 'ready' : 'needs-subscribe';
  } catch (_) {
    return 'failed';
  }
}

// Creates (or reuses) this phone's push subscription and files it under the
// signed-in couple account so the delivery workflow can find it.
export async function ensurePushSubscription(data, person, {replace=false}={}) {
  const state = await pushState();
  if (state !== 'ready' && state !== 'needs-subscribe') return { state };
  if (!data || data.mode === 'local') return { state: 'no-sync' };

  try {
    const registration = await readyRegistration();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(VAPID_PUBLIC_KEY)
      });
    }
    const record = JSON.parse(JSON.stringify(subscription.toJSON()));
    const fields = {
      person,
      subscription: record,
      preferences: readNotificationPreferences(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
      updatedAt: Date.now(),
      device: navigator.userAgent.slice(0, 180)
    };
    const saved=data.claimPushEndpoint
      ? await data.claimPushEndpoint(person,fields,{replace})
      : await data.setTo(PUSH_SUBS,person,fields);
    if(saved?.state==='other-device')return saved;
    if(saved?.syncing)return {state:'pending'};
    await releaseEndpointFromOtherSide(data, person, record.endpoint);
    return { state: 'ready' };
  } catch (problem) {
    return { state: 'failed', problem };
  }
}

// Browser permission is not proof that the server saved this endpoint.
export async function registeredPushState(data,person){
  const state=await pushState();
  if(state!=='ready')return state;
  if(!data||data.mode==='local')return 'no-sync';
  try{
    const registration=await readyRegistration();
    const subscription=await registration.pushManager.getSubscription();
    const rows=await data.readOnce(PUSH_SUBS,{fromServer:true});
    const saved=rows.find(row=>row.id===person)?.subscription?.endpoint;
    return saved===subscription?.endpoint?'ready':saved?'other-device':'needs-subscribe';
  }catch{return 'failed';}
}

// A browser has exactly one push subscription, so if two accounts are ever used
// on the same phone — which is how this household started — the other side can
// be left registered against this very endpoint, and their reminders arrive
// here instead of on their phone. Registering claims the endpoint for one side
// and releases it from the other.
async function releaseEndpointFromOtherSide(data, person, endpoint) {
  if (!endpoint || typeof data.readOnce !== 'function') return;
  try {
    // Server-only: a cached view of pushSubs can be older than the other
    // phone's re-registration, and acting on it would delete a live one.
    const records = await data.readOnce(PUSH_SUBS, { fromServer: true });
    await Promise.all(
      records
        .filter(record => record.id !== person && record.subscription?.endpoint === endpoint)
        .map(record => releaseMatchingEndpoint(data,record.id,endpoint))
    );
  } catch (_) { /* best effort; the next registration tries again */ }
}

// Called when somebody signs out, so the phone stops answering for them.
export async function forgetPushSubscription(data, person) {
  let endpoint='';
  try {
    const worker=navigator.serviceWorker;
    if(!worker)return;
    // getRegistration settles even if no service worker was ever installed;
    // ready can otherwise wait forever on a desktop that never enabled push.
    const registration = worker.getRegistration?await worker.getRegistration():await worker.ready;
    const subscription = await registration?.pushManager.getSubscription();
    endpoint=subscription?.endpoint||'';
    await subscription?.unsubscribe();
  } catch (_) { /* nothing to undo */ }
  if(endpoint)try { await releaseMatchingEndpoint(data,person,endpoint); } catch (_) { /* next registration cleans up */ }
}

async function releaseMatchingEndpoint(data,person,endpoint){
  if(data?.releasePushEndpoint)return data.releasePushEndpoint(person,endpoint);
  // Compatibility for test/local adapters. Production always uses the
  // transaction above, so a concurrent phone registration cannot be deleted.
  const records=await data?.readOnce?.(PUSH_SUBS,{fromServer:true});
  if(records?.some(r=>r.id===person&&r.subscription?.endpoint===endpoint))await data.removeFrom(PUSH_SUBS,person);
}

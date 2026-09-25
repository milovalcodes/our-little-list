import { VAPID_PUBLIC_KEY, PUSH_SUBS } from './push-config.js';
import { readNotificationPreferences } from './notification-preferences.js';

// Turns the URL-safe base64 VAPID key into the Uint8Array pushManager wants.
function keyBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Reports what is standing between this phone and a background notification,
// without asking for anything. Used by the phone checker.
export async function pushState() {
  if (!pushSupported()) {
    const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    const apple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (apple && !installed) return 'needs-install';
    return 'unsupported';
  }
  if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.startsWith('REPLACE')) return 'not-configured';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'needs-permission';
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    return existing ? 'ready' : 'needs-subscribe';
  } catch (_) {
    return 'unsupported';
  }
}

// Creates (or reuses) this phone's push subscription and files it under the
// signed-in couple account so the delivery workflow can find it.
export async function ensurePushSubscription(data, person) {
  const state = await pushState();
  if (state !== 'ready' && state !== 'needs-subscribe') return { state };
  if (!data || data.mode === 'local') return { state: 'no-sync' };

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(VAPID_PUBLIC_KEY)
      });
    }
    const record = JSON.parse(JSON.stringify(subscription.toJSON()));
    await data.setTo(PUSH_SUBS, person, {
      person,
      subscription: record,
      preferences: readNotificationPreferences(),
      updatedAt: Date.now(),
      device: navigator.userAgent.slice(0, 180)
    });
    await releaseEndpointFromOtherSide(data, person, record.endpoint);
    return { state: 'ready' };
  } catch (problem) {
    return { state: 'failed', problem };
  }
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
        .map(record => data.removeFrom(PUSH_SUBS, record.id))
    );
  } catch (_) { /* best effort; the next registration tries again */ }
}

// Called when somebody signs out, so the phone stops answering for them.
export async function forgetPushSubscription(data, person) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch (_) { /* nothing to undo */ }
  try { await data?.removeFrom(PUSH_SUBS, person); } catch (_) { /* already gone */ }
}

import { VAPID_PUBLIC_KEY, PUSH_SUBS } from './push-config.js';

// Turns the URL-safe base64 VAPID key into the Uint8Array pushManager wants.
function keyBytes(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export function pushSupported() {
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
    await data.setTo(PUSH_SUBS, person, {
      person,
      subscription: JSON.parse(JSON.stringify(subscription.toJSON())),
      updatedAt: Date.now(),
      device: navigator.userAgent.slice(0, 180)
    });
    return { state: 'ready' };
  } catch (problem) {
    return { state: 'failed', problem };
  }
}

export async function forgetPushSubscription(data, person) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch (_) { /* nothing to undo */ }
  try { await data?.removeFrom(PUSH_SUBS, person); } catch (_) { /* already gone */ }
}

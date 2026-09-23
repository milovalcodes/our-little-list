// One data layer per page, shared by every module on it. The Firebase layer also
// fans one collection snapshot out to every interested module, so a dashboard
// and its live-popup helper never pay for the same listener twice.
//
// Before this, her.html opened three separate layers — profile-names.js,
// dashboard.js and live-notes.js each called createDataLayer — which meant three
// auth listeners and a dozen live snapshot listeners on the same collections.

import { createDataLayer } from './firebase-data.js';

let layerPromise = null;
const authHandlers = new Set();
let lastUser = null;
let sawAuth = false;

export function sharedLayer() {
  if (!layerPromise) {
    layerPromise = createDataLayer({
      onAuth(user) {
        lastUser = user;
        sawAuth = true;
        authHandlers.forEach(handler => safely(handler, user));
      }
    });
  }
  return layerPromise;
}

// Fires now if auth state is already known, and again whenever it changes.
export function onAuthChange(handler) {
  authHandlers.add(handler);
  if (sawAuth) safely(handler, lastUser);
  return () => authHandlers.delete(handler);
}

// Convenience for the common "attach my listeners once we are signed in" shape.
export function whenReady(data, handler) {
  let started = false;
  const run = () => {
    if (started) return;
    started = true;
    handler();
  };
  if (data.mode === 'local') {
    queueMicrotask(run);
    return;
  }
  onAuthChange(user => { if (user) run(); });
}

function safely(handler, value) {
  try { handler(value); } catch (problem) { console.error('data-hub handler failed', problem); }
}

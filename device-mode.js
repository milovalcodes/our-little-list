export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

// iPhones and iPads: push only works once the app is on the Home Screen, and
// they pick their own notification sound and vibration. (shared.js is a plain
// script, not a module, so it keeps its own one-line copy.)
export function isApplePhone() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

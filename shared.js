if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const alreadyControlled = Boolean(navigator.serviceWorker.controller);
  let refreshingForUpdate = false;
  if (alreadyControlled) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshingForUpdate) return;
      refreshingForUpdate = true;
      window.location.reload();
    });
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then(registration => registration.update()).catch(() => {});
  });
}

let pendingInstallPrompt = null;
const installButton = document.getElementById('install-app');
const installHint = document.getElementById('install-hint');
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isApplePhone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroidPhone = /Android/i.test(navigator.userAgent);

if (installHint && standalone) installHint.textContent = 'Already under your little sky ☀︎☾';
if (installHint && !standalone && isApplePhone) installHint.textContent = 'On iPhone: Share → Add to Home Screen';
if (installHint && !standalone && isAndroidPhone) installHint.textContent = 'On Android: tap Install app in Chrome';

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstallPrompt = event;
  if (installButton && !standalone) installButton.hidden = false;
});

installButton?.addEventListener('click', async () => {
  if (!pendingInstallPrompt) return;
  await pendingInstallPrompt.prompt();
  await pendingInstallPrompt.userChoice;
  pendingInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  if (installButton) installButton.hidden = true;
  if (installHint) installHint.textContent = 'Installed — welcome to your little universe ☀︎☾';
});

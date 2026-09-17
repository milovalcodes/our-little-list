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

if (installButton && standalone) installButton.hidden = true;
if (installHint && standalone) installHint.textContent = 'already installed. huge for us.';
if (installHint && !standalone && isApplePhone) installHint.textContent = 'On iPhone: Share → Add to Home Screen';
if (installHint && !standalone && isAndroidPhone) installHint.textContent = 'tap the button. ignore Android being dramatic.';

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstallPrompt = event;
  if (installButton && !standalone) installButton.hidden = false;
});

installButton?.addEventListener('click', async () => {
  if (!pendingInstallPrompt) {
    if (installHint && isApplePhone) installHint.textContent = 'Safari share button → Add to Home Screen. the sacred sequence.';
    else if (installHint) installHint.textContent = 'browser menu → Add to Home screen. Android made it a side quest.';
    return;
  }
  await pendingInstallPrompt.prompt();
  await pendingInstallPrompt.userChoice;
  pendingInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener('appinstalled', () => {
  if (installButton) installButton.hidden = true;
  if (installHint) installHint.textContent = 'installed 👍';
});

let littleAudioContext = null;
window.addEventListener('pointerdown', () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  littleAudioContext ||= new AudioContext();
  if (littleAudioContext.state === 'suspended') void littleAudioContext.resume();
}, { passive: true });

window.playLittleTwinkle = () => {
  if (!littleAudioContext || littleAudioContext.state !== 'running') return;
  const now = littleAudioContext.currentTime;
  [[659.25,0],[880,.11],[1046.5,.22]].forEach(([frequency,delay]) => {
    const oscillator=littleAudioContext.createOscillator();const gain=littleAudioContext.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(0.0001,now+delay);gain.gain.exponentialRampToValueAtTime(.1,now+delay+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.16);
    oscillator.connect(gain).connect(littleAudioContext.destination);oscillator.start(now+delay);oscillator.stop(now+delay+.18);
  });
};

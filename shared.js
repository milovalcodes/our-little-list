// Decorative/control images should not turn a tap/drag into the browser's
// image ghost. Personal memory photos and editable content keep their defaults.
document.addEventListener('dragstart',event=>{
  if(event.target.closest('.app-topbar,.app-dock,.sky-person,.sky-launch,.feature-hero,.alter-ego-trigger'))event.preventDefault();
});

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

const syncBackedPage=Boolean(document.getElementById('auth-root'));
let thinkingTimeout=null;

window.littleLoading={
  show(message){
    const season=window.LittleSeason?.current;
    const defaultMessage=season==='spooky'?'checking the cobwebs…':season==='christmas'?'getting cozy…':'getting our stuff…';
    let screen=document.querySelector('.thinking-screen');
    if(!screen){
      screen=document.createElement('aside');screen.className='thinking-screen';screen.setAttribute('role','status');screen.setAttribute('aria-live','polite');
      screen.innerHTML='<div class="celestial-loader" aria-hidden="true"><span>☀</span><i>✦</i><span>☾</span></div><strong></strong><p>one tiny second.</p>';
      document.body.append(screen);
    }
    screen.querySelector('strong').textContent=message??defaultMessage;screen.classList.remove('is-leaving');
  },
  hide(){
    const screen=document.querySelector('.thinking-screen');if(!screen)return;
    screen.classList.add('is-leaving');window.setTimeout(()=>screen.remove(),260);window.clearTimeout(thinkingTimeout);
  }
};

window.showLittleFailure=(message='something did not work.',solution='check the internet and try again.',options={})=>{
  const {reload=false}=options;
  document.querySelector('.global-failure')?.remove();
  const card=document.createElement('aside');card.className='global-failure';card.setAttribute('role','alert');
  card.innerHTML='<span class="failure-icon">×</span><div><strong></strong><p></p></div><button type="button"></button><button class="failure-close" type="button" aria-label="Close">×</button>';
  card.querySelector('strong').textContent=message;card.querySelector('p').textContent=`try this: ${solution}`;
  const action=card.querySelector('button:not(.failure-close)');action.textContent=reload?'try again':'got it';action.addEventListener('click',()=>reload?location.reload():card.remove());card.querySelector('.failure-close').addEventListener('click',()=>card.remove());
  document.body.append(card);
};

if(syncBackedPage){
  window.littleLoading.show();
  // Location is a foreground app behavior now, not a separate destination.
  // The module keeps a short renewable lease so a suspended page becomes
  // "last known" instead of pretending it is still live.
  void import('./auto-location.js').catch(()=>{});
  void import('./app-chrome.js').catch(problem=>console.error('app chrome failed',problem));
  thinkingTimeout=window.setTimeout(()=>{window.littleLoading.hide();window.showLittleFailure('this is taking a while.','check the internet, then tap try again.',{reload:true});},10000);
}
document.addEventListener('littlelist:dataready',()=>window.littleLoading.hide());
document.addEventListener('littlelist:dataerror',event=>{
  window.littleLoading.hide();
  const detail=event.detail||{};window.showLittleFailure(detail.message,detail.solution,{reload:true});
});

let pendingInstallPrompt = null;
const installButton = document.getElementById('install-app');
const installHint = document.getElementById('install-hint');
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isApplePhone = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroidPhone = /Android/i.test(navigator.userAgent);

if (installButton && standalone) installButton.hidden = true;
if (installHint && standalone) installHint.textContent = 'already on this phone ♡';
if (installHint && !standalone && isApplePhone) installHint.textContent = 'On iPhone: Share → Add to Home Screen';
if (installHint && !standalone && isAndroidPhone) installHint.textContent = 'tap the button to add it to your phone.';

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstallPrompt = event;
  if (installButton && !standalone) installButton.hidden = false;
});

window.requestLittleInstall = async () => {
  if (standalone) return { status:'installed' };
  if (!pendingInstallPrompt) {
    if (installHint && isApplePhone) installHint.textContent = 'Safari Share → Add to Home Screen.';
    else if (installHint) installHint.textContent = 'browser menu → Add to Home screen.';
    return { status:isApplePhone?'manual-ios':'manual' };
  }
  await pendingInstallPrompt.prompt();
  const choice=await pendingInstallPrompt.userChoice;
  pendingInstallPrompt = null;
  if (installButton) installButton.hidden = true;
  return { status:choice.outcome };
};

installButton?.addEventListener('click', async () => {
  await window.requestLittleInstall();
});

window.addEventListener('appinstalled', () => {
  if (installButton) installButton.hidden = true;
  if (installHint) installHint.textContent = 'installed 👍';
});

// iOS Safari skips :active press styles unless the page listens for touches.
// Without this every button felt dead under the finger on an iPhone.
document.addEventListener('touchstart', () => {}, { passive: true });

let littleAudioContext = null;
window.addEventListener('pointerdown', () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  littleAudioContext ||= new AudioContext();
  if (littleAudioContext.state === 'suspended') void littleAudioContext.resume();
}, { passive: true });

window.playLittleSound = (choice = 'twinkle') => {
  if (choice === 'off') return;
  if (!littleAudioContext || littleAudioContext.state !== 'running') return;
  const now = littleAudioContext.currentTime;
  const notes = choice === 'pop' ? [[392,0,'triangle'],[523.25,.1,'sine']] : [[659.25,0,'sine'],[880,.11,'sine'],[1046.5,.22,'sine']];
  notes.forEach(([frequency,delay,type]) => {
    const oscillator=littleAudioContext.createOscillator();const gain=littleAudioContext.createGain();
    oscillator.type=type;oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(0.0001,now+delay);gain.gain.exponentialRampToValueAtTime(.1,now+delay+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+delay+.16);
    oscillator.connect(gain).connect(littleAudioContext.destination);oscillator.start(now+delay);oscillator.stop(now+delay+.18);
  });
};

window.littleHaptic = kind => {
  if (!navigator.vibrate || navigator.userActivation?.hasBeenActive === false || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const patterns = { tap:[12], success:[18,35,24], warning:[35,45,35] };
  return navigator.vibrate(patterns[kind] || patterns.tap);
};

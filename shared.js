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
  show(message='getting our stuff…'){
    let screen=document.querySelector('.thinking-screen');
    if(!screen){
      screen=document.createElement('aside');screen.className='thinking-screen';screen.setAttribute('role','status');screen.setAttribute('aria-live','polite');
      screen.innerHTML='<div class="celestial-loader" aria-hidden="true"><span>☀</span><i>✦</i><span>☾</span></div><strong></strong><p>one tiny second.</p>';
      document.body.append(screen);
    }
    screen.querySelector('strong').textContent=message;screen.classList.remove('is-leaving');
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

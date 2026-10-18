const KEY='our-little-list-game-comfort-v1';
let settings={sound:false,haptics:false,colours:false,motion:true},audio;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');for(const key of Object.keys(settings))if(typeof saved?.[key]==='boolean')settings[key]=saved[key];}catch(_){}
export const comfortSettings=()=>({...settings});
function apply(){
 document.documentElement.classList.toggle('game-colour-friendly',settings.colours);
 document.documentElement.toggleAttribute('data-quiet-motion',!settings.motion);
 window.LittleComfort=comfortSettings;
}
if(typeof document!=='undefined')apply();
export function gameFeedback(kind){
 if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 if(settings.haptics)navigator.vibrate?.(kind==='invalid'?[20,30,20]:kind==='solve'?35:6);
 if(!settings.sound)return;
 try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();void audio.resume().catch(()=>{});
  const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  const start={solve:660,invalid:180,open:392,close:330,notice:523,key:440}[kind]||440;
  osc.type=kind==='key'?'triangle':'sine';osc.frequency.setValueAtTime(start,now);
  if(['solve','notice','open'].includes(kind))osc.frequency.exponentialRampToValueAtTime(start*1.5,now+.12);
  if(kind==='close')osc.frequency.exponentialRampToValueAtTime(220,now+.09);
  gain.gain.setValueAtTime(.025,now);gain.gain.exponentialRampToValueAtTime(.001,now+(['solve','notice'].includes(kind)?.25:.07));
  osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(now+.32);
 }catch(_){}
}
export function startGameComfort(host,title='Game comfort'){
 apply();
 host.innerHTML=`<details><summary>${title}</summary>${[['sound','Gentle sounds'],['haptics','Light taps'],['motion','Gentle motion'],['colours','Blue and orange game tiles']].map(([key,label])=>`<label><input type="checkbox" data-comfort="${key}" ${settings[key]?'checked':''}> ${label}</label>`).join('')}<small>For taps and games, throughout this device. Notification sounds stay in Pings. Sounds and taps pause with reduced motion.</small></details>`;
 host.addEventListener('change',e=>{const key=e.target.dataset.comfort;if(!Object.hasOwn(settings,key))return;settings[key]=e.target.checked;try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}apply();if(key==='sound'&&settings.sound)gameFeedback('notice');});
}

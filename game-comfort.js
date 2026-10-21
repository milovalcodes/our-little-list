import {playInterfaceSound,primeInterfaceAudio,stopInterfaceAudio} from './interface-audio.js';
const KEY='our-little-list-game-comfort-v1';
const defaults={sound:false,volume:.35,typing:false,haptics:false,colours:false,motion:true};
let settings={...defaults};
function restore(){settings={...defaults};try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');for(const key of Object.keys(settings))if(typeof settings[key]==='boolean'&&typeof saved?.[key]==='boolean')settings[key]=saved[key];if(Number.isFinite(saved.volume))settings.volume=Math.max(0,Math.min(1,saved.volume));}catch(_){}}
restore();
export const comfortSettings=()=>({...settings});
function apply(){
 document.documentElement.classList.toggle('game-colour-friendly',settings.colours);
 document.documentElement.toggleAttribute('data-quiet-motion',!settings.motion);
 window.LittleComfort=comfortSettings;
 if(!settings.sound||settings.volume===0)stopInterfaceAudio();
}
if(typeof document!=='undefined'){
 apply();
 const warm=e=>{if(e.isTrusted&&settings.sound)void primeInterfaceAudio();};
 document.addEventListener('pointerdown',warm,{passive:true});document.addEventListener('keydown',warm);
 window.addEventListener('storage',e=>{if(e.key===KEY){restore();apply();}});
}
export function gameFeedback(kind){
 if(document.hidden)return;
 if(settings.haptics&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)navigator.vibrate?.(kind==='invalid'?[12,30,12]:kind==='solve'?25:5);
 return playInterfaceSound(kind,comfortSettings);
}
export function startGameComfort(host,title='Game comfort'){
 apply();
 host.innerHTML=`<details><summary>${title}</summary>${[['sound','Gentle sounds'],['typing','Soft keyboard clicks'],['haptics','Light taps'],['motion','Gentle motion'],['colours','Blue and orange game tiles']].map(([key,label])=>`<label><input type="checkbox" data-comfort="${key}" ${settings[key]?'checked':''}> ${label}</label>`).join('')}<label class="sound-volume">Sound volume <input type="range" data-sound-volume min="0" max="100" step="5" value="${Math.round(settings.volume*100)}" aria-label="Sound volume"><output>${Math.round(settings.volume*100)}%</output></label><div class="sound-previews" role="group" aria-label="Try sounds"><button type="button" data-sound-preview="tap">Tap</button><button type="button" data-sound-preview="save">Saved</button><button type="button" data-sound-preview="solve">Solved</button></div><small data-sound-help>${settings.sound?'Try a sound above.':'Turn on Gentle sounds to try them.'}</small><small>Short sounds for taps, saves and games, with pauses between repeated effects. Keyboard clicks are optional. Reduced motion pauses movement and haptics; sound has its own switch. Notification sounds stay in Pings.</small><small>Sound effects by <a href="https://cyrex-studios.itch.io/universal-ui-soundpack">Nathan Gibson</a>, adapted under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</small></details>`;
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}apply();};
 host.addEventListener('input',e=>{if(!e.target.matches('[data-sound-volume]'))return;settings.volume=Number(e.target.value)/100;host.querySelector('output').textContent=e.target.value+'%';save();});
 host.addEventListener('change',e=>{
  const key=e.target.dataset.comfort;
  if(!Object.hasOwn(settings,key)||typeof settings[key]!=='boolean')return;
  settings[key]=e.target.checked;save();
  host.querySelector('[data-sound-help]').textContent=settings.sound?'Try a sound above.':'Turn on Gentle sounds to try them.';
  if(key==='sound'&&settings.sound)void playInterfaceSound('notice',comfortSettings,{preview:true});
 });
 host.addEventListener('click',e=>{const button=e.target.closest('[data-sound-preview]');if(button)void playInterfaceSound(button.dataset.soundPreview,comfortSettings,{preview:true});});
}

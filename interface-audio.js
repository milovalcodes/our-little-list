// Licensed, short samples: no loops, hover sounds, background or timer audio.
export const SOUND_FILES=['tap-1','tap-2','open','close','save','found','solve','notice','invalid','on','off','navigate'];
const priority={key:0,tap:0,navigate:0,open:1,close:1,on:1,off:1,found:2,invalid:2,save:3,notice:3,solve:4};
const cooldown={key:130,tap:130,navigate:220,open:180,close:180,on:180,off:180,found:220,invalid:750,save:700,notice:1800,solve:1800};
let context,ready,variant=0,lastAt=-Infinity,lastPriority=-1,generation=0;
const buffers=new Map(),lastKind=new Map(),playing=new Set();
export function stopInterfaceAudio(){generation++;for(const v of playing){try{v.source.stop();}catch(_){}v.source.disconnect();v.gain.disconnect();}playing.clear();}
export async function primeInterfaceAudio(){
 try{
  context??=new (window.AudioContext||window.webkitAudioContext)();
  const resume=context.resume();
  ready??=Promise.allSettled(SOUND_FILES.map(async file=>{
   if(buffers.has(file))return;
   const response=await fetch(new URL('./audio/interface/'+file+'.wav',import.meta.url));
   if(!response.ok)throw Error('Audio unavailable');
   buffers.set(file,await context.decodeAudioData(await response.arrayBuffer()));
  })).finally(()=>{ready=null;});
  await Promise.all([resume,ready]);
 }catch(_){} // Audio restrictions must never block an app action.
}
export async function playInterfaceSound(kind,readSettings,{preview=false}={}){
 if(!(kind in priority))kind='tap';
 const settings=readSettings(),now=performance.now();
 if(!settings.sound||settings.volume<=0||document.hidden||kind==='key'&&!settings.typing)return false;
 if(!preview&&(now-lastAt<80&&priority[kind]<=lastPriority||now-(lastKind.get(kind)??-Infinity)<cooldown[kind]))return false;
 const ticket=generation;
 lastAt=now;lastPriority=priority[kind];lastKind.set(kind,now);
 const name=kind==='key'||kind==='tap'?'tap-'+(variant++%2+1):kind;
 await primeInterfaceAudio();
 const current=readSettings();
 // Drop effects delayed by a slow fetch, mute, backgrounding or navigation.
 if(ticket!==generation||!current.sound||document.hidden||current.volume<=0||kind==='key'&&!current.typing||context?.state!=='running'||(!preview&&performance.now()-now>350))return false;
 const buffer=buffers.get(name);if(!buffer)return false;
 if([...playing].some(v=>v.priority>priority[kind]))return false;
 for(const v of [...playing])if(v.priority<=priority[kind]){try{v.source.stop();}catch(_){}playing.delete(v);}
 try{
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
  gain.gain.value=current.volume*(kind==='key'?.12:priority[kind]===0?.3:.55);
  source.connect(gain);gain.connect(context.destination);
  const voice={source,gain,priority:priority[kind]};playing.add(voice);
  source.onended=()=>{playing.delete(voice);source.disconnect();gain.disconnect();};
  source.start();return true;
 }catch(_){return false;}
}
if(typeof document!=='undefined'){
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInterfaceAudio();});
 window.addEventListener('pagehide',stopInterfaceAudio);
}

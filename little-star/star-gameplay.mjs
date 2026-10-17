// Pure, logical-coordinate rules shared by input handlers and regression tests.
export function stirSample(previous,point,seconds){
 const angle=p=>Math.atan2((p.y-111)/.65,p.x-160);
 let delta=angle(point)-angle(previous);if(delta>Math.PI)delta-=Math.PI*2;if(delta< -Math.PI)delta+=Math.PI*2;
 const radius=Math.hypot(point.x-160,(point.y-111)/.65),travel=Math.abs(delta);
 if(radius<15||radius>82||travel>1.25)return {delta:0,quality:0,hint:'Keep your circle in the pot.'};
 const speed=travel/Math.max(.016,seconds);
 // Broad comfort range. Idle time never earns quality; only accepted travel does.
 const quality=speed<=7?1:Math.max(.35,1-(speed-7)/12);
 return {delta,quality,hint:speed>7?'A little gentler — keep the spoon in the porridge.':'Smooth circles!'};
}
export function garnishPlacement(point,targets){
 const onFood=((point.x-160)/70)**2+((point.y-149)/37)**2<=1;
 if(!onFood||!targets.length)return null;
 const nearest=targets.map(t=>({...t,d:Math.hypot(point.x-t.x,point.y-t.y)})).sort((a,b)=>a.d-b.d)[0];
 const snapped=nearest.d<=18;
 return {x:snapped?nearest.x:point.x,y:snapped?nearest.y:point.y,target:nearest.n,score:snapped?100:Math.max(0,Math.round(100-(nearest.d-18)*3))};
}
export function catchResult(g){
 const accuracy=g.caught/Math.max(1,g.caught+g.misses);
 return {score:g.caught?Math.max(1,Math.round(10*accuracy*Math.max(0,1-g.hits*.18))):0,raw:Math.max(0,g.caught*100+g.bestCombo*25-g.hits*100)};
}
export function pairsResult(matched,moves,total){return Math.max(0,Math.round(10*(matched/total)*(matched/Math.max(matched,moves,1))));}
export function echoResult(completed,rounds,mistakes,replays){return Math.max(0,Math.round(completed/rounds*10)-mistakes-replays);}
// Arcade v2: cash follows verified progress, never elapsed/idle time or a
// shared 0–10 rating. These same rules drive previews and engine settlement.
export const PAIR_BOARDS={8:{seconds:120,cash:20},10:{seconds:180,cash:28},12:{seconds:240,cash:36}};
export function catchDifficulty(caught){const wave=1+Math.floor(caught/10),tier=Math.min(8,wave),late=Math.min(15,Math.max(0,wave-8)),interval=Math.max(.42,.95-(tier-1)*.055-late*.008);return {wave,speed:72+(tier-1)*12+late*4,interval,reach:Math.min(145,interval*300*.8),cloud:Math.min(.3,.1+(Math.min(wave,23)-1)*.012),burst:wave>=3?Math.min(.28,.06+(Math.min(wave,23)-3)*.012):0,meteor:wave>=4?Math.min(.2,.05+(Math.min(wave,23)-4)*.008):0,wind:wave>=6?Math.min(36,(Math.min(wave,23)-5)*2):0};}
export function arcadeResult(type,s){
 const count=(key,max=1000000)=>{const n=s?.[key];if(!Number.isInteger(n)||n<0||n>max)throw Error('That arcade progress did not look right.');return n;};
 if(type==='catch'){const caught=count('caught'),heals=s?.heals===undefined?0:count('heals',1000),misses=count('misses',3+heals),hits=count('hits',3+heals),best=count('bestCombo');if(heals>Math.floor(caught/25)||misses+hits>3+heals||best>caught)throw Error('That catch progress did not look right.');return {cash:Math.floor(caught/4)+5*Math.floor(best/15),raw:caught*100+best*25,recordKey:'catch-endless',label:caught+' wish'+(caught===1?'':'es'),complete:false};}
 if(type==='echo'){const longest=count('longest',4096),heals=s?.heals===undefined?0:count('heals',512);if(heals>Math.floor(longest/8))throw Error('That echo progress did not look right.');count('mistakes',3+heals);let cash=0;for(let n=2;n<=longest;n++)cash+=1+Math.floor((n-2)/4);return {cash:Math.floor(cash*1.5),raw:longest,recordKey:'echo-endless',label:longest+' notes remembered',complete:false};}
 if(type==='pairs'){const total=count('total',12),matched=count('matched',12),moves=count('moves'),board=PAIR_BOARDS[total];if(!board||matched>total||moves<matched||!Number.isFinite(s.left)||s.left<0||s.left>board.seconds)throw Error('That board progress did not look right.');const complete=matched===total,efficiency=Math.max(0,Math.min(1,(total*3-moves)/(total*1.5))),bonus=complete?Math.floor(board.cash*.5*efficiency):0;return {cash:complete?board.cash+bonus:Math.floor(matched/2),raw:complete?Math.max(1,100000-moves*100+Math.floor(s.left)):0,recordKey:'pairs-'+total,label:complete?'Board cleared':matched+' / '+total+' pairs',complete};}
 throw Error('Choose a pet game.');
}
export function arcadeStats(g){return g.type==='catch'?{caught:g.caught,misses:g.practice?0:g.misses,hits:g.practice?0:g.hits,heals:g.practice?0:g.heals||0,bestCombo:g.bestCombo}:g.type==='echo'?{longest:g.longest,mistakes:g.practice?0:g.mistakes,heals:g.practice?0:g.heals||0}:{total:g.total,matched:g.matched.length/2,moves:g.moves,left:g.left};}
export function arcadeSnapshot(g){
 const keys=['type','level','actor','petId','sessionId','claimRequestId','practice','ready','done','total','cards','flipped','matched','moves','left','preview','delay','waiting','combo','bestCombo','started','sequence','input','longest','mistakes','replays','echoPhase','caught','misses','hits','heals','nextHeart','heartDue','magnet','slow','powerCooldown','cloudRun','verseMistakes','peeked','lives','targetX','basketX','spawn','serial','spawnX','previousCloud','recovery','elapsed'];
 const result={version:2};for(const key of keys)if(g[key]!==undefined)result[key]=g[key];
 if(g.objects)result.objects=g.objects.map(({id,x,y,cloud,heart,power,fast})=>({id,x,y,cloud,...(heart?{heart:true}:{}),...(power?{power}:{}),...(fast?{fast:true}:{})}));
 return JSON.parse(JSON.stringify(result));
}
// Only resume structurally complete snapshots. A partial/old save must not
// crash a controller or turn malformed indices into an uncollectable run.
export function validArcadeSnapshot(g,session,actor,petIds){
 try{
  if(!g||g.version!==2||g.practice||g.ready!==true||g.actor!==actor||!petIds.includes(g.petId)||g.petId!==session?.petId||g.sessionId!==session.id||session.done||g.type!==session.game)return false;
  arcadeResult(g.type,arcadeStats(g));
  const finite=(key,min=0,max=1e9)=>Number.isFinite(g[key])&&g[key]>=min&&g[key]<=max;
  if(g.type==='pairs'){
   if(g.total!==session.level||!Array.isArray(g.cards)||g.cards.length!==g.total*2||!g.cards.every(c=>/^(sun|moon|star|heart|orbit|cloud)( [AB])?$|^(bowl|soap|oven|friends|basket|music)$/.test(c)))return false;
   const indices=a=>Array.isArray(a)&&a.every(n=>Number.isInteger(n)&&n>=0&&n<g.cards.length)&&new Set(a).size===a.length;
   if(!indices(g.matched)||!indices(g.flipped)||g.flipped.length>2||g.matched.length%2||g.flipped.some(n=>g.matched.includes(n))||!finite('preview',0,3)||!finite('delay',-.1,1)||typeof g.waiting!=='boolean')return false;
   const counts=new Map();for(const card of g.cards)counts.set(card,(counts.get(card)||0)+1);if([...counts.values()].some(n=>n!==2))return false;
   for(let i=0;i<g.matched.length;i+=2)if(g.cards[g.matched[i]]!==g.cards[g.matched[i+1]])return false;
   return finite('combo')&&finite('bestCombo');
  }
  if(g.type==='echo')return Array.isArray(g.sequence)&&g.sequence.length>=2&&g.sequence.length<=4096&&g.sequence.every(n=>[0,1,2,3].includes(n))&&g.longest<=g.sequence.length&&Array.isArray(g.input)&&g.input.length<=g.sequence.length&&g.input.every((n,i)=>n===g.sequence[i])&&['watch','repeat','nice','retry'].includes(g.echoPhase)&&finite('replays');
  return Array.isArray(g.objects)&&g.objects.length<=40&&g.objects.every(o=>o&&Number.isInteger(o.id)&&typeof o.cloud==='boolean'&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&o.x>=28&&o.x<=292&&o.y>=-35&&o.y<=300)&&finite('basketX',28,292)&&finite('targetX',28,292)&&finite('spawn',-1,2)&&finite('elapsed')&&finite('recovery',0,1.1)&&Number.isInteger(g.serial)&&g.serial>=0&&finite('combo')&&g.lives===3-g.misses-g.hits+(g.heals||0);
 }catch{return false;}
}
export function logicalStroke(from,to,visit){
 const distance=Math.hypot(to.x-from.x,to.y-from.y);
 // Resample at a fixed game-space distance, independent of display scale.
 const steps=Math.max(1,Math.ceil(distance/3));
 for(let i=1;i<=steps;i++)if(visit(from.x+(to.x-from.x)*i/steps,from.y+(to.y-from.y)*i/steps,distance/steps)===false)break;
}

// Original, dependency-free prototype. No Firebase, production credentials or network calls.
import {arcadeResult} from './star-gameplay.mjs';
// Renderers consume snapshots; they never own balances, elapsed time or shared-care rules.
export const HOUR=3600000, DAY=24*HOUR, VERSION=3;
export const EGG_DURATION=DAY, REST_ENERGY_PER_HOUR=26;
export const COFFEE={id:'coffee',name:'coffee',price:30,energy:50};
// Legacy pairs migrate into one owned, complete look. No wearable stacking.
export const CURATED_PAIR_LOOKS={'beanie:sweater':'cozy','witch:cape':'wizard','sleepcap:pajamas':'bedtime','bow:scarf':'picnic'};
export const WEARABLE_TIERS={beginner:{name:'Beginner',rate:1},apprentice:{name:'Apprentice',rate:3},master:{name:'Master',rate:5}};
export function selectWardrobe(equipped,slot,item){
 if(['hat','outfit'].includes(slot))slot='wearable';
 const next={...equipped,[slot]:item};delete next.hat;delete next.outfit;return next;
}
export const NEED_DECAY={food:3,clean:2,joy:2.5,energy:4};
const NEED_MESSAGES={food:['is hungry','Time to feed.'],clean:['needs a bath','Time to wash.'],joy:['is bored','Time to play.'],energy:['is sleepy','Time to rest.']};
// Persisted per need and per pet, independently of the short notification history.
// Recovering above zero re-arms that need; polling or reinstalling does not.
function reconcileNeeds(s,now){
 s.needAlerts??={};
 for(const key of Object.keys(NEED_DECAY)){
  const a=s.needAlerts[key]??={cycle:0,empty:false,at:0,sent:{}};
  if(s.born&&s.needs[key]<=0){if(!a.empty){a.cycle++;a.empty=true;a.at=now;a.sent={};}}
  else {a.empty=false;a.sent={};}
 }
}
// Lookup tables used for validation must not accept inherited object keys.
export const PEOPLE=Object.freeze(Object.assign(Object.create(null),{him:'Emilio',her:'Anely'}));
export const FORMS={
 golden:{name:'golden star',icon:'✦',care:'a little of everything',line:'A little sunshine, a little mischief. Entirely yours.',animation:'golden'},
 dwarf:{name:'dwarf star',icon:'✧',care:'quiet nest & lullabies',line:'Pocket-sized. Blanket-sized ambitions.',animation:'dwarf'},
 giant:{name:'red giant',icon:'☀',care:'warm hands & cuddles',line:'A very large hug in a very small room.',animation:'giant'},
 neutron:{name:'neutron star',icon:'✺',care:'tap a little rhythm',line:'Tiny lighthouse. Excellent sense of rhythm.',animation:'neutron'},
 blackhole:{name:'black hole',icon:'◉',care:'roll a little orbit',line:'Has eaten one sock. Denies everything.',animation:'blackhole'}
};
export const EGG_CARE=[{id:'dwarf',name:'a quiet nest',icon:'☾',verb:'tucked the egg into a quiet nest'},{id:'giant',name:'warm little hands',icon:'♡',verb:'warmed the egg with a long cuddle'},{id:'neutron',name:'tap a tiny rhythm',icon:'♫',verb:'tapped a little rhythm for the egg'},{id:'blackhole',name:'roll a little orbit',icon:'◉',verb:'rolled a stardust orbit around the egg'}];
export const ECONOMY={starter:40,practiceCap:40,practiceRate:.2,petGameCap:3,ritualReward:6,wordPoints:[100,40,30,20,10],arcadeCap:90,recordBonus:10};
export const STAGES=[{id:'baby',name:'baby spark',time:2,care:1,growth:30},{id:'little',name:'little star',time:3,care:2,growth:60},{id:'teen',name:'teen star',time:4,care:3,growth:90},{id:'grown',name:'grown star',time:6,care:4,growth:130},{id:'final',name:'final form',time:0,care:0,growth:0}];
// Stages that began before the v2 pacing keep their original goals; the next
// stage a star enters uses STAGES. Only time/care/growth are read from here.
export const LEGACY_STAGES=[{time:3,care:1,growth:4},{time:3,care:2,growth:40},{time:3,care:3,growth:80},{time:7,care:5,growth:200},{time:0,care:0,growth:0}];
export const PHASE_PACING=2;
export const FOODS=[{id:'porridge',name:'homemade star porridge',icon:'🥣',price:null,food:32,joy:5},{id:'milk',name:'moon milk',icon:'🥛',price:12,food:32,joy:3},{id:'toast',name:'sunbeam toast',icon:'🍞',price:15,food:38,joy:2},{id:'berry',name:'berry-cloud pudding',icon:'🍮',price:25,food:32,joy:12},{id:'soup',name:'pumpkin soup',icon:'🥣',price:22,food:40,joy:8,season:'spooky'},{id:'cocoa',name:'snowflake cocoa',icon:'☕',price:25,food:30,joy:12,season:'christmas'}];
export const PET_GAMES={catch:{name:'Wish catcher',energy:16,food:10,clean:16,joy:12,form:'blackhole'},pairs:{name:'Star pairs',energy:12,food:6,clean:4,joy:8,form:'neutron'},echo:{name:'Little echo',energy:8,food:4,clean:2,joy:6,form:'dwarf'}};
export const COOK_BONUS={golden:'one extra portion',dwarf:'one cozy pudding',giant:'two extra portions',neutron:'one energizing moon milk',blackhole:'one extra portion & tidies the mess'};
export function playNeeds(s,now){const v=projectStar(s,now),needs=[];if(!v.born)needs.push('let the egg hatch');if(v.vacation)needs.push('resume care');if(longRest(v,now))needs.push('let your star sleep until 8 a.m.');else if(v.sleepUntil>now)needs.push('let your star wake');if(v.born){if(v.needs.food<25)needs.push('a snack');if(v.needs.clean<25)needs.push('a bath');if(v.needs.energy<25)needs.push('a nap');if(v.needs.joy<15)needs.push('a cuddle');}return needs;}
export const SHOP=[
 {id:'bow',name:'little lilac bow',slot:'wearable',price:180,icon:'🎀',look:'bow'},
 {id:'beanie',name:'sleepy beanie',slot:'wearable',price:240,icon:'🧶',look:'beanie'},
 {id:'flower',name:'daisy crown',slot:'wearable',price:300,icon:'🌼',look:'flower'},
 {id:'witch',name:'tiny witch hat',slot:'wearable',price:320,icon:'🧙',look:'witch',season:'spooky'},
 {id:'santa',name:'tiny Santa hat',slot:'wearable',price:320,icon:'🎅',look:'santa',season:'christmas'},
 {id:'scarf',name:'cloud scarf',slot:'wearable',price:220,icon:'🧣',look:'scarf'},
 {id:'overalls',name:'pocket overalls',slot:'wearable',price:350,icon:'🧵',look:'overalls'},
 {id:'cape',name:'little ghost cape',slot:'wearable',price:400,icon:'👻',look:'cape',season:'spooky'},
 {id:'sweater',name:'cozy winter knit',slot:'wearable',price:400,icon:'🧥',look:'sweater',season:'christmas'},
 {id:'lantern',name:'wish lantern',slot:'decor',price:450,icon:'🏮',look:'lantern'},
 {id:'plant',name:'moonflower pot',slot:'decor',price:600,icon:'🪴',look:'plant'},
 {id:'mobile',name:'constellation mobile',slot:'decor',price:950,icon:'✧',look:'mobile'},
 {id:'pumpkin',name:'pumpkin night-light',slot:'decor',price:500,icon:'🎃',look:'pumpkin',season:'spooky'},
 {id:'tree',name:'pocket Christmas tree',slot:'decor',price:650,icon:'🎄',look:'tree',season:'christmas'},
 {id:'cloud-room',name:'cloud nursery',slot:'room',price:0,icon:'☁',look:'cloud'},
 {id:'garden-room',name:'moon garden',slot:'room',price:1800,icon:'🌿',look:'garden'},
 {id:'observatory',name:'little observatory',slot:'room',price:4200,icon:'🔭',look:'observatory'},
 {id:'haunted-room',name:'cozy little haunting',slot:'room',price:2200,icon:'🕯',look:'haunted',season:'spooky'},
 {id:'snow-room',name:'snow-globe room',slot:'room',price:2200,icon:'❄',look:'snow',season:'christmas'},
 {id:'galaxy-room',name:'a galaxy of our own',slot:'room',price:7500,icon:'🌌',look:'galaxy'},
 {id:'sprout',name:'one ambitious sprout',slot:'wearable',price:200,icon:'🌱',look:'sprout'},
 {id:'sleepcap',name:'sleepy cloud cap',slot:'wearable',price:260,icon:'🌙',look:'sleepcap'},
 {id:'chef',name:'tiny chef hat',slot:'wearable',price:300,icon:'👨‍🍳',look:'chef'},
 {id:'halo',name:'slightly crooked halo',slot:'wearable',price:450,icon:'😇',look:'halo'},
 {id:'raincoat',name:'puddle patrol coat',slot:'wearable',price:320,icon:'🧥',look:'raincoat'},
 {id:'pajamas',name:'constellation pajamas',slot:'wearable',price:380,icon:'💤',look:'pajamas'},
 {id:'stardress',name:'meteor shower dress',slot:'wearable',price:450,icon:'✨',look:'stardress'},
 {id:'aquarium',name:'one very small sea',slot:'decor',price:1200,icon:'🐠',look:'aquarium'},
 {id:'booknook',name:'books bigger than you',slot:'decor',price:950,icon:'📚',look:'booknook'},
 {id:'planetlamp',name:'Saturn night-light',slot:'decor',price:800,icon:'🪐',look:'planetlamp'},
 {id:'bakery-room',name:'the moonbeam bakery',slot:'room',price:3000,icon:'🥐',look:'bakery'},
 {id:'aurora-room',name:'northern lights nook',slot:'room',price:5000,icon:'🌠',look:'aurora'},
 {id:'cozy',name:'cloud-knit set',slot:'wearable',price:800,look:'cozy',tier:'apprentice',aura:'cold',description:'Beanie & fitted star sweater.'},
 {id:'wizard',name:'starlight mage set',slot:'wearable',price:850,look:'wizard',tier:'apprentice',aura:'heavy',description:'Wizard hat & clasped cape.'},
 {id:'bedtime',name:'night-sky set',slot:'wearable',price:800,look:'bedtime',tier:'apprentice',aura:'astral',description:'Nightcap & constellation pajamas.'},
 {id:'picnic',name:'sunny picnic set',slot:'wearable',price:700,look:'picnic',tier:'apprentice',aura:'warm',description:'Ribbon & wrapped scarf.'},
 {id:'ember-regalia',name:'sunfire regalia',slot:'wearable',price:2400,look:'ember-regalia',tier:'master',aura:'warm',description:'Solar crown, embroidered coat & cape.'},
 {id:'frost-traveler',name:'frost traveler',slot:'wearable',price:2400,look:'frost-traveler',tier:'master',aura:'cold',description:'Crystal hood, fur-lined coat & scarf.'},
 {id:'astral-oracle',name:'astral oracle',slot:'wearable',price:2800,look:'astral-oracle',tier:'master',aura:'astral',description:'Crescent diadem & constellation robes.'},
 {id:'void-monarch',name:'void monarch',slot:'wearable',price:2800,look:'void-monarch',tier:'master',aura:'heavy',description:'Amethyst crown, mantle & royal coat.'},
 {id:'rewind',name:'little yesterday drop',slot:'magic',price:4500,icon:'💧',look:'rewind',description:'Use once: return one stage. Keeps belongings and memories.'},
 {id:'age',name:'bottled tomorrow',slot:'magic',price:3500,icon:'⏳',look:'age',description:'Use once: advance one stage with the care history you have now.'},
 {id:'stasis',name:'pause-pocket watch',slot:'magic',price:900,icon:'⌚',look:'stasis',description:'Reusable: pause or resume evolution. Everyday needs keep going.'}
];
export const AURAS={warm:{name:'warm',form:'giant'},cold:{name:'cold',form:'dwarf'},astral:{name:'astral',form:'neutron'},heavy:{name:'heavy',form:'blackhole'}};
const auraItems={warm:['santa','scarf','sweater','chef','raincoat','lantern','pumpkin','tree','bakery-room'],cold:['beanie','flower','sleepcap','pajamas','sprout','plant','aquarium','garden-room','snow-room'],astral:['bow','halo','stardress','mobile','planetlamp','observatory','aurora-room'],heavy:['witch','overalls','cape','booknook','haunted-room','galaxy-room']};
for(const item of SHOP){item.aura??=Object.keys(auraItems).find(k=>auraItems[k].includes(item.id))||null;if(item.aura){item.tier??=item.price>=2400?'master':item.price>=800?'apprentice':'beginner';item.auraRate=WEARABLE_TIERS[item.tier].rate;}}
export function auraRates(s){const rates={warm:0,cold:0,astral:0,heavy:0};for(const [slot,id] of Object.entries(s.equipped||{})){const item=SHOP.find(i=>i.id===id&&i.slot===slot);if(item?.aura&&s.owned.includes(id))rates[item.aura]+=item.auraRate;}return rates;}
// Rates change only from migration time, never backdate a new 3/5-point rate.
function migrateWardrobe(s,now){
 const eq=s.equipped||{};if(s.auraSchema===2&&!('hat' in eq)&&!('outfit' in eq))return;
 const elapsed=Math.max(0,now-(s.auraAt??now));s.auraTime??={warm:0,cold:0,astral:0,heavy:0};
 if(!s.pausedAt&&!s.vacation&&!s.evolvedAt)for(const id of new Set(Object.values(eq))){
  const item=SHOP.find(i=>i.id===id);if(item?.aura&&s.owned.includes(id))s.auraTime[item.aura]=Math.min(1e12,(s.auraTime[item.aura]||0)+elapsed);
 }
 let wearable=eq.wearable||eq.outfit||eq.hat||null;
 const pair=CURATED_PAIR_LOOKS[eq.hat+':'+eq.outfit];
 if(pair&&s.owned.includes(eq.hat)&&s.owned.includes(eq.outfit)){if(!s.owned.includes(pair))s.owned.push(pair);wearable=pair;}
 s.equipped={wearable,decor:eq.decor||null,room:eq.room||'cloud-room'};s.auraAt=now;s.auraSchema=2;
}
export function auraPoints(s){return Object.fromEntries(Object.keys(AURAS).map(k=>[k,Math.floor((s.auraTime?.[k]||0)/HOUR)]));}
// 24 hourly aura points carry the same influence as one remembered care moment.
// This keeps a full outfit helpful without making active care irrelevant.
function pathWeights(s,base=s.affinity){const weights={...base},points=auraPoints(s);for(const [a,def] of Object.entries(AURAS))weights[def.form]=(weights[def.form]||0)+points[a]/24;return weights;}
export const RITUALS=[
 {id:'picnic',name:'a cloud picnic',icon:'🧺',steps:['pack the snack','bring the blanket'],reward:6,need:'food',boost:35,story:'You packed a picnic together. Pip ate the corners of the blanket. Naturally.'},
 {id:'bath',name:'bubble teamwork',icon:'🫧',steps:['make the bubbles','rinse & towel'],reward:6,need:'clean',boost:50,story:'One made the bubbles. One handled the towel. Pip supervised very seriously.'},
 {id:'bedtime',name:'a two-person lullaby',icon:'♫',steps:['hum the first verse','tuck the star in'],reward:6,need:'joy',boost:25,story:'Your two halves of a lullaby became Pip’s favorite song.'}
];
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function clock(now){const p=Object.fromEntries(fmt.formatToParts(new Date(now)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return {day:`${p.year}-${p.month}-${p.day}`,hour:+p.hour,minute:+p.minute};}
export function longRest(s,now){const h=clock(now).hour;return !!s.born&&(h>=22||h<8);}
export function roomTime(now){const {hour,minute}=clock(now),h=hour+minute/60;return h>=22||h<6?'night':h<8?'dawn':h<18?'day':h<20?'dusk':'night';}
export const seasonAt=now=>{const m=+clock(now).day.slice(5,7);return m===10?'spooky':m===12?'christmas':'normal';};
export const available=(item,now)=>!item.season||item.season===seasonAt(now);
export function freshStar(now){return {version:VERSION,revision:0,name:'Pip',born:false,wishes:{},eggCare:[],form:null,affinity:{dwarf:0,giant:0,neutron:0,blackhole:0},auraTime:{warm:0,cold:0,astral:0,heavy:0},auraAt:now,auraSchema:2,evolvedAt:0,phaseAt:now,phaseXP:0,phaseDays:[],pausedAt:0,petId:'star-1',otherPet:null,plaques:[],secondAdopted:false,magic:{rewind:0,age:0,stasis:0},transfers:[],pantry:{porridge:2,milk:1,toast:1},playSessions:{},cookSessions:{},createdAt:now,updatedAt:now,lastCareAt:now,seen:{him:now,her:now},needs:{food:72,clean:82,joy:76,energy:78},xp:0,stage:0,careDays:[],wallets:{him:ECONOMY.starter,her:ECONOMY.starter},goal:'garden-room',gameAwards:{},practicePaid:{},practiceBudget:{},earnings:[],owned:['cloud-room'],equipped:{wearable:null,decor:null,room:'cloud-room'},traits:{gentle:0,playful:0,curious:0},daily:{},rituals:{},sleepUntil:0,coffeeUsedAt:0,vacation:false,actions:[],memories:[],receipts:[],pings:[],pingBudget:{},prefs:{him:{enabled:true,care:true,team:true,milestones:true,quiet:true},her:{enabled:true,care:true,team:true,milestones:true,quiet:true}}};}
export function eggProgress(s,now=s.updatedAt){
 const care=s.eggCare||[],days=new Set(care.map(c=>c.day)).size,counts=Object.fromEntries(EGG_CARE.map(c=>[c.id,0]));
 care.forEach(c=>{if(c.form in counts)counts[c.form]++;});
 const ranked=Object.entries(pathWeights(s,counts)).sort((a,b)=>b[1]-a[1]);
 const form=ranked[0][1]>0&&ranked[0][1]>ranked[1][1]?ranked[0][0]:'golden';
 const ageDays=Math.max(0,((s.pausedAt||now)-s.phaseAt)/DAY);
 return {days:s.phaseDays.length,count:care.length,counts,form,ageDays,ready:!s.pausedAt&&ageDays>=EGG_DURATION/DAY&&s.phaseDays.length>=1&&!!s.wishes.him&&!!s.wishes.her};
}
export function stageProgress(s,now){
 if(s.evolvedAt||s.born&&s.stage===STAGES.length-1)return {percent:100,label:'Final form · yours forever',daysLeft:0,careLeft:0,growthLeft:0,timeLeft:0,timeLabel:'ready'};
 const phase=(s.phasePacing===PHASE_PACING?STAGES:LEGACY_STAGES)[s.stage],target=!s.born?{time:EGG_DURATION/DAY,care:1,xp:0}:{time:phase.time,care:phase.care,xp:phase.growth};
 const age=Math.max(0,((s.pausedAt||now)-s.phaseAt)/DAY),percent=Math.floor(100*Math.min(1,age/target.time,s.phaseDays.length/target.care,target.xp?s.phaseXP/target.xp:1));
 const timeLeft=Math.max(0,(target.time-age)*DAY),timeLabel=timeLeft>DAY?Math.ceil(timeLeft/DAY)+' days':timeLeft>2*HOUR?Math.ceil(timeLeft/HOUR)+' hours':timeLeft>0?Math.ceil(timeLeft/60000)+' min':'time ready';
 return {percent,label:s.pausedAt?'Evolution paused':!s.born?'Next: baby spark':'Next: '+(STAGES[s.stage+1]?.name||'final form'),daysLeft:Math.max(0,Math.ceil(target.time-age)),timeLeft,timeLabel,careLeft:Math.max(0,target.care-s.phaseDays.length),growthLeft:Math.max(0,target.xp-s.phaseXP)};
}
function restartPhase(s,now){s.phaseAt=now;s.phasePacing=PHASE_PACING;s.phaseXP=0;s.phaseDays=[];if(s.pausedAt)s.pausedAt=now;}
export const PET_FIELDS='petId name born wishes eggCare form affinity auraTime auraAt auraSchema evolvedAt phaseAt phasePacing phaseXP phaseDays pausedAt createdAt updatedAt lastCareAt seen needs needAlerts xp stage careDays equipped traits rituals sleepUntil coffeeUsedAt vacation growthEvent'.split(' ');
export const petSnapshot=s=>Object.fromEntries(PET_FIELDS.map(k=>[k,clone(s[k]??null)]));
function plaque(s,now){if(!s.evolvedAt||s.plaques.some(p=>p.petId===s.petId))return;s.plaques.push({petId:s.petId,name:s.name,form:s.form,at:now});memory(s,'raised-fully',`Raised a ${FORMS[s.form].name} fully`,`${s.name}, a whole little universe raised by both of you.`,now);}
function growthLook(s){return {life:s.born?STAGES[s.stage].id:'egg',form:s.born?s.form:'egg'};}
function recordGrowth(s,from,now){s.growthEvent={id:`${s.petId}:${s.revision+1}:${now}`,at:now,from,to:growthLook(s)};}
function hatch(s,now){const from=growthLook(s);s.born=true;s.stage=0;s.form=eggProgress(s,now).form;s.createdAt=now;s.lastCareAt=now;s.careDays=[];restartPhase(s,now);recordGrowth(s,from,now);memory(s,'hatch-'+now,`${s.name} hatched`,'A little spark.',now);}
function evolve(s,now){const from=growthLook(s);s.stage++;s.form=evolutionPath(s);if(s.stage===STAGES.length-1)s.evolvedAt=now;restartPhase(s,now);recordGrowth(s,from,now);memory(s,'growth-'+s.stage+'-'+now,s.evolvedAt?`${s.name} became a ${FORMS[s.form].name}`:`${s.name} became a ${STAGES[s.stage].name}`,s.evolvedAt?'All those little days became something extraordinary. Your star’s final form.':'Still changing. Still discovering a whole little universe.',now);plaque(s,now);}
export function evolutionPath(s){const ranked=Object.entries(pathWeights(s)).sort((a,b)=>b[1]-a[1]),sum=ranked.reduce((v,[,n])=>v+n,0);return ranked[0][1]>0&&ranked[0][1]>=sum*.4&&ranked[0][1]>ranked[1][1]?ranked[0][0]:'golden';}
function imprint(s,b,form){if(s.evolvedAt||!Object.hasOwn(s.affinity,form)||(b.imprints||0)>=4)return;s.affinity[form]++;b.imprints=(b.imprints||0)+1;}
export function gameDay(now){const local=clock(now);if(local.hour>=9)return local.day;const d=new Date(local.day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
function validDay(day){return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;}
export function scoreResult(r){
 if(!['word','crossword','search'].includes(r.game))throw Error('Choose one of the three daily games.');
 if(r.game==='word'){
  if(!Number.isInteger(r.attempts)||r.attempts<0||r.attempts>5)throw Error('Use 1–5 guesses, or 0 for an unsolved word.');
  return r.attempts?ECONOMY.wordPoints[r.attempts-1]:0;
 }
 if(!Number.isInteger(r.found)||!Number.isInteger(r.total)||r.total<1||r.total>30||r.found<0||r.found>r.total)throw Error('The board’s completion count is not valid.');
 return Math.round(50*r.found/r.total);
}
export function weeklyPoints(s,actor,now){const day=gameDay(now),start=new Date(day+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);const monday=start.toISOString().slice(0,10);return Object.entries(s.gameAwards||{}).reduce((n,[key,v])=>{const [d,,who]=key.split(':');return n+(who===actor&&d>=monday&&d<=day?v.points:0);},0);}
// These records are simulated authoritative game results. A live version must
// read verified game documents in the same transaction; never accept a client balance.
function rewardGame(s,actor,r,now){
 const score=scoreResult(r),day=gameDay(now);let amount=0,points=0,kind='';
 if(r.source==='daily'){
  if(!validDay(r.day)||r.day>day)throw Error('A daily result needs a completed, available game day.');
  const sunday=new Date(r.day+'T12:00:00Z').getUTCDay()===0;points=score*(sunday?2:1);
  const key=`${r.day}:${r.game}:${actor}`,old=s.gameAwards[key]||{cash:0,points:0};
  amount=Math.max(0,points-old.cash);s.gameAwards[key]={cash:Math.max(points,old.cash),points};kind='daily';
 }else if(r.source==='practice'){
  if(typeof r.board!=='string'||!/^[a-z0-9-]{1,48}$/.test(r.board))throw Error('A practice result needs a stable board ID.');
  if(r.clues!==undefined&&typeof r.clues!=='boolean')throw Error('The clue flag must be true or false.');
  const key=`${actor}:${r.game}:${r.board}`;if(Object.hasOwn(s.practicePaid,key))return {amount:0,points:0,message:'This practice board already had its cash reward. Replay it for fun.'};
  const dailyKey=`${day}:${actor}`,used=s.practiceBudget[dailyKey]||0;
  const reward=Math.floor(score*ECONOMY.practiceRate*(r.game==='word'&&r.clues?.valueOf()? .5:1));
  amount=Math.min(reward,Math.max(0,ECONOMY.practiceCap-used));
  // A zero-result run may be retried. A successful completion is recorded even
  // when the daily allowance is spent, so replays cannot farm tomorrow's allowance.
  if(score>0)s.practicePaid[key]=amount;
  s.practiceBudget[dailyKey]=used+amount;kind='practice';
 }else throw Error('Choose daily games or practice.');
 amount=Math.min(amount,Math.max(0,999999-s.wallets[actor]));s.wallets[actor]+=amount;
 if(amount){s.earnings.push({actor,kind,game:r.game,cash:amount,points,at:now});s.earnings=s.earnings.slice(-16);}
 return {amount,points,message:kind==='practice'?`+${amount} stardust · practice adds 0 weekly points.`:`+${amount} stardust from ${points} game points. Replays and board resets cannot pay twice.`};
}
export function normalizeStar(value,now,nested=false){
 const fallback=freshStar(now);if(!value||value.version!==VERSION)return fallback;
 const s={...fallback,...clone(value)};
 const validAt=n=>Number.isFinite(n)&&n>=0&&n<=now;
 s.petId=['star-1','star-2'].includes(s.petId)?s.petId:'star-1';s.plaques=(Array.isArray(s.plaques)?s.plaques:[]).filter(p=>p&&['star-1','star-2'].includes(p.petId)&&Object.hasOwn(FORMS,p.form)&&validAt(p.at)).filter((p,i,a)=>a.findIndex(x=>x.petId===p.petId)===i).slice(0,2);s.otherPet=null;
 s.needs=Object.fromEntries(Object.keys(fallback.needs).map(k=>[k,clamp(Number.isFinite(value.needs?.[k])?value.needs[k]:fallback.needs[k])]));
 s.needAlerts=Object.fromEntries(Object.keys(NEED_DECAY).map(k=>{const a=value.needAlerts?.[k];return [k,{cycle:clamp(Math.floor(Number(a?.cycle)||0),0,1e9),empty:a?.empty===true,at:clamp(Number(a?.at)||0,0,now),sent:{him:a?.sent?.him===true,her:a?.sent?.her===true}}];}));
 s.wallets=Object.fromEntries(Object.keys(PEOPLE).map(k=>[k,clamp(Math.floor(Number(s.wallets?.[k])||0),0,999999)]));delete s.coins;s.xp=clamp(Number(s.xp)||0,0,99999);s.stage=clamp(Math.floor(Number(s.stage)||0),0,STAGES.length-1);
 s.createdAt=Number.isFinite(s.createdAt)?Math.min(now,s.createdAt):now;s.phaseAt=Number.isFinite(s.phaseAt)?Math.min(now,s.phaseAt):s.createdAt;s.phasePacing=value.phasePacing===PHASE_PACING?PHASE_PACING:1;s.phaseXP=clamp(Number(s.phaseXP)||0,0,99999);s.phaseDays=[...new Set((Array.isArray(s.phaseDays)?s.phaseDays:[]).filter(validDay))];s.pausedAt=Number.isFinite(s.pausedAt)?clamp(s.pausedAt,0,now):0;
 s.magic=Object.fromEntries(['rewind','age','stasis'].map(k=>[k,clamp(Math.floor(Number(s.magic?.[k])||0),0,k==='stasis'?1:99)]));s.transfers=(Array.isArray(s.transfers)?s.transfers:[]).filter(x=>x&&PEOPLE[x.from]&&PEOPLE[x.to]&&Number.isInteger(x.amount)&&x.amount>0).slice(-12);
 s.name=String(s.name||'Pip').trim().slice(0,18)||'Pip';s.updatedAt=Number.isFinite(s.updatedAt)?Math.min(now,s.updatedAt):now;s.lastCareAt=Number.isFinite(s.lastCareAt)?Math.min(now,s.lastCareAt):now;
 s.owned=[...new Set(['cloud-room',...(Array.isArray(s.owned)?s.owned:[]).filter(id=>SHOP.some(i=>i.id===id))])];
 // Other pets share the inventory, but keep their own outfit and aura history.
 if(!nested&&value.otherPet&&value.otherPet.petId!==s.petId){const other=normalizeStar({...fallback,...value.otherPet,owned:s.owned,otherPet:null,plaques:[]},now,true);s.owned=other.owned;s.otherPet=petSnapshot(other);}
 s.secondAdopted=!!s.otherPet||s.petId==='star-2'||s.secondAdopted===true;
 s.equipped={...fallback.equipped,...s.equipped};s.auraSchema=value.auraSchema===2?2:1;
 s.auraAt=Number.isFinite(value.auraAt)?clamp(value.auraAt,0,now):now;
 s.auraTime=Object.fromEntries(Object.keys(AURAS).map(k=>[k,clamp(Number(value.auraTime?.[k])||0,0,1e12)]));
 migrateWardrobe(s,now);for(const slot of Object.keys(fallback.equipped))if(!s.owned.includes(s.equipped[slot])||!SHOP.some(i=>i.id===s.equipped[slot]&&i.slot===slot))s.equipped[slot]=fallback.equipped[slot];
 s.needs=Object.fromEntries(Object.keys(fallback.needs).map(k=>[k,s.needs[k]]));s.traits=Object.fromEntries(Object.keys(fallback.traits).map(k=>[k,clamp(Number(s.traits?.[k])||0,0,99999)]));s.seen=Object.fromEntries(Object.keys(PEOPLE).map(k=>[k,Number.isFinite(s.seen?.[k])?Math.min(now,s.seen[k]):now]));s.wishes=Object.fromEntries(Object.keys(PEOPLE).filter(k=>typeof s.wishes?.[k]==='string').map(k=>[k,s.wishes[k].slice(0,80)]));
 s.prefs=Object.fromEntries(Object.keys(PEOPLE).map(actor=>[actor,Object.fromEntries(Object.entries(fallback.prefs[actor]).map(([key,defaultValue])=>[key,typeof s.prefs?.[actor]?.[key]==='boolean'?s.prefs[actor][key]:defaultValue]))]));
 s.form=Object.hasOwn(FORMS,s.form)?s.form:(s.born?'golden':null);s.goal=SHOP.some(i=>i.id===s.goal&&i.price>0)?s.goal:'garden-room';
 s.eggCare=(Array.isArray(s.eggCare)?s.eggCare:[]).filter(c=>c&&PEOPLE[c.actor]&&validDay(c.day)&&EGG_CARE.some(e=>e.id===c.form)).filter((c,i,a)=>a.findIndex(x=>x.actor===c.actor&&x.day===c.day)===i).slice(-60);
 s.affinity=Object.fromEntries(Object.keys(fallback.affinity).map(k=>[k,clamp(Number(s.affinity?.[k])||0,0,9999)]));s.evolvedAt=s.born&&s.stage===STAGES.length-1?(Number.isFinite(s.evolvedAt)&&s.evolvedAt>0?s.evolvedAt:now):0;
 s.pantry=Object.fromEntries([...FOODS,COFFEE].map(f=>[f.id,clamp(Math.floor(Number(s.pantry?.[f.id])||0),0,99)]));
 s.coffeeUsedAt=validAt(value.coffeeUsedAt)?value.coffeeUsedAt:0;
 for(const field of ['playSessions','cookSessions'])s[field]=Object.fromEntries(Object.entries(s[field]||{}).filter(([actor,v])=>PEOPLE[actor]&&v&&typeof v.id==='string'&&Number.isFinite(v.at)));
 s.gameAwards={};for(const [key,v] of Object.entries(value.gameAwards||{})){const [d,g,a]=key.split(':');if(validDay(d)&&['word','crossword','search'].includes(g)&&PEOPLE[a]&&v&&Number.isInteger(v.cash)&&Number.isInteger(v.points)&&v.cash>=v.points&&v.points>=0&&v.cash<=200)s.gameAwards[key]={cash:v.cash,points:v.points};}
 s.practicePaid={};for(const [key,v] of Object.entries(value.practicePaid||{}))if(/^(him|her):(word|crossword|search):[a-z0-9-]{1,48}$/.test(key)&&Number.isInteger(v)&&v>=0&&v<=20)s.practicePaid[key]=v;
 s.practiceBudget={};for(const [key,v] of Object.entries(value.practiceBudget||{}))if(/^\d{4}-\d{2}-\d{2}:(him|her)$/.test(key)&&Number.isInteger(v)&&v>=0&&v<=ECONOMY.practiceCap)s.practiceBudget[key]=v;
 s.earnings=(Array.isArray(s.earnings)?s.earnings:[]).filter(e=>e&&PEOPLE[e.actor]&&Number.isFinite(e.cash)&&e.cash>=0&&Number.isFinite(e.at)).slice(-16);
 for(const k of ['actions','memories','receipts','pings','careDays'])if(!Array.isArray(s[k]))s[k]=[];
 s.actions=s.actions.slice(-36);s.memories=s.memories.slice(-40);s.receipts=s.receipts.slice(-96);s.pings=s.pings.slice(-24);s.careDays=s.careDays.slice(-90);
 s.receipts=s.receipts.filter(v=>typeof v==='string');s.careDays=[...new Set(s.careDays.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)))];
 s.sleepUntil=Number.isFinite(s.sleepUntil)?s.sleepUntil:0;s.revision=clamp(Math.floor(Number(s.revision)||0),0,999999);s.born=s.born===true;s.vacation=s.vacation===true;
 s.actions=s.actions.filter(a=>PEOPLE[a?.actor]&&typeof a.text==='string'&&validAt(a.at));s.memories=s.memories.filter(m=>typeof m?.id==='string'&&typeof m.title==='string'&&typeof m.text==='string'&&validAt(m.at));s.pings=s.pings.filter(p=>typeof p?.id==='string'&&PEOPLE[p.to]&&typeof p.title==='string'&&typeof p.body==='string'&&['waiting','shown','cancelled'].includes(p.status)&&(!p.dueAt||(Number.isFinite(p.dueAt)&&p.dueAt>=0&&p.dueAt<=now+DAY)));
 s.daily={};for(const [key,b] of Object.entries(value.daily||{}))if(/^\d{4}-\d{2}-\d{2}:(him|her)$/.test(key)&&b&&typeof b==='object')s.daily[key]={care:clamp(Math.floor(Number(b.care)||0),0,6),cookBonuses:clamp(Math.floor(Number(b.cookBonuses)||0),0,3),games:clamp(Math.floor(Number(b.games)||0),0,10),arcadeCash:clamp(Math.floor(Number(b.arcadeCash)||0),0,ECONOMY.arcadeCap),records:(Array.isArray(b.records)?b.records:[]).filter((g,i,a)=>['catch','pairs','echo'].includes(g)&&a.indexOf(g)===i),imprints:clamp(Math.floor(Number(b.imprints)||0),0,4),last:Object.fromEntries(Object.entries(b.last||{}).filter(([k,v])=>['feed','wash','play','cuddle','nap'].includes(k)&&Number.isFinite(v)))};
 s.cookingBest=Object.fromEntries(['him','her'].map(p=>[p,clamp(Math.floor(Number(value.cookingBest?.[p])||0),0,100)]));
 s.cookingRecipeBest=Object.fromEntries(['him','her'].map(p=>[p,Object.fromEntries(['porridge','toast'].map(recipe=>{const stored=value.cookingRecipeBest?.[p]?.[recipe];return [recipe,clamp(Math.floor(Number.isFinite(stored)?stored:recipe==='porridge'?s.cookingBest[p]:0),0,100)];}))]));
 s.arcadeBest=Object.fromEntries(['him','her'].map(p=>[p,Object.fromEntries(Object.entries(value.arcadeBest?.[p]||{}).filter(([k])=>/^(catch|catch-endless|pairs-(4|6|8|10|12)|echo-[468]|echo-endless)$/.test(k)).map(([k,v])=>[k,clamp(Math.floor(Number(v)||0),0,999999999)]))]));
 s.rituals={};for(const r of RITUALS){const p=value.rituals?.[r.id];if(p&&[1,2].includes(p.phase)&&PEOPLE[p.first]&&Number.isFinite(p.startedAt))s.rituals[r.id]=p;}
 s.pingBudget={};for(const [key,b] of Object.entries(value.pingBudget||{}))if(/^\d{4}-\d{2}-\d{2}:(him|her)$/.test(key)&&b&&typeof b==='object')s.pingBudget[key]={count:clamp(Math.floor(Number(b.count)||0),0,2),lastAt:Number(b.lastAt)||0};
 const event=s.growthEvent,validLook=look=>look&&['egg',...STAGES.map(p=>p.id)].includes(look.life)&&['egg',...Object.keys(FORMS)].includes(look.form);
 s.growthEvent=event&&typeof event.id==='string'&&event.id.length<120&&Number.isFinite(event.at)&&validLook(event.from)&&validLook(event.to)&&event.to.life===growthLook(s).life&&event.to.form===growthLook(s).form?{id:event.id,at:event.at,from:event.from,to:event.to}:null;
 plaque(s,now);return s;
}
export function projectStar(input,now){
 const s=clone(input);now=Math.max(s.updatedAt,now);migrateWardrobe(s,now);
 s.auraTime??={warm:0,cold:0,astral:0,heavy:0};const auraElapsed=Math.max(0,now-(s.auraAt??now));
 if(!s.pausedAt&&!s.vacation&&!s.evolvedAt)for(const [key,rate] of Object.entries(auraRates(s)))s.auraTime[key]=Math.min(1e12,(s.auraTime[key]||0)+auraElapsed*rate);
 s.auraAt=now;
 if(s.born&&!s.vacation){
  const elapsed=Math.max(0,now-s.updatedAt)/HOUR;
  for(const key of ['food','clean','joy'])s.needs[key]=clamp(s.needs[key]-elapsed*NEED_DECAY[key]);
  // Split at hour / nap boundaries in timestamp order. The clock handles DST;
  // projecting one long absence must equal many small projections.
  // Two complete nights necessarily restore full energy, even across DST.
  // Bound work for old saves without freezing other needs after an absence.
  const start=Math.max(s.updatedAt,now-48*HOUR);if(start>s.updatedAt)s.needs.energy=0;
  for(let cursor=start;cursor<now;){let next=Math.min(now,(Math.floor(cursor/HOUR)+1)*HOUR);if(s.sleepUntil>cursor)next=Math.min(next,s.sleepUntil);const hours=(next-cursor)/HOUR,asleep=longRest(s,cursor)||cursor<s.sleepUntil;s.needs.energy=clamp(s.needs.energy+hours*(asleep?REST_ENERGY_PER_HOUR:-NEED_DECAY.energy));cursor=next;}
 }
 reconcileNeeds(s,now);s.updatedAt=now;return s;
}
export const restDuration=energy=>Math.ceil((100-clamp(energy))/REST_ENERGY_PER_HOUR*HOUR);
export function restProgress(input,now){
 const s=projectStar(input,now),night=longRest(s,now),sleeping=s.born&&(night||s.sleepUntil>now);
 if(!sleeping||s.vacation)return null;
 const remaining=restDuration(s.needs.energy),fullAt=now+remaining;
 let restEnd=s.sleepUntil;if(night){let morning=(Math.floor(now/HOUR)+1)*HOUR;while(longRest(s,morning))morning+=HOUR;restEnd=Math.max(restEnd,morning);}
 // An old, fixed-length nap may end early. Never promise full energy then.
 const full=fullAt<=restEnd+1;
 return {remaining:full?remaining:Math.max(0,restEnd-now),fullAt:full?fullAt:null,night,overnight:night||longRest(s,restEnd)};
}
export function coffeeStatus(input,now){
 const s=projectStar(input,now);
 if(!s.born)return 'Not hatched yet';
 if(s.vacation)return 'Care paused';
 if(s.coffeeUsedAt&&clock(s.coffeeUsedAt).day===clock(now).day)return 'Used today';
 if(longRest(s,now)||s.sleepUntil>now)return 'Asleep';
 if(s.needs.energy>=99.99)return 'Energy full';
 if(!(s.pantry.coffee>0))return 'No coffee';
 return '';
}
export function mood(s,now){
 if(!s.born)return {id:'wish',label:'Egg',line:'…',cue:null};
 if(s.vacation)return {id:'vacation',label:'Care paused',line:'Paused',cue:null};
 if(longRest(s,now))return {id:'sleep',label:'Asleep · until 8 a.m.',line:'Zzz',cue:'sleep'};
 if(s.sleepUntil>now)return {id:'sleep',label:'Napping',line:'Zzz',cue:'sleep'};
 if(now-s.lastCareAt>=36*HOUR)return {id:'hibernate',label:'Needs care',line:'Hungry',cue:'feed'};
 if(s.needs.food<35)return {id:'hungry',label:'Hungry',line:'Hungry',cue:'feed'};
 if(s.needs.clean<40)return {id:'dusty',label:'Needs a bath',line:'Bath',cue:'wash'};
 if(s.needs.energy<35)return {id:'tired',label:'Sleepy',line:'Sleepy',cue:'sleep'};
 if(s.needs.joy<40)return {id:'lonely',label:'Bored',line:'Play',cue:'catch'};
 return {id:'happy',label:'Happy',line:'',cue:'cuddle'};
}
// Display old saves as short album captions without rewriting their history.
export function albumEntry(m){
 const id=m.id.replace(/^star-\d+:/,'');
 const fixed={'wishes':['First wishes','cuddle'],'first-cook':['First meal','kitchen'],'first-bath':['First bath','wash'],'first-play':['First game','catch'],'first-decor':['First item','pairs']};
 if(fixed[id])return {title:fixed[id][0],icon:fixed[id][1]};
 if(id.startsWith('hatch'))return {title:'Hatched!',icon:'star'};
 if(id.startsWith('ritual-')){const kind=id.split('-')[1];return {title:{picnic:'Picnic',bath:'Bath time',bedtime:'Bedtime'}[kind]||'Together',icon:{picnic:'feed',bath:'wash',bedtime:'sleep'}[kind]||'cuddle'};}
 if(id.startsWith('raised-fully'))return {title:'Fully raised',icon:'star'};
 if(id.startsWith('rewind'))return {title:'A fresh start',icon:'pairs'};
 return {title:m.title.replace(/^.* became (?:a |an )?/,'').slice(0,60),icon:id.startsWith('growth')?'star':'cuddle'};
}
function memory(s,id,title,text,now){id=s.petId+':'+id;if(!s.memories.some(m=>m.id===id))s.memories.push({id,petId:s.petId,title,text:text.replaceAll('Pip',s.name),at:now});s.memories=s.memories.slice(-40);}
function note(s,actor,text,now){s.actions.push({actor,text,at:now});s.actions=s.actions.slice(-36);}
function care(s,actor,now){s.lastCareAt=now;const day=clock(now).day;if(!s.careDays.includes(day))s.careDays.push(day);if(!s.pausedAt&&!s.phaseDays.includes(day))s.phaseDays.push(day);s.careDays=s.careDays.slice(-90);s.seen[actor]=now;}
function budget(s,actor,now){const day=clock(now).day,key=day+':'+actor;s.daily[key]??={care:0,games:0,last:{}};s.daily=Object.fromEntries(Object.entries(s.daily).filter(([k])=>k.startsWith(day)));return s.daily[key];}
// Egg care never doubles as a hatch command, even in the pre-aged demo scene.
function grow(s,now){if(s.pausedAt||s.evolvedAt||!s.born)return;if(stageProgress(s,now).percent===100)evolve(s,now);}
// Background growth must not impersonate a visit or suppress care reminders.
export function settleGrowth(input,now){const s=projectStar(input,now),before=s.growthEvent?.id;if(!longRest(s,now))grow(s,now);if(before!==s.growthEvent?.id)s.revision++;return s;}
// Bounded skill rewards: free food remains available after a rough round;
// excellent execution is useful without becoming an unlimited cash faucet.
export function cookingReward(score){
 if(!Number.isInteger(score)||score<0||score>100)throw Error('Cooking score must be 0–100.');
 return score===100?{portions:4,tip:8,label:'PERFECT'}:score>=90?{portions:3,tip:5,label:'GOLD'}:score>=70?{portions:2,tip:2,label:'SILVER'}:{portions:1,tip:0,label:'HOMEMADE'};
}
// The result screen and settlement use the same helper and wallet rules.
export function cookingPayout(s,actor,session,score,now){
 const reward=cookingReward(score),form=longRest(s,now)?null:session?.form;
 const extra=form==='giant'?2:['golden','blackhole'].includes(form)?1:0;
 const used=s.daily[clock(now).day+':'+actor]?.cookBonuses||0;
 return {...reward,form,portions:reward.portions+extra,tip:used>=3?0:Math.min(reward.tip,Math.max(0,999999-s.wallets[actor])),extraFood:form==='dwarf'?'berry':form==='neutron'?'milk':null};
}
export function applyAction(input,{actor,type,id,payload={},expectedRevision},now){
 if(!PEOPLE[actor])throw Error('Choose one of the two people.');
 if(typeof id!=='string'||id.length<5||id.length>90)throw Error('This action needs a safe request ID.');
 if(input.receipts.includes(id))return {state:clone(input),duplicate:true,message:'Already saved. No double charge.',effect:null};
 if(expectedRevision!==undefined&&expectedRevision!==input.revision)throw Error('The other phone changed the nursery. Refresh the snapshot and try again.');
 const s=projectStar(input,now);now=s.updatedAt;const b=budget(s,actor,now);let message='',effect=type;
 if(!s.born&&!['wish','incubate','hatch','rename','visit','prefs','game-reward','goal','start-cook','cook','buy-food','transfer','buy','equip','magic','adopt-second','switch-pet'].includes(type))throw Error('Leave your wishes and give the egg a little care before it hatches.');
 if(s.vacation&&!(type==='play'&&payload.arcade)&&!['vacation','prefs','visit','rename','equip','game-reward','goal','start-cook','cook','buy-food','transfer','magic','buy','adopt-second','switch-pet'].includes(type))throw Error('The nursery is on holiday. Resume care when you’re ready.');
 if(s.sleepUntil>now&&['feed','wash'].includes(type))throw Error('The star is sleeping. Wake gently first, or leave a cuddle.');
 if(longRest(s,now)&&(['feed','wash','cuddle','start-play','ritual','nap','wake'].includes(type)||(type==='play'&&!payload.arcade)||(type==='start-cook'&&payload.withPet)||(type==='magic'&&payload.item!=='stasis')))throw Error('Long rest: 10 p.m.–8 a.m. Let your star sleep. Solo cooking and the shop are still open.');
 if(type==='adopt-second'){
  if(s.secondAdopted||s.otherPet)throw Error('Two little stars is the nursery limit.');
  plaque(s,now);if(!s.plaques.length)throw Error('Raise your first star fully before welcoming another.');
  const first=petSnapshot(s),baby=freshStar(now);baby.petId='star-2';baby.name='Nova';Object.assign(s,petSnapshot(baby));s.otherPet=first;s.secondAdopted=true;message='Second egg adopted.';effect='together';
 }else if(type==='switch-pet'){
  if(!s.otherPet)throw Error('There is no second star yet.');
  const previous=petSnapshot(s),target=projectStar({...s,...s.otherPet,otherPet:null},now);Object.assign(s,petSnapshot(target));s.otherPet=previous;message=`Visiting ${s.name}.`;effect=null;
 }else if(type==='wish'){
  if(s.born||s.wishes[actor])throw Error('Your wish is already tucked in. It’s the other person’s turn.');
  s.wishes[actor]=String(payload.text||'a safe place, together').slice(0,80);message='Ready.';
  if(s.wishes.him&&s.wishes.her){restartPhase(s,now);message='Egg ready · 1 day to hatch.';memory(s,'wishes','Two wishes, one little universe','Your nursery began with a wish from each of you.',now);}
 }else if(type==='incubate'){
  if(s.born)throw Error('Your star has already hatched. Care for your little spark now.');
  if(!s.wishes.him||!s.wishes.her)throw Error('One wish from each of you first.');
  const choice=EGG_CARE.find(c=>c.id===payload.form);if(!choice)throw Error('Choose a way to care for the egg.');
  const day=clock(now).day;if(s.eggCare.some(c=>c.actor===actor&&c.day===day))throw Error('Your care is tucked in for today. Extra cuddles are always welcome.');
  s.eggCare.push({actor,day,form:choice.id});s.eggCare=s.eggCare.slice(-60);s.affinity[choice.id]+=2;care(s,actor,now);effect='egg-'+choice.id;message=`${PEOPLE[actor]} ${choice.verb}.`;
  if(eggProgress(s,now).ready)message+=' The egg is ready. Meet your little star whenever you’re ready.';
 }else if(type==='hatch'){
  if(s.born)throw Error('Your little star has already hatched.');
  if(!eggProgress(s,now).ready)throw Error('The egg needs both wishes, a little care and one full day before hatching.');
  hatch(s,now);effect='hatch';message=`${s.name} is hatching!`;
 }else if(type==='game-reward'){message=rewardGame(s,actor,payload,now).message;effect='reward';
 }else if(type==='goal'){if(!SHOP.some(i=>i.id===payload.item&&i.price>0))throw Error('Choose a shop item to save for.');s.goal=payload.item;message='Goal saved.';effect=null;
 }else if(type==='buy-food'){
  const f=[...FOODS,COFFEE].find(f=>f.id===payload.food&&available(f,now)&&f.price!==null);if(!f)throw Error('Choose a snack from the shop.');if((s.pantry[f.id]||0)>=99)throw Error('The pantry is full of that snack already.');if(s.wallets[actor]<f.price)throw Error('A few more coins, or cook a free meal in the kitchen.');s.wallets[actor]-=f.price;s.pantry[f.id]=(s.pantry[f.id]||0)+1;message=`One ${f.name}, in the pantry.`;
 }else if(type==='coffee'){
  const reason=coffeeStatus(s,now);if(reason)throw Error(reason==='Used today'?'One coffee per star per day. Try again tomorrow.':reason+'.');
  const gain=Math.min(COFFEE.energy,100-s.needs.energy);s.pantry.coffee--;s.coffeeUsedAt=now;s.needs.energy=clamp(s.needs.energy+COFFEE.energy);message=`Coffee · +${Math.round(gain)} energy`;effect='stretch';
 }else if(type==='start-cook'){
  const recipe=payload.recipe==='toast'?'toast':'porridge';
  const maxBatch=4+(payload.withPet?(s.form==='giant'?2:['golden','blackhole'].includes(s.form)?1:0):0);
  if((s.pantry[recipe]||0)>99-maxBatch)throw Error('Make room for a full batch in the pantry. Serve some '+recipe+' first.');
  if(payload.withPet){const needs=playNeeds(s,now);if(needs.length)throw Error(`Cook solo for now. Your star needs ${needs.join(', ')}.`);s.needs.energy=clamp(s.needs.energy-8);s.needs.clean=clamp(s.needs.clean-8);s.needs.food=clamp(s.needs.food-3);}
  s.cookSessions[actor]={id,petId:s.petId,at:now,recipe,form:payload.withPet?s.form:null,done:false};message='Ready to cook.';effect=null;
 }else if(type==='cook'){
  const session=s.cookSessions[actor];if(!session||session.id!==payload.sessionId||session.petId!==s.petId||session.done)throw Error('Start a fresh recipe; this batch cannot be collected twice.');
  const graded=payload.grades!==undefined;
  // Accept the previous demo's completed-step marker for pending retries.
  // New batches send four; all graded receipts still require four real grades.
  if(!Number.isInteger(payload.steps)||(graded?![3,4].includes(payload.steps):payload.steps!==3))throw Error('Finish every cooking station first.');session.done=true;
  if(graded&&(!Array.isArray(payload.grades)||payload.grades.length!==4||payload.grades.some(n=>!Number.isInteger(n)||n<0||n>100)))throw Error('Finish the four scored stations first.');
  const score=graded?Math.floor(payload.grades.reduce((a,v)=>a+v,0)/4):70,reward=cookingReward(score);
  const payout=cookingPayout(s,actor,session,score,now),{form,portions}=payout;
  let tip=0;if(graded&&payout.tip){tip=payout.tip;s.wallets[actor]+=tip;b.cookBonuses=(b.cookBonuses||0)+1;}
  if(graded){s.cookingBest=s.cookingBest||{};s.cookingBest[actor]=Math.max(s.cookingBest[actor]||0,score);}
  const dish=session.recipe==='toast'?'toast':'porridge';s.pantry[dish]=Math.min(99,(s.pantry[dish]||0)+portions);s.cookingRecipeBest??={};s.cookingRecipeBest[actor]??={};s.cookingRecipeBest[actor][dish]=Math.max(s.cookingRecipeBest[actor][dish]||0,score);
  if(form==='dwarf')s.pantry.berry=Math.min(99,(s.pantry.berry||0)+1);if(form==='neutron')s.pantry.milk=Math.min(99,(s.pantry.milk||0)+1);if(form==='blackhole')s.needs.clean=clamp(s.needs.clean+8);
  if(form){s.needs.joy=clamp(s.needs.joy+10);imprint(s,b,form==='golden'?'giant':form);care(s,actor,now);}
  message=`${portions} homemade meals in the pantry.${graded?' '+reward.label+' · '+score+'%.':''}${tip?' +'+tip+' stardust chef bonus.':''}${form?' '+COOK_BONUS[form]+'.':' Cooked by you. Tiny chef, optional.'}`;effect='cook';memory(s,'first-cook','Your first homemade meal','A little chopping, a little stirring. A whole lot of love in a bowl.',now);
 }else if(type==='start-play'){
  if(!Object.hasOwn(PET_GAMES,payload.game))throw Error('Choose a pet game.');const definition=PET_GAMES[payload.game];const needs=playNeeds(s,now);if(needs.length)throw Error(`Before another game: ${needs.join(', ')}.`);
  if(payload.arcadeVersion===2&&payload.game==='pairs'&&![8,10,12].includes(payload.level))throw Error('Choose an 8, 10 or 12 pair board.');
  for(const k of ['energy','food','clean'])s.needs[k]=clamp(s.needs[k]-definition[k]);s.needs.joy=clamp(s.needs.joy+definition.joy);s.playSessions[actor]={id,petId:s.petId,game:payload.game,at:now,done:false,arcadeVersion:payload.arcadeVersion===2?2:1,level:payload.level};imprint(s,b,definition.form);care(s,actor,now);message='Ready.';effect=null;
 }else if(type==='rename'){
  const name=String(payload.name||'').trim();if(!name||name.length>18)throw Error('A name needs 1–18 characters.');s.name=name;message='Name saved.';
 }else if(type==='visit'){s.seen[actor]=now;message='Hello!';effect='cuddle';
 }else if(type==='feed'||type==='wash'||type==='cuddle'||type==='play'){
  const cooldown={feed:0,wash:0,cuddle:.25,play:0}[type]*HOUR;
  if(now-(b.last[type]||0)<cooldown)throw Error('That just happened. Try again later.');
  const target={feed:'food',wash:'clean',cuddle:'joy',play:'joy'}[type],meaningful=s.needs[target]<90;
  if(type==='feed'){
   const food=FOODS.find(f=>f.id===payload.food);if(!food)throw Error('Choose a snack from the pantry.');if(s.needs.food>94)throw Error('Quite full already. Save that snack for a little later.');if(!(s.pantry[food.id]>0))throw Error('The pantry needs that snack. Buy it or cook a free meal.');
   s.pantry[food.id]--;s.needs.food=clamp(s.needs.food+food.food);s.needs.joy=clamp(s.needs.joy+food.joy);if(food.id==='milk')s.needs.energy=clamp(s.needs.energy+6);s.needs.clean=clamp(s.needs.clean-3);s.traits.gentle++;if(meaningful)imprint(s,b,'giant');message='Yum!';
  }else if(type==='wash'){s.needs.clean=100;s.needs.joy=clamp(s.needs.joy+8);s.traits.curious++;if(meaningful)imprint(s,b,'neutron');message='All clean!';memory(s,'first-bath','First bath','',now);
  }else if(type==='cuddle'){s.needs.joy=clamp(s.needs.joy+22);s.needs.energy=clamp(s.needs.energy+3);s.traits.gentle++;if(meaningful)imprint(s,b,'giant');message='Happy!';
  }else{
   if(!['catch','pairs','echo'].includes(payload.game)||(!payload.arcade&&(!Number.isInteger(payload.score)||payload.score<0||payload.score>10)))throw Error('That game result did not look right.');
   const session=s.playSessions[actor];if(!session||session.id!==payload.sessionId||session.petId!==s.petId||session.game!==payload.game||session.done)throw Error('Start a new game; that play cannot be rewarded twice.');session.done=true;s.traits.playful++;
   if(session.arcadeVersion===2&&(!payload.arcade||(payload.game==='pairs'&&payload.arcade.total!==session.level)))throw Error('That result does not match the started challenge.');
   if(payload.arcade){
    const result=arcadeResult(payload.game,payload.arcade);s.arcadeBest??={};s.arcadeBest[actor]??={};const best=s.arcadeBest[actor][result.recordKey]||0;s.arcadeBest[actor][result.recordKey]=Math.max(best,result.raw);
    // Beating an existing record pays once per game per day. Everything the
    // arcade pays shares one daily allowance; records still save after it.
    b.records??=[];const record=best>0&&result.raw>best&&!b.records.includes(payload.game);if(record)b.records.push(payload.game);
    const earned=result.cash+(record?ECONOMY.recordBonus:0),reward=Math.min(earned,Math.max(0,ECONOMY.arcadeCap-(b.arcadeCash||0)),999999-s.wallets[actor]);b.arcadeCash=(b.arcadeCash||0)+reward;s.wallets[actor]+=reward;if(result.cash){s.xp+=3;b.games=Math.min(10,b.games+1);}message=`${result.label}.${record?' New best!':''} +${reward} stardust for ${PEOPLE[actor]}.${earned>reward?' Daily arcade stardust is full; records still count.':''}`;effect=null;
   }else{
    // Settle pre-upgrade result payloads without rewriting historical records.
    if(typeof payload.recordKey==='string'&&new RegExp('^'+payload.game+'(?:-[468])?$').test(payload.recordKey)&&Number.isInteger(payload.raw)&&payload.raw>=0&&payload.raw<=999999){s.arcadeBest??={};s.arcadeBest[actor]??={};s.arcadeBest[actor][payload.recordKey]=Math.max(s.arcadeBest[actor][payload.recordKey]||0,payload.raw);}
    const reward=Math.min(Math.ceil(payload.score/2),Math.max(0,999999-s.wallets[actor]));s.wallets[actor]+=reward;if(reward)s.xp+=3;message=`+${reward} stardust for ${PEOPLE[actor]}.`;
   }
   memory(s,'first-play','First game','',now);
  }
  if(type!=='play'&&meaningful&&b.care<6){s.xp+=4;b.care++;}if(type!=='play'||!payload.arcade){b.last[type]=now;care(s,actor,now);}
 }else if(type==='nap'){
  if(s.sleepUntil>now)throw Error('Already asleep.');if(s.needs.energy>=99.99)throw Error('Energy is full.');s.sleepUntil=now+restDuration(s.needs.energy);if(!b.last.nap){imprint(s,b,'dwarf');b.last.nap=now;}care(s,actor,now);message='Napping';
 }else if(type==='wake'){s.sleepUntil=0;care(s,actor,now);message='Awake!';effect='stretch';
 }else if(type==='ritual'){
  // Historical rituals remain in saves and the album; new care uses the room.
  throw Error('Together activities are retired. Use the care buttons.');
 }else if(type==='buy'){
  const item=SHOP.find(i=>i.id===payload.item);if(!item||!available(item,now))throw Error('That item is not in this season’s shop.');if(s.owned.includes(item.id)||(item.id==='stasis'&&s.magic.stasis))throw Error('Already yours. Use or equip it instead.');if(s.wallets[actor]<item.price)throw Error('A little more stardust in your wallet first.');if(item.slot==='magic'&&(s.magic[item.id]||0)>=99)throw Error('That shelf is full.');
  s.wallets[actor]-=item.price;if(item.slot==='magic')s.magic[item.id]++;else{s.owned.push(item.id);s.equipped=selectWardrobe(s.equipped,item.slot,item.id);}message=`${item.name}, acquired by ${PEOPLE[actor]}.`;memory(s,'first-decor','A room of your own','The first thing you picked out for Pip, together.',now);
 }else if(type==='transfer'){
  const to=actor==='him'?'her':'him',amount=payload.amount;if(!Number.isInteger(amount)||amount<=0||amount>s.wallets[actor])throw Error('Choose a whole amount within your own balance.');if(amount>999999-s.wallets[to])throw Error(PEOPLE[to]+'’s wallet has room for '+(999999-s.wallets[to])+' stardust.');s.wallets[actor]-=amount;s.wallets[to]+=amount;s.transfers.push({from:actor,to,amount,at:now});s.transfers=s.transfers.slice(-12);message=`${amount} stardust sent to ${PEOPLE[to]}.`;effect='reward';
 }else if(type==='magic'){
  const item=payload.item;if(!['age','rewind','stasis'].includes(item)||!s.magic[item])throw Error('Get that little time tool from the shop first.');
  if(item==='stasis'){if(s.evolvedAt)throw Error('This final form has no evolution left to pause.');if(s.pausedAt){s.phaseAt+=now-s.pausedAt;s.pausedAt=0;message='The evolution clock is moving again.';}else{s.pausedAt=now;message='Evolution paused. Needs and everyday play carry on.';}effect='stasis';}
  else if(item==='age'){if(s.pausedAt)throw Error('Resume evolution before using bottled tomorrow.');if(s.evolvedAt)throw Error('Already in the final form. Save that bottle.');if(!s.born&&(!s.wishes.him||!s.wishes.her))throw Error('Both wishes need to be tucked in before hatching.');s.magic.age--;if(!s.born){hatch(s,now);effect='hatch';}else{evolve(s,now);effect='evolve';}message='Grew up!';}
  else{if(!s.born)throw Error('Already an egg. Keep your yesterday drop.');s.magic.rewind--;s.evolvedAt=0;s.growthEvent=null;if(s.stage===0){s.born=false;s.form=null;s.eggCare=[];s.createdAt=now;}else{s.stage--;s.form=evolutionPath(s);}restartPhase(s,now);s.sleepUntil=0;message='Previous stage restored.';effect='rewind';memory(s,'rewind-'+now,'A little second childhood','One yesterday drop. So many possibilities still ahead.',now);}
 }else if(type==='equip'){
  const slot=['hat','outfit'].includes(payload.slot)?'wearable':payload.slot;if(!['wearable','decor','room'].includes(slot))throw Error('Choose a wardrobe slot.');if(payload.item!==null&&(!s.owned.includes(payload.item)||!SHOP.some(i=>i.id===payload.item&&i.slot===slot)))throw Error('You don’t own that item in this slot.');if(slot==='room'&&payload.item===null)throw Error('The nursery needs a room.');const previous=s.equipped;s.equipped=selectWardrobe(previous,slot,payload.item);const returned=slot==='wearable'&&previous.wearable&&previous.wearable!==payload.item;message=payload.item?'Equipped.':'Put away.';
 }else if(type==='vacation'){s.vacation=!s.vacation;s.lastCareAt=now;message=s.vacation?'Care paused.':'Care resumed.';
 }else if(type==='prefs'){
  for(const key of ['enabled','care','team','milestones','quiet'])if(typeof payload[key]==='boolean')s.prefs[actor][key]=payload[key];message='Settings saved.';
 }else throw Error('That interaction isn’t part of this nursery.');
 if(s.petId===input.petId&&!s.pausedAt&&s.phaseAt===input.phaseAt)s.phaseXP+=Math.max(0,s.xp-input.xp);if(!longRest(s,now))grow(s,now);if(s.petId===input.petId&&!input.born&&s.born){effect='hatch';message=`${s.name} hatched!`;}if(s.petId===input.petId&&s.stage>input.stage){effect='evolve';message=s.evolvedAt?`${s.name}’s forever form: ${FORMS[s.form].name}.`:`${s.name} became a ${STAGES[s.stage].name}.`;}s.revision++;s.receipts=[...s.receipts,id].slice(-96);if(!['visit','prefs'].includes(type))note(s,actor,message,now);
 reconcileNeeds(s,now);return {state:s,message,effect,duplicate:false};
}
function endOfQuiet(now){
 const p=clock(now),date=new Date(p.day+'T12:00:00Z');if(p.hour>=22)date.setUTCDate(date.getUTCDate()+1);
 const desired=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),8);let t=desired;
 for(let i=0;i<3;i++){const local=clock(t),[y,m,d]=local.day.split('-').map(Number);t+=desired-Date.UTC(y,m-1,d,local.hour,local.minute);}
 return t;
}
export function servicePings(input,now){
 const s=projectStar(input,now),day=clock(now).day,candidates=[];
 const pets=[s,...s.otherPet?[projectStar({...s,...s.otherPet,otherPet:null},now)]:[]];
 for(const pet of pets){if(!pet.born||pet.vacation)continue;
 const start=candidates.length;
 // Shared care is ordinary care. Old two-step tasks never create reminders.
 const unattended=Object.values(pet.seen).every(at=>now-at>=2*60000);
 if(unattended&&!longRest(pet,now)&&pet.sleepUntil<=now){
  for(const to of Object.keys(PEOPLE)){
   const empty=Object.keys(NEED_DECAY).filter(k=>pet.needAlerts[k].empty&&!pet.needAlerts[k].sent[to]);
   if(empty.length)candidates.push({id:'needs:'+empty.map(k=>k+pet.needAlerts[k].cycle).join('-')+':'+to,to,kind:'care',critical:true,needs:empty,title:`${pet.name} ${empty.length===1?NEED_MESSAGES[empty[0]][0]:'needs a little care'}`,body:empty.map(k=>NEED_MESSAGES[k].join(' · ')).join('\n'),route:'nursery',ref:empty[0]});
  }
 }
 const growth=s.memories.filter(m=>m.petId===pet.petId&&m.id.includes(':growth-')&&now-m.at<48*HOUR);for(const m of growth)for(const to of Object.keys(PEOPLE))candidates.push({id:m.id+':'+to,to,kind:'milestones',title:m.title,body:'New growth stage.',route:'journal'});
 const hatching=s.memories.findLast(m=>m.petId===pet.petId&&m.id.includes(':hatch')&&now-m.at<24*HOUR);if(hatching)for(const to of Object.keys(PEOPLE))candidates.push({id:hatching.id+':'+to,to,kind:'milestones',title:hatching.title,body:'Your egg hatched.',route:'journal'});
 for(const c of candidates.slice(start)){c.petId=pet.petId;c.id=pet.petId+':'+c.id;}
 }
 const valid=new Set(candidates.map(c=>c.id));for(const p of s.pings)if(p.kind==='team'||p.status==='waiting'&&!valid.has(p.id))p.status='cancelled';
 const fresh=[];
 for(const c of candidates){
  let p=s.pings.find(p=>p.id===c.id);if(p&&p.status!=='waiting')continue;
  const prefs=s.prefs[c.to],key=day+':'+c.to;s.pingBudget[key]??={count:0,lastAt:0};const b=s.pingBudget[key];
  if(!prefs.enabled||!prefs[c.kind])continue;
  if(prefs.quiet&&(clock(now).hour>=22||clock(now).hour<8)){
   if(!p){p={...c,status:'waiting',dueAt:endOfQuiet(now),at:now};s.pings.push(p);}continue;
  }
  // Empty needs are not blocked by unrelated ritual/milestone cooldowns.
  // The persistent episode flags, not a daily reminder cap, prevent repeats.
  if(!c.critical&&(b.count>=2||now-b.lastAt<6*HOUR))continue;
  if(!p){p={...c,status:'shown',at:now};s.pings.push(p);}else{p.status='shown';p.at=now;}
  if(c.critical){const pet=pets.find(pet=>pet.petId===c.petId);for(const key of c.needs)pet.needAlerts[key].sent[c.to]=true;}
  else {b.count++;b.lastAt=now;}fresh.push(p);
 }
 if(pets[1])s.otherPet=petSnapshot(pets[1]);
 s.pingBudget=Object.fromEntries(Object.entries(s.pingBudget).filter(([key])=>key.startsWith(day)));s.pings=s.pings.slice(-24);return {state:s,newPings:fresh};
}
export function scenario(which,now){
 const s=freshStar(now);if(which==='wish')return s;
 if(which==='hatching'){s.createdAt=now-EGG_DURATION;s.phaseAt=s.createdAt;s.wishes={him:'a safe place',her:'a home full of snacks'};s.eggCare=[{actor:'her',day:clock(now).day,form:'blackhole'}];s.phaseDays=s.eggCare.map(c=>c.day);s.affinity.blackhole=2;return s;}
 s.born=true;s.form=Object.hasOwn(FORMS,which)?which:'golden';s.wishes={him:'a safe place to be little',her:'a home full of snacks'};memory(s,'hatch','Two wishes made a little star','Your nursery began with a wish from each of you.',now-2*DAY);
 if(which==='grown'){s.xp=1700;s.stage=4;s.evolvedAt=now-DAY;s.createdAt=now-100*DAY;s.careDays=Array.from({length:60},(_,i)=>new Date(now-i*DAY).toISOString().slice(0,10));s.wallets={him:230,her:380};s.owned.push('bow','scarf','picnic','plant','garden-room');s.equipped={wearable:'picnic',decor:'plant',room:'garden-room'};memory(s,'growth-4','A forever star','Still small enough for the towel. Always.',now);}
 if(which==='shop'){s.wallets={him:12000,her:9500};s.magic={age:2,rewind:2,stasis:1};}
 if(Object.hasOwn(FORMS,which)){s.stage=4;s.evolvedAt=now;s.createdAt=now-100*DAY;}
 plaque(s,now);
 if(which==='away'){s.lastCareAt=now-48*HOUR;s.updatedAt=now-48*HOUR;return projectStar(s,now);}
 return s;
}

// Authored cooking challenge rules. Logical coordinates are always 320 × 250.
// The renderer and the server share scoring, limits and reward tiers.
export const KITCHEN_VERSION=1;
export const STATIONS={
 chop:{name:'cut',seconds:12,title:'Follow the cut lines',help:'Swipe along each arrow, from the round end to the point. Clean, straight cuts keep all 100 points.'},
 stir:{name:'stir',seconds:14,title:'Stir without spilling',help:'Trace the glowing dots around the pot. Keep a steady pace, then reverse when the arrow changes. Stay near the ring.'},
 whisk:{name:'whisk',seconds:13,title:'Whisk a smooth batter',help:'Trace the glowing dots in order. Keep moving steadily around the bowl. Reverse direction halfway; rushing or cutting across spills batter.'},
 spread:{name:'spread',seconds:14,title:'Spread right to the edges',help:'Paint all twelve patches with smooth strokes. Stay inside the dotted toast surface; smearing the counter costs points.'},
 heat:{name:'heat',seconds:15,title:'Keep a steady simmer',help:'Switch between low and high heat to keep the needle in the moving gold zone. Fill the cooking meter. Too hot for too long burns the dish.'},
 top:{name:'garnish',seconds:10,title:'Plate with care',help:'Drag each berry from the tray to the numbered glow, in order. Aim for the center. Dropping outside the dish wastes a topping.'},
 crack:{name:'crack',seconds:9,title:'Crack, then open',help:'Tap CRACK as the needle crosses the gold center. Then swipe from left to right along the shell guide to open the egg cleanly.'},
 pour:{name:'pour',seconds:14,title:'Pour three even pancakes',help:'Drag the jug onto each numbered pan spot. Release when the moving amount needle is in gold. Aim and timing both count.'},
 flip:{name:'flip',seconds:10,title:'Flip and catch',help:'Wait until the cooking needle reaches gold, then swipe up along the arrow. Tap CATCH when the falling ring meets the gold line.'},
 add:{name:'add',seconds:13,title:'Remember the recipe',help:'Memorize the three ingredients on the ticket. After it folds away, drag them into the pot in that order. The wrong ingredient costs points.'},
 ladle:{name:'serve',seconds:15,title:'Carry without spilling',help:'Start in the pot and trace the curved route to the bowl. Follow every glow at a steady speed. Carry two scoops; cutting corners spills them.'},
 rinse:{name:'rinse',seconds:13,title:'Wash, then drain',help:'Trace the swishing route through the water. Then tap DRAIN as the needle crosses gold. Sloppy swishes lose rice.'},
 shape:{name:'shape',seconds:12,title:'Shape a neat triangle',help:'Trace the rice ball outline through every glow. Then tap PRESS when the shrinking ring reaches gold. A steady hand keeps it together.'},
 wrap:{name:'wrap',seconds:10,title:'Wrap and fold',help:'Drag the seaweed onto the center mark. Then swipe each fold along its arrow. Line up the sheet and fold neatly.'}
};
export const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function seeded(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6D2B79F5;let t=Math.imul(n^n>>>15,n|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export const timingPosition=t=>.5+.46*Math.sin(t*3.2-.8);
export const timingGrade=p=>Math.round(clamp(100-Math.max(0,Math.abs(p-.5)-.075)*330));
export function kitchenReward(score,failed=false){
 if(failed||score<55)return {portions:0,tip:0,label:'RUINED'};
 return score===100?{portions:9,tip:8,label:'PERFECT'}:score>=90?{portions:3,tip:3,label:'GOLD'}:score>=70?{portions:2,tip:0,label:'SILVER'}:{portions:1,tip:0,label:'HOMEMADE'};
}
export function kitchenPayout(state,actor,session,score,failed,day){
 const reward=kitchenReward(score,failed),extra=reward.portions?(session?.form==='giant'?2:['golden','blackhole'].includes(session?.form)?1:0):0;
 return {...reward,portions:reward.portions+extra,extraFood:reward.portions?(session?.form==='dwarf'?'berry':session?.form==='neutron'?'milk':null):null,
 tip:(state.daily?.[day+':'+actor]?.cookBonuses||0)>=3?0:Math.min(reward.tip,999999-(state.wallets?.[actor]||0))};
}
export function createStage(kind,seed){
 if(!STATIONS[kind])throw Error('Unknown cooking station');
 const rand=seeded(seed+':'+kind),s={kind,elapsed:0,limit:STATIONS[kind].seconds,done:false,failed:false,loss:0,points:[],index:0,sub:0,mistakes:0,temperature:.5,high:false,cooked:0,burn:0,paint:Array(12).fill(0),trace:[],last:null,feedback:'',seed:String(seed)};
 s.order=['carrot-cut','potato','herb'].map(v=>({v,r:rand()})).sort((a,b)=>a.r-b.r).map(v=>v.v);
 s.cuts=Array.from({length:5},(_,i)=>{let x=85+i*37,y=95+rand()*10,lean=(rand()-.5)*20;return [{x:x-lean,y},{x:x+lean,y:175+rand()*8}];});
 s.targets=Array.from({length:3},(_,i)=>({x:[140,180,160][i]+(rand()-.5)*6,y:[139,139,164][i]+(rand()-.5)*6}));
 if(kind==='stir'||kind==='whisk')s.trace=Array.from({length:17},(_,i)=>{const a=-Math.PI/2+(i<=8?i:16-i)*Math.PI/4;return {x:160+43*Math.cos(a),y:130+20*Math.sin(a)};});
 if(kind==='rinse')s.trace=[{x:125,y:128},{x:183,y:125},{x:135,y:138},{x:185,y:139},{x:143,y:146},{x:175,y:146},{x:160,y:131}];
 if(kind==='shape')s.trace=[{x:160,y:88},{x:186,y:133},{x:208,y:176},{x:160,y:176},{x:113,y:176},{x:136,y:132},{x:160,y:88}];
 if(kind==='ladle')s.trace=Array.from({length:9},(_,i)=>({x:74+i*177/8,y:131+i*12/8-Math.sin(i*Math.PI/8)*46}));
 return s;
}
export function finishStage(s,score){s.done=true;s.score=Math.round(clamp(score));s.last=null;return s;}
export function failStage(s,why){s.failed=true;s.feedback=why;return finishStage(s,0);}
function mistake(s,text,loss=12){s.mistakes++;s.loss+=loss;s.feedback=text;if(s.mistakes>=4||s.loss>=70)failStage(s,'Too many mistakes. This dish is ruined.');}
function complete(s){return finishStage(s,(s.points.length?s.points.reduce((a,b)=>a+b,0)/s.points.length:100)-s.loss);}
export function tickStage(s,dt){
 if(s.done)return s;
 s.elapsed+=Math.max(0,dt);
 if(s.elapsed>=s.limit)return failStage(s,'Time’s up. This dish is ruined.');
 if(s.kind==='heat'){
  s.temperature=clamp(s.temperature+(s.high?.24:-.17)*dt,0,1);
  const target=.5+.12*Math.sin(s.elapsed*.95),error=Math.abs(s.temperature-target);
  if(error<=.145)s.cooked+=dt;else if(s.elapsed>1)s.loss+=dt*4;
  s.burn=s.temperature>.9?s.burn+dt:Math.max(0,s.burn-dt*.4);
  if(s.burn>.9)failStage(s,'Burnt! Turn the heat down sooner.');
  else if(s.cooked>=6.5)complete(s);
 }
 if(s.kind==='flip'&&s.sub===1&&s.elapsed-s.airAt>1.35)failStage(s,'It hit the counter. Catch sooner next time.');
 return s;
}
export function tapStage(s,action){
 if(s.done)return s;
 if(s.kind==='heat'){s.high=action==='high';return s;}
 const grade=timingGrade(timingPosition(s.elapsed-(s.pulseAt||0)));
 if(s.kind==='crack'&&s.sub===0){s.points.push(grade);s.sub=1;s.feedback=grade>=90?'Clean crack. Open the shell.':'Shell fragments! Open carefully.';if(grade<35)mistake(s,'Hard hit! Open carefully.',15);}
 else if(s.kind==='flip'&&s.sub===1){const g=Math.round(clamp(100-Math.max(0,Math.abs(s.elapsed-s.airAt-.78)-.12)*230));s.points.push(g);if(g<25)failStage(s,'Dropped! Watch the landing ring.');else complete(s);}
 else if((s.kind==='rinse'||s.kind==='shape')&&s.sub===1){s.points.push(grade);complete(s);}
 return s;
}
function segmentGrade(path,a,b,minSpeed=80,maxSpeed=800){
 if(path.length<2)return 0;
 const first=path[0],last=path.at(-1),length=dist(a,b),dx=b.x-a.x,dy=b.y-a.y;
 const duration=Math.max(.02,(last.t-first.t)/1000),speed=length/duration;
 const deviations=path.map(p=>Math.abs(dy*(p.x-a.x)-dx*(p.y-a.y))/Math.max(1,length));
 const lateral=deviations.reduce((a,b)=>a+b,0)/deviations.length;
 return Math.round(clamp(100-Math.max(0,dist(first,a)-13)*2-Math.max(0,dist(last,b)-13)*2-Math.max(0,lateral-9)*3-(speed<minSpeed?(minSpeed-speed)*.3:speed>maxSpeed?(speed-maxSpeed)*.12:0)));
}
export function strokeStage(s,path,source){
 if(s.done||path.length<2)return s;
 const a=path[0],b=path.at(-1),duration=(b.t-a.t)/1000;
 if(s.kind==='chop'){
  const [from,to]=s.cuts[s.index],g=segmentGrade(path,from,to,100,1000);
  if(g<35){mistake(s,'Missed the guide. Start at the round end.');return s;}
  s.points.push(g);s.index++;s.feedback=g===100?'Clean cut!':'Uneven cut · '+g+'%';if(s.index===s.cuts.length)complete(s);
 }else if(s.kind==='crack'&&s.sub===1){
  const g=segmentGrade(path,{x:105,y:140},{x:215,y:140},70,800);if(g<35)mistake(s,'Pull the shell along the arrow.');else{s.points.push(g);complete(s);}
 }else if(s.kind==='flip'&&s.sub===0){
  const g=segmentGrade(path,{x:160,y:182},{x:160,y:85},160,1100),timing=timingGrade(clamp((s.elapsed-2)/4,0,1));
  if(g<35){mistake(s,'Swipe UP through the pan.');return s;}
  s.points.push(g,timing);if(timing<20)return failStage(s,s.elapsed<4?'Raw! Wait for gold.':'Burnt! Flip sooner.');
  s.sub=1;s.airAt=s.elapsed;s.feedback='Catch when the ring reaches gold!';
 }else if(s.kind==='top'||s.kind==='pour'){
  const i=s.index,from=s.kind==='top'?{x:65+i*95,y:54}:{x:62,y:65},target=s.targets[i];
  if(source!==i&&s.kind==='top'||dist(a,from)>32||dist(a,b)<35){s.feedback='Pick up '+(s.kind==='top'?'the next berry':'the jug')+' from the tray.';return s;}
  const error=dist(b,target),g=Math.round(clamp(100-Math.max(0,error-(s.kind==='pour'?12:9))*4));
  if(g<30){mistake(s,'Spilled! Aim at the numbered glow.');return s;}
  s.points.push(g);if(s.kind==='pour')s.points.push(timingGrade(timingPosition(s.elapsed)));
  s.index++;s.feedback=g===100?'Right in the center!':'Placement · '+g+'%';if(s.index===3)complete(s);
 }else if(s.kind==='add'){
  if(s.elapsed<3){s.feedback='Look at the ticket first.';return s;}
  if(source!==s.order[s.index]){mistake(s,'Wrong ingredient. Remember the ticket.');return s;}
  if(dist(b,{x:160,y:139})>38){mistake(s,'The ingredient missed the pot.');return s;}
  const slots={'herb':65,'carrot-cut':160,'potato':255};if(dist(a,{x:slots[source],y:62})>32)return s;
  s.points.push(100);s.index++;s.feedback='In the pot!';if(s.index===3)complete(s);
 }else if(s.kind==='wrap'){
  const routes=[[{x:65,y:57},{x:160,y:148}],[{x:107,y:145},{x:160,y:145}],[{x:211,y:145},{x:160,y:145}]],route=routes[s.sub];
  const g=s.sub===0?Math.round(clamp(100-Math.max(0,dist(b,route[1])-10)*4-(dist(a,route[0])>30?100:0))):segmentGrade(path,...route,55,700);
  if(g<35){mistake(s,'Line up the sheet and follow the fold arrow.');return s;}
  s.points.push(g);s.sub++;s.feedback='Neat fold!';if(s.sub===3)complete(s);
 }
 return s;
}
// Continuous tracing checks successive short segments. Teleporting across the
// bowl or holding a key cannot manufacture progress.
export function traceStage(s,p){
 if(s.done)return s;
 if(s.kind==='spread'){
  const prev=s.last;s.last=p;if(!prev)return s;
  const travel=dist(prev,p);if(travel<1||travel>42)return s;
  if(p.x<104||p.x>216||p.y<100||p.y>184){if(s.elapsed-(s.spillAt||-10)>.45){s.loss+=4;s.spillAt=s.elapsed;s.feedback='Jam on the counter! Stay inside the toast.';}return s;}
  for(let i=0;i<12;i++){const c={x:118+(i%4)*28,y:115+Math.floor(i/4)*27};if(dist(p,c)<22)s.paint[i]=clamp(s.paint[i]+travel/24,0,1);}
  s.index=s.paint.filter(v=>v>=1).length;if(s.index===12)complete(s);return s;
 }
 if(!s.trace.length||s.sub>0&&s.kind!=='ladle')return s;
 const target=s.trace[s.index],prev=s.last;
 if(s.index===0){if(dist(p,target)>20)return s;s.index=1;s.last=p;s.checkAt=p.t;s.feedback='Follow the next glow.';return s;}
 if(!prev){if(dist(p,s.trace[s.index-1])<=20){s.last=p;s.checkAt=p.t;}return s;}s.last=p;
 const travel=dist(prev,p),dt=(p.t-prev.t)/1000;if(travel<.5)return s;
 if(travel>42){s.loss+=3;s.feedback='Too far in one move. Trace the route.';return s;}
 const from=s.trace[s.index-1],dx=target.x-from.x,dy=target.y-from.y,l=dist(from,target),u=clamp(((p.x-from.x)*dx+(p.y-from.y)*dy)/Math.max(1,l*l),0,1),line={x:from.x+u*dx,y:from.y+u*dy},off=dist(p,line);
 if(off>22){s.loss+=Math.min(2,travel*.1);s.feedback='Spilling! Stay on the guide.';}
 if(dist(p,target)>14)return s;
 const speed=l/Math.max(.08,(p.t-(s.checkAt??prev.t))/1000),g=Math.round(clamp(100-Math.max(0,off-12)*3-(speed>700?(speed-700)*.06:0)));
 s.points.push(g);s.checkAt=p.t;s.index++;
 if(s.index>=s.trace.length){
  if(s.kind==='rinse'||s.kind==='shape'){s.sub=1;s.pulseAt=s.elapsed;s.feedback=s.kind==='rinse'?'Water clear. Drain on gold!':'Nice shape. Press on gold!';}
  else if(s.kind==='ladle'&&s.sub===0){s.sub=1;s.index=0;s.last=null;s.feedback='One scoop served. Carry the second.';}
  else complete(s);
 }else s.feedback=(s.kind==='stir'||s.kind==='whisk')&&s.index===9?'Reverse direction!':'Steady… follow the glow.';
 return s;
}
export function releaseTrace(s){s.last=null;s.checkAt=null;if(s.trace.length&&s.index>0&&s.index<s.trace.length){s.index=0;s.loss+=5;s.feedback='You lifted the tool. Start the route again.';}}

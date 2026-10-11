// One-off, user-authorized replacement. Snapshot first; guarded atomic commit.
// No question, earlier score, profile, note, or memory can be modified here.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {activityClock} from '../activity-clock.js';
import {wordForDay} from '../daily-words.js';
import {timedPuzzle} from '../daily-puzzles.js';
const day='2026-10-11',project='our-little-list-5ea59',household='oLSxADOwjqS04hSS2aHGOcvozmz2';
assert.equal(activityClock().day,day,'This one-off reset may only run during its activity day.');
const req=createRequire(import.meta.url),{configstore}=req('firebase-tools/lib/configstore');
await req('firebase-tools/lib/requireAuth').requireAuth({project,user:configstore.get('user'),tokens:configstore.get('tokens')});
const client=new(req('firebase-tools/lib/apiv2').Client)({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
const db=`projects/${project}/databases/(default)/documents`,root=`${db}/households/${household}`;
async function get(path){try{return(await client.get('/'+root+'/'+path)).body;}catch(e){if(e.status===404||e.context?.response?.statusCode===404||/404/.test(e.message))return null;throw e;}}
async function list(collection){let docs=[],token='';do{const r=(await client.get('/'+root+'/'+collection+'?pageSize=1000'+(token?'&pageToken='+encodeURIComponent(token):''))).body;docs.push(...r.documents||[]);token=r.nextPageToken||'';}while(token);return docs;}
async function snapshot(){
 assert.equal(await get('wordWeeks/2026-10-05'),null,'Week already settled: do not silently rewrite its crown.');
 const duels=await list('wordDuels');assert.ok(!duels.some(d=>d.fields.week?.stringValue==='2026-10-05'),'Tie already started: requires separate review.');
 const documents=[];
 for(const col of ['wordPuzzles','timedPuzzles','wordGames','wordResults','timedGames','timedResults','activityEvents','outbox','deliveryLocks']){
  const rows=await list(col);
  documents.push(...rows.filter(d=>{
   const id=d.name.split('/').pop();
   if(col==='outbox')return id.startsWith('activity-'+day+'-');
   if(col==='deliveryLocks')return id.startsWith('sent-activity-'+day+'-');
   return d.fields.day?.stringValue===day;
  }));
 }
 return {project,household,day,capturedAt:new Date().toISOString(),documents,question:await get('questions/'+day)};
}
const args=process.argv.slice(2);
if(args[0]!=='--apply')console.log(JSON.stringify(await snapshot()));
else{
 assert.ok(args[1],'Backed-up snapshot file is required.');
 const backup=JSON.parse(readFileSync(args[1],'utf8'));
 assert.equal(backup.project,project);assert.equal(backup.household,household);assert.equal(backup.day,day);
 const current=await snapshot(),versions=s=>s.documents.map(d=>[d.name,d.updateTime]).sort((a,b)=>a[0].localeCompare(b[0]));
 assert.deepEqual(versions(current),versions(backup),'Records changed since backup. Take a fresh snapshot before resetting.');
 const value=v=>v===null?{nullValue:null}:Array.isArray(v)?{arrayValue:{values:v.map(value)}}:typeof v==='object'?{mapValue:{fields:fields(v)}}:typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{stringValue:v};
 const fields=obj=>Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,value(v)]));
 const replacements=[['wordPuzzles/'+day,wordForDay(day)],...['search','crossword'].map(type=>['timedPuzzles/'+day+'-'+type,timedPuzzle(day,type)])];
 for(const [path,puzzle]of replacements){const old=backup.documents.find(d=>d.name===root+'/'+path);assert.ok(old,'Expected existing puzzle');assert.notEqual(puzzle.word||puzzle.grid,old.fields.word?.stringValue||old.fields.grid?.stringValue,'Replacement must be genuinely different');}
 const writes=backup.documents.map(d=>{
  assert.ok(d.name.startsWith(root+'/'));
  const replacement=replacements.find(([path])=>d.name===root+'/'+path);
  return replacement?{update:{name:d.name,fields:fields(replacement[1])},currentDocument:{updateTime:d.updateTime}}:{delete:d.name,currentDocument:{updateTime:d.updateTime}};
 });
 assert.ok(writes.length<450);await client.post('/'+db+':commit',{body:{writes}});
 const after=await snapshot();
 assert.equal(after.question?.updateTime,backup.question?.updateTime,'Question must remain untouched');
 assert.equal(after.documents.filter(d=>/\/(wordGames|wordResults|timedGames|timedResults)\//.test(d.name)).length,0);
 assert.equal(after.documents.filter(d=>/\/(wordPuzzles|timedPuzzles)\//.test(d.name)).length,3);
 console.log(JSON.stringify({resetDay:day,replaced:3,removed:writes.length-3,questionUnchanged:true}));
}

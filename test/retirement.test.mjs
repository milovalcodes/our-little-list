import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
import {ensureQuestionOfDay} from '../worker/src/index.js';
import {normalizeWeekRecord} from '../win-records.js';
import {crownMemories} from '../memory-catalog.js';
import {NOTIFICATION_GROUPS,RETIRED_GAME_KINDS,notificationKindEnabled,normalizeNotificationPreferences} from '../notification-policy.js';
const root=resolve('.'),read=p=>readFileSync(p,'utf8');
for(const folder of ['.','worker/src','scripts'])for(const name of readdirSync(folder).filter(n=>/\.(?:js|mjs)$/.test(n))){
 const path=resolve(folder,name),source=read(path);
 for(const [,ref] of source.matchAll(/(?:from\s*|import\s*\(\s*)['"](\.[^'"]+)['"]/g))assert.ok(existsSync(resolve(dirname(path),ref)),`${path}: missing ${ref}`);
}
for(const kind of RETIRED_GAME_KINDS)assert.equal(notificationKindEnabled(kind,{categories:{questions:true,notes:true,gameTurns:true,gameStreaks:true}}),false,kind);
assert.deepEqual(NOTIFICATION_GROUPS.filter(g=>/game/i.test(g.label)),[]);
assert.equal(notificationKindEnabled('question-open',{categories:{questions:false}}),false);
assert.equal(notificationKindEnabled('note',{categories:{notes:true}}),true);
assert.equal(normalizeNotificationPreferences({categories:{questions:false,gameTurns:true}}).categories.questions,false);
assert.ok(!('gameTurns' in normalizeNotificationPreferences().categories));
const base='households/test',docs=new Map(),reads=[];
const db={get:async p=>{reads.push(p);return docs.get(p)||null;},create:async(p,v)=>{if(docs.has(p))return false;docs.set(p,structuredClone(v));return true;},createMany:async rows=>{if(rows.some(r=>docs.has(r.path)))return false;for(const r of rows)docs.set(r.path,structuredClone(r.fields));return true;}};
const now=Date.parse('2026-10-24T13:00:00Z'),day='2026-10-24';
await ensureQuestionOfDay(db,base,now);
assert.equal(docs.size,4);assert.ok([...docs.keys()].every(p=>/\/(questions|questionEvents|outbox)\//.test(p)));
assert.ok([...docs.values()].filter(d=>d.kind).every(d=>d.kind==='question-open'&&d.url==='activities.html#question'&&!/puzzle|game/i.test(d.body+d.title)));
await ensureQuestionOfDay(db,base,now+60000);assert.equal(docs.size,4);
docs.get(`${base}/questions/${day}`).answers.her={at:now+1000};
await ensureQuestionOfDay(db,base,now+120000);assert.ok(docs.has(`${base}/outbox/question-${day}-answered-him`));
docs.get(`${base}/questions/${day}`).answers.him={at:now+2000};
await ensureQuestionOfDay(db,base,now+180000);assert.ok(docs.has(`${base}/outbox/question-${day}-reveal-her`));
assert.ok(!docs.has(`${base}/outbox/question-${day}-reveal-him`));
const count=docs.size;await ensureQuestionOfDay(db,base,now+240000);assert.equal(docs.size,count);
// A legacy opening marker prevents a second morning notification on upgrade.
docs.clear();docs.set(`${base}/questionEvents/${day}-open`,{day,event:'open'});
await ensureQuestionOfDay(db,base,now);assert.equal([...docs.keys()].filter(p=>p.includes('/outbox/')).length,0);
assert.ok(reads.every(p=>!/(word|timed|game)/.test(p)));
const old={week:'2026-09-28',scores:{her:6,him:3},winners:['her'],settledAt:1};
assert.deepEqual(normalizeWeekRecord(old).scores,{her:60,him:30});
assert.equal(crownMemories([old],x=>x)[0].winner,'her');assert.deepEqual(old.scores,{her:6,him:3});
const scope={location:{href:'https://example.test/app/activities.html'}};vm.runInNewContext(read('old-links.js'),{self:scope,URL});
for(const url of ['activities.html?as=her&game=crossword#crossword','activities.html#tiebreaker','practice.html#word-normal','games.html?game=wordle']){
 const next=new URL(scope.oldPageTarget(url));assert.equal(next.pathname,'/app/activities.html');assert.equal(next.hash,'#question');assert.equal(next.searchParams.has('game'),false);
}
assert.equal(scope.oldPageTarget('activities.html#scoreboard-2026-09-28'),'');
assert.doesNotMatch(read('worker/src/star-api.js'),/wordResults|timedResults|op:'sync'/);
assert.doesNotMatch(read('firebase-data.js'),/submitWordGuess|playTimedPuzzle|resetDailyGames|saveGameReaction|playGame\(/);
assert.doesNotMatch(read('activities.html'),/id="(?:wordle|search|crossword|practice|tiebreaker|admin-games)"/);
for(const file of ['daily-word.js','timed-games.js','practice.js','round-engine.js','worker/src/compiled-crosswords.json'])assert.equal(existsSync(file),false,file);
console.log('RETIREMENT: question-only scheduler, deduplication, reveal targeting, disabled pings, frozen history, old links and module graph pass');

assert.doesNotMatch(read('little-star.html'),/competition points this week|Daily games|Earnings sync pending/,'pet wallet cannot link back to retired daily games');

assert.doesNotMatch(read("worker/src/index.js"),/scheduleStar|queuedStarWanted|Nursery notification check/);

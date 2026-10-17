import assert from 'node:assert/strict';
import {wordStats,timedStats,timedTaken,wordShare,timedShare,hidePartnerUntilPlayed,wordEnded,clock} from '../daily-results.js';
import {weeklyReport} from '../weekly-report.js';
import {trioProgress} from '../league-scores.js';
import {timedOver} from '../timed-game.js';
const word=(day,attempts,won=true,person='her')=>({day,person,attempts,won,done:true,updatedAt:Date.parse(day+'T15:00Z')});
// Streaks count consecutive solved days, carry over while today is unplayed, and reset on a miss.
const rows=[word('2026-10-14',3),word('2026-10-15',1),word('2026-10-16',6,false),word('2026-10-17',2),word('2026-10-18',4),word('2026-10-19-tie-1',1),{day:'2026-10-20',person:'her',attempts:2,won:false,done:false}];
let s=wordStats(rows,'2026-10-19');
assert.deepEqual({played:s.played,wins:s.wins,rate:s.winRate,current:s.current,best:s.best},{played:5,wins:4,rate:80,current:2,best:2},'tie rounds and unfinished boards are not counted');
assert.deepEqual(s.distribution,[1,1,1,1,0,0]);
assert.equal(wordStats(rows,'2026-10-18').current,2);
assert.equal(wordStats(rows,'2026-10-20').current,0,'a skipped day ends the streak');
assert.deepEqual(wordStats([],'2026-10-20'),{played:0,wins:0,winRate:0,current:0,best:0,distribution:[0,0,0,0,0,0]});
assert.equal(wordStats([word('2026-10-20',2),{...word('2026-10-20',2),updatedAt:1}],'2026-10-20').played,1,'duplicate snapshots count once');
// Share grids carry colours only, never letters.
const text=wordShare({day:'2026-10-20',guesses:['crane','apple'],won:true},'apple');
assert.equal(text,'Little Word · Oct 20 · 2/6\n⬛⬛🟨⬛🟩\n🟩🟩🟩🟩🟩');
assert.doesNotMatch(text,/apple|crane/i);
assert.match(wordShare({day:'2026-10-14',guesses:['crane','crane','crane','crane','crane'],won:false},'apple'),/X\/5/,'old days share out of five');
assert.match(wordShare({day:'2026-10-19-tie-2',guesses:['apple'],won:true},'apple'),/tie-break 2 · 1\/6/);
// Timed results: time taken only for cleared boards; streaks of cleared days.
const t0=Date.parse('2026-10-20T14:00Z');
const board=(day,ms,count=6,type='crossword')=>({day,type,person:'her',startedAt:Date.parse(day+'T14:00Z'),finishedAt:Date.parse(day+'T14:00Z')+ms,done:true,complete:count===6,count,total:6,durationMs:120000});
assert.equal(timedTaken(board('2026-10-20',72000)),72000);assert.equal(timedTaken(board('2026-10-20',120000,4)),null);
assert.equal(clock(72000),'1:12');
const ts=timedStats([board('2026-10-19',90000),board('2026-10-20',72000),board('2026-10-18',120000,3),board('2026-10-20',1000,6,'search')],'crossword','2026-10-20',t0+86400000);
assert.deepEqual(ts,{played:3,cleared:2,current:2,best:2,bestTime:72000});
assert.equal(timedShare(board('2026-10-20',72000),'Mini crossword'),'Mini crossword · Oct 20 · 6/6 in 1:12 · 59 points');
assert.equal(timedShare(board('2026-10-20',120000,4),'Mini crossword'),'Mini crossword · Oct 20 · 4/6 · 33 points');
// Partner rounds stay hidden until yours is over, and hidden rows score nothing.
const today='2026-10-20',open=d=>d===today;
const partner={...board(today,30000),person:'him'},mine={...board(today,60000),person:'her',done:false,complete:false,finishedAt:null,startedAt:t0};
let shown=hidePartnerUntilPlayed([partner,mine],'her',open,r=>timedOver(r,t0+1000));
assert.equal(shown[0].hidden,true);assert.equal(shown[0].count,undefined);assert.equal(timedOver(shown[0]),false);
shown=hidePartnerUntilPlayed([partner,{...board(today,60000)}],'her',open,r=>timedOver(r,t0+86400000));
assert.equal(shown[0].hidden,undefined,'visible once mine is over');
assert.equal(hidePartnerUntilPlayed([{...partner,day:'2026-10-19'}],'her',open,()=>false)[0].hidden,undefined,'past days are never hidden');
const words=hidePartnerUntilPlayed([word(today,1,true,'him')],'her',open,wordEnded);
const report=weeklyReport(today,words,[],null,t0+1000);
const cell=report.entries.find(e=>e.day===today).games[0].people.him;
assert.deepEqual({points:cell.points,hidden:cell.hidden,detail:cell.detail},{points:0,hidden:true,detail:'played · hidden until you finish yours'});
assert.equal(report.totals.him,0,'the live total leaves hidden points out');
// A hidden partner never looks finished to the tie-break clinch display.
const tie='2026-10-19-tie-1',hiddenTie=hidePartnerUntilPlayed([{...board(tie,30000),person:'him'}],'her',()=>true,r=>timedOver(r));
assert.equal(trioProgress(tie,{her:0,him:0},[],hiddenTie,t0).finished.him,0);
console.log('DAILY RESULTS: win/clear streaks, guess distribution, spoiler-free share text, times, and partner results hidden until you play pass');

import assert from 'node:assert/strict';
import {attentionCounts} from '../navigation-attention.js';
const now=Date.parse('2026-10-09T18:00Z'),day='2026-10-09';
const b={dailyReady:true,wordPuzzles:[{day}],timedPuzzles:[{day,type:'search'},{day,type:'crossword'}],questions:[{day,answers:{}}],items:[
 {id:'r',type:'task',routineDays:[5],done:false},{id:'off',type:'task',routineDays:[6],done:false},
 {id:'new',addedBy:'her',createdAt:now-1},{id:'mine',addedBy:'him',createdAt:now-1}
],notes:[{recipient:'him',read:false},{recipient:'her',read:false}],
statuses:[{person:'her',updateKind:'location',updatedAt:now},{person:'her',updateKind:'manual',updatedAt:now}],
dates:[{addedBy:'her',createdAt:now}],memories:[{addedBy:'him',createdAt:now}]};
assert.deepEqual(attentionCounts(b,'him',{},now),{tasks:2,notes:1,activities:4,dates:1,memories:0,status:1,more:2});
b.routineChecks=[{id:'r_'+day,itemId:'r',day,done:true}];
b.notes[0].read=true;b.questions[0].answers.him={at:now};
b.wordResults=[{day,person:'him',done:true}];
b.timedResults=['search','crossword'].map(type=>({type,day,person:'him',done:true}));
assert.deepEqual(attentionCounts(b,'him',{tasks:now,dates:now,status:now},now),{tasks:0,notes:0,activities:0,dates:0,memories:0,status:0,more:0});
assert.equal(attentionCounts({dailyReady:false},'him',{},now).activities,0,'do not badge incomplete reads');
assert.equal(attentionCounts(b,'him',{tasks:now},now+7*86400000).tasks,1,'routine badge returns on the next scheduled day');
console.log('Navigation attention: real unread/unfinished work only, partner filtering, routine resets and load guards pass');

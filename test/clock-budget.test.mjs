import assert from 'node:assert/strict';
const Original=Intl.DateTimeFormat;let constructions=0;
Intl.DateTimeFormat=function(...args){constructions++;return new Original(...args);};
try{
 const {activityClock,activityWindow}=await import('../activity-clock.js');
 const {listDay,listInstant}=await import('../list-schedule.js');
 for(let i=0;i<100;i++){
  assert.equal(activityClock(Date.parse('2027-03-14T12:59:00Z')).day,'2027-03-13');
  assert.equal(activityWindow('2027-03-14').opensAt,Date.parse('2027-03-14T13:00Z'));
  assert.equal(activityWindow('2027-11-07').opensAt,Date.parse('2027-11-07T14:00Z'));
  assert.equal(listDay(Date.parse('2027-11-07T04:00Z')),'2027-11-07');
  assert.equal(listInstant('2027-03-14','02:30'),0);
  assert.equal(listInstant('2027-11-07','09:00'),Date.parse('2027-11-07T14:00Z'));
 }
 assert.equal(constructions,4,'timezone formatters are shared instead of repeatedly rebuilding ICU data');
}finally{Intl.DateTimeFormat=Original;}
console.log('CLOCK BUDGET: repeated checks reuse four formatters and retain DST and 9am boundaries');

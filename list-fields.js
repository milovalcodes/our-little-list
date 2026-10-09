import {WEEKDAYS} from './list-schedule.js';
import {escapeHtml} from './ui-helpers.js';
export function daysFields(days=[0,1,2,3,4,5,6]) {
  return WEEKDAYS.map((day,i)=>`<label><input type="checkbox" name="routineDay" value="${i}" ${days.includes(i)?'checked':''}><span>${day}</span></label>`).join('');
}
export function reminderFields(item={},routine=false) {
  const offsets=item.reminderOffsets||[60,30,0];
  return `<div class="list-reminder-fields">
    ${routine?'':`<label>or choose a day<input type="date" name="exactDue" value="${escapeHtml(item.due||'')}"></label>`}
    <label>reminder time · Eastern<input type="time" name="reminderTime" value="${escapeHtml(item.reminderTime||'')}"></label>
    <fieldset><legend>Nudge us</legend><div class="routine-days">${[[60,'1h before'],[30,'30m before'],[15,'15m before'],[0,'when due']].map(([n,label])=>`<label><input type="checkbox" name="reminderOffset" value="${n}" ${offsets.includes(n)?'checked':''}><span>${label}</span></label>`).join('')}</div></fieldset>
    <label>notify<select name="reminderTo">${[['both','both of us'],['her','the sun'],['him','the moon']].map(([n,label])=>`<option value="${n}" ${(item.reminderTo||'both')===n?'selected':''}>${label}</option>`).join('')}</select></label>
  </div>`;
}
export function readReminderFields(form) {
  const reminderTime=form.querySelector('[name=reminderTime]')?.value||'';
  const reminderOffsets=[...form.querySelectorAll('[name=reminderOffset]:checked')].map(i=>Number(i.value));
  if(reminderTime&&!reminderOffsets.length)throw Error('Choose at least one reminder, or clear the time.');
  return {reminderTime,reminderOffsets:reminderTime?reminderOffsets:[],reminderTo:form.querySelector('[name=reminderTo]')?.value||'both',reminderUpdatedAt:Date.now()};
}

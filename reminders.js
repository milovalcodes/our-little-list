import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, partnerOf, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, toast, setButtonBusy, showFailure } from './ui-helpers.js';
import { personName } from './profile-store.js';
import { friendlyWhen } from './time-format.js';

const $ = id => document.getElementById(id);
let day = 'today';
let time = '09:00';

const data = await sharedLayer();
onAuthChange(user => setupAuthUI(data, user));
if (data.mode === 'local') setupAuthUI(data, { local: true });

// Your side comes from the account you signed in with, not from a URL anyone
// could retype. A signed-in account that is not one of the two members stops
// here rather than guessing which side to show.
const sender = await awaitViewer();
if (!sender) { showNotAMember(); await new Promise(() => {}); }
const recipient = partnerOf(sender);

applyViewerTheme(sender);
document.querySelector('.back-to-side').href = `${sender}.html`;
setNames();
const prefill=new URLSearchParams(location.search).get('prefill');
if(prefill)$('reminder-title').value=prefill.slice(0,100);

function select(group, button, key) {
  document.querySelectorAll(`#${group} .choice`).forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  if (group === 'day-choices') {
    day = key;
    $('custom-day').hidden = key !== 'custom';
  } else {
    time = key;
    $('custom-time').hidden = key !== 'custom';
  }
  previewWhen();
}
document.querySelectorAll('#day-choices .choice').forEach(button => button.addEventListener('click', () => select('day-choices', button, button.dataset.day)));
document.querySelectorAll('#time-choices .choice').forEach(button => button.addEventListener('click', () => select('time-choices', button, button.dataset.time)));
$('custom-day')?.addEventListener('change', previewWhen);
$('custom-time')?.addEventListener('change', previewWhen);

$('reminder-form').addEventListener('submit', async event => {
  event.preventDefault();
  const chosen = makeDate();
  if (!chosen) {
    toast('pick a day and time first');
    return;
  }
  // The old version happily accepted "today" plus a time that had already gone
  // by, then saved a reminder that could never fire.
  if (chosen.getTime() <= Date.now()) {
    showFailure('that moment already happened.', 'pick a later time, or switch the day to tomorrow.');
    return;
  }

  const title = $('reminder-title').value.trim();
  const note = $('reminder-note').value.trim();
  const dueAt = chosen.getTime();
  const submit = $('reminder-submit');
  setButtonBusy(submit, true, 'setting it…');

  try {
    const record = await data.addTo('reminders', {
      sender, recipient, from: sender, to: recipient,
      title, note,
      scheduledAt: chosen.toISOString(), dueAt,
      delivered: false, createdAt: Date.now()
    });
    const reminderId = record?.id || '';

    // Two notifications: a heads-up now, and the actual nudge at the due time.
    // The due one carries the reminder id so the delivery workflow can skip it
    // if the reminder gets deleted in the meantime.
    await data.notify(recipient, {
      title: 'new reminder ⏰',
      body: `${title} · ${friendlyWhen(dueAt)}`,
      url: `reminders.html`,
      kind: 'reminder-created'
    });
    const scheduled = await data.notify(recipient, {
      title: `⏰ ${title}`,
      body: note || `from ${personName(sender)}`,
      url: `reminders.html`,
      kind: 'reminder',
      ref: reminderId,
      sendAt: dueAt
    });

    event.target.hidden = true;
    $('sent-state').hidden = false;
    $('sent-copy').textContent = scheduled.queued
      ? `${personName(recipient)} gets a nudge ${friendlyWhen(dueAt)}.`
      : `saved for ${friendlyWhen(dueAt)} — but sync is off on this phone, so no alert will be sent.`;
  } catch (_) {
    showFailure('the reminder did not save.', 'check the internet and try again. Everything you typed is still here.');
  } finally {
    if (!event.target.hidden) setButtonBusy(submit, false);
  }
});

$('another-reminder').addEventListener('click', () => location.reload());

function makeDate() {
  const value = new Date();
  value.setSeconds(0, 0);
  if (day === 'tomorrow') value.setDate(value.getDate() + 1);
  if (day === 'weekend') {
    const days = (6 - value.getDay() + 7) % 7 || 7;
    value.setDate(value.getDate() + days);
  }
  if (day === 'custom') {
    if (!$('custom-day').value) return null;
    const [y, m, d] = $('custom-day').value.split('-').map(Number);
    value.setFullYear(y, m - 1, d);
  }
  const chosenTime = time === 'custom' ? $('custom-time').value : time;
  if (!chosenTime) return null;
  const [h, min] = chosenTime.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  value.setHours(h, min, 0, 0);
  return value;
}

function previewWhen() {
  const preview = $('reminder-when-preview');
  if (!preview) return;
  const chosen = makeDate();
  if (!chosen) {
    preview.textContent = '';
    preview.classList.remove('is-past');
    return;
  }
  const past = chosen.getTime() <= Date.now();
  preview.textContent = past ? `${friendlyWhen(chosen.getTime())} — already gone by` : friendlyWhen(chosen.getTime());
  preview.classList.toggle('is-past', past);
}

function setNames() {
  $('reminder-heading').textContent = `Remind ${personName(recipient)}`;
}
window.addEventListener('littlelist:profile', setNames);
previewWhen();

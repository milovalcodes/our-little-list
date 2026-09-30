// "Which day, what time" as chips: today / tomorrow / weekend / a date, and
// morning-ish / after lunch / evening / an exact time. Pure, so it can be
// tested with a pinned clock; the asks composer and nothing else uses it now
// that reminders are asks with a time.

export function pickMoment({ day = 'today', time = '09:00', customDay = '', customTime = '', now = new Date() } = {}) {
  const value = new Date(now.getTime());
  value.setSeconds(0, 0);
  if (day === 'tomorrow') value.setDate(value.getDate() + 1);
  if (day === 'custom') {
    if (!customDay) return null;
    const [y, m, d] = String(customDay).split('-').map(Number);
    if (![y, m, d].every(Number.isFinite)) return null;
    value.setFullYear(y, m - 1, d);
  }
  const chosenTime = time === 'custom' ? customTime : time;
  if (!chosenTime) return null;
  const [h, min] = String(chosenTime).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  value.setHours(h, min, 0, 0);
  if (day === 'weekend') {
    // On a weekday this is the coming Saturday. On a Saturday or Sunday it is
    // today while the time is still ahead, and otherwise the next weekend day —
    // not the Saturday after, which is what this used to do.
    const weekday = value.getDay();
    if (weekday !== 0 && weekday !== 6) value.setDate(value.getDate() + (6 - weekday));
    else if (value.getTime() <= now.getTime()) value.setDate(value.getDate() + (weekday === 6 ? 1 : 6));
  }
  return value;
}

export function momentPickerHtml(prefix = '') {
  const id = name => prefix ? `${prefix}-${name}` : name;
  return `<div class="choice-cloud" id="${id('day-choices')}"><button type="button" class="choice active" data-day="today">today</button><button type="button" class="choice" data-day="tomorrow">tomorrow</button><button type="button" class="choice" data-day="weekend">weekend</button><button type="button" class="choice" data-day="custom">pick one…</button></div>
    <input id="${id('custom-day')}" class="exact-input" type="date" hidden>
    <div class="choice-cloud" id="${id('time-choices')}"><button type="button" class="choice active" data-time="09:00">morning-ish</button><button type="button" class="choice" data-time="13:00">after lunch</button><button type="button" class="choice" data-time="19:00">evening</button><button type="button" class="choice" data-time="custom">exact time…</button></div>
    <input id="${id('custom-time')}" class="exact-input" type="time" hidden>
    <p class="reminder-when-preview" id="${id('reminder-when-preview')}" aria-live="polite"></p>`;
}

export function setupMomentPicker(root, format) {
  let day = 'today';
  let time = '09:00';
  let active = false;
  const customDay = root.querySelector('input[type="date"]');
  const customTime = root.querySelector('input[type="time"]');
  const preview = root.querySelector('.reminder-when-preview');
  const chosen = () => pickMoment({ day, time, customDay: customDay.value, customTime: customTime.value });
  const paint = () => {
    const value = active ? chosen() : null;
    const past = Boolean(value && value.getTime() <= Date.now());
    preview.textContent = value ? `${format(value.getTime())}${past ? ' — already gone by' : ''}` : '';
    preview.classList.toggle('is-past', past);
  };
  const select = (kind, value) => {
    if (kind === 'day') { day = value; customDay.hidden = day !== 'custom'; }
    else { time = value; customTime.hidden = time !== 'custom'; }
    root.querySelectorAll(`[data-${kind}]`).forEach(button => button.classList.toggle('active', button.dataset[kind] === value));
    paint();
  };
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-day],[data-time]');
    if (button) select(button.dataset.day ? 'day' : 'time', button.dataset.day || button.dataset.time);
  });
  customDay.addEventListener('change', paint);
  customTime.addEventListener('change', paint);
  return {
    chosen,
    setActive(value) { active = value; if (active && day === 'today' && (chosen()?.getTime() || 0) <= Date.now()) select('day', 'tomorrow'); else paint(); },
    reset() { customDay.value = ''; customTime.value = ''; select('day', 'today'); select('time', '09:00'); },
    preview: paint
  };
}

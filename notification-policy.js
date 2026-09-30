// Notification preferences shared by the website and the delivery worker.
// Keep this file free of browser globals so Wrangler can bundle it too.

export const NOTIFICATION_GROUPS = [
  { id: 'notes', label: 'notes & reactions', kinds: ['note', 'reaction'] },
  { id: 'listsAdded', label: 'added to the list', kinds: ['item'] },
  { id: 'listsFinished', label: 'finished on the list', kinds: ['item-finished'] },
  // Reminders are asks with a time now, so one switch covers both.
  { id: 'asks', label: 'asks & reminders', kinds: ['help', 'help-answer', 'reminder', 'reminder-created'] },
  { id: 'arrivals', label: 'arrivals & on my way', kinds: ['arrival'] },
  { id: 'status', label: 'status & focus', kinds: ['status', 'focus'] },
  { id: 'keepsakes', label: 'date ideas & memories', kinds: ['date', 'memory'] }
];

// Switches saved before groups were merged or split keep meaning what they
// meant: asks stay off only if both old switches were off, and arrivals follow
// the old status switch they used to be part of.
function legacyCategory(categories, id) {
  if (categories[id] !== undefined) return categories[id] !== false;
  if (id === 'listsAdded' || id === 'listsFinished') return categories.lists !== false;
  if (id === 'asks') return !(categories.help === false && categories.reminders === false);
  if (id === 'arrivals') return categories.status !== false;
  return true;
}

const GROUP_FOR_KIND = Object.fromEntries(
  NOTIFICATION_GROUPS.flatMap(group => group.kinds.map(kind => [kind, group.id]))
);

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  backgroundSound: 'default',
  vibration: 'gentle',
  inAppSound: 'twinkle',
  quietHours: Object.freeze({ enabled: false, from: '22:00', to: '08:00' }),
  categories: Object.freeze(Object.fromEntries(NOTIFICATION_GROUPS.map(group => [group.id, true])))
});

export function normalizeNotificationPreferences(value = {}) {
  const saved = value?.categories || {};
  const categories = Object.fromEntries(NOTIFICATION_GROUPS.map(group => [group.id, legacyCategory(saved, group.id)]));
  const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
  const quiet = value?.quietHours || {};
  return {
    backgroundSound: value?.backgroundSound === 'silent' ? 'silent' : 'default',
    vibration: ['gentle', 'pulse', 'off'].includes(value?.vibration) ? value.vibration : 'gentle',
    inAppSound: ['twinkle', 'pop', 'off'].includes(value?.inAppSound) ? value.inAppSound : 'twinkle',
    quietHours: {
      enabled: quiet.enabled === true,
      from: validTime(quiet.from) ? quiet.from : '22:00',
      to: validTime(quiet.to) ? quiet.to : '08:00'
    },
    categories
  };
}

// Offsets are minutes east of UTC, as saved by the phone when it registers.
// The worker has no access to the phone's local clock. Moving sendAt, rather
// than swallowing a push, means the browser's userVisibleOnly rule is obeyed.
export function quietHoursEndUtc(now, quietHours, utcOffsetMinutes) {
  if (!quietHours?.enabled || !Number.isFinite(utcOffsetMinutes)) return 0;
  const toMinutes = value => { const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || ''); return match ? Number(match[1]) * 60 + Number(match[2]) : -1; };
  const from = toMinutes(quietHours.from);
  const to = toMinutes(quietHours.to);
  if (from < 0 || to < 0 || from === to) return 0;
  const utcMinute = Math.floor(now / 60000);
  const localMinute = ((utcMinute + utcOffsetMinutes) % 1440 + 1440) % 1440;
  const inside = from < to ? localMinute >= from && localMinute < to : localMinute >= from || localMinute < to;
  if (!inside) return 0;
  return (utcMinute + (to - localMinute + 1440) % 1440) * 60000;
}

export function notificationKindEnabled(kind, preferences = DEFAULT_NOTIFICATION_PREFERENCES) {
  const group = GROUP_FOR_KIND[String(kind || 'note')] || 'notes';
  return normalizeNotificationPreferences(preferences).categories[group] !== false;
}

// A timed nudge carries a reference to what it is about, so it can be dropped
// if that went away first. Old reminders carried a bare reminder id; asks with a
// time carry "help/<id>". Anything else is not ours to look up.
export function reminderSourcePath(ref) {
  const value = String(ref || '');
  const match = /^(?:(help|reminders)\/)?([A-Za-z0-9_-]{1,120})$/.exec(value);
  if (!match) return '';
  return `${match[1] || 'reminders'}/${match[2]}`;
}

// Whether the thing a timed nudge is about still wants the nudge: it exists,
// and it has not already been sorted or turned down.
export function reminderStillWanted(record) {
  if (!record) return false;
  return !['done', 'cant'].includes(record.state);
}

export function vibrationPattern(choice) {
  if (choice === 'off') return [];
  if (choice === 'pulse') return [180, 90, 180];
  return [90, 70, 90];
}

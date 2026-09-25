// Notification preferences shared by the website and the delivery worker.
// Keep this file free of browser globals so Wrangler can bundle it too.

export const NOTIFICATION_GROUPS = [
  { id: 'notes', label: 'notes & reactions', kinds: ['note', 'reaction'] },
  { id: 'lists', label: 'list updates', kinds: ['item'] },
  { id: 'reminders', label: 'reminders', kinds: ['reminder', 'reminder-created'] },
  { id: 'status', label: 'status, arrivals & focus', kinds: ['status', 'arrival', 'focus'] },
  { id: 'help', label: 'help requests', kinds: ['help', 'help-answer'] },
  { id: 'keepsakes', label: 'date ideas & memories', kinds: ['date', 'memory'] }
];

const GROUP_FOR_KIND = Object.fromEntries(
  NOTIFICATION_GROUPS.flatMap(group => group.kinds.map(kind => [kind, group.id]))
);

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  backgroundSound: 'default',
  vibration: 'gentle',
  inAppSound: 'twinkle',
  categories: Object.freeze(Object.fromEntries(NOTIFICATION_GROUPS.map(group => [group.id, true])))
});

export function normalizeNotificationPreferences(value = {}) {
  const categories = Object.fromEntries(NOTIFICATION_GROUPS.map(group => [
    group.id,
    value?.categories?.[group.id] !== false
  ]));
  return {
    backgroundSound: value?.backgroundSound === 'silent' ? 'silent' : 'default',
    vibration: ['gentle', 'pulse', 'off'].includes(value?.vibration) ? value.vibration : 'gentle',
    inAppSound: ['twinkle', 'pop', 'off'].includes(value?.inAppSound) ? value.inAppSound : 'twinkle',
    categories
  };
}

export function notificationKindEnabled(kind, preferences = DEFAULT_NOTIFICATION_PREFERENCES) {
  const group = GROUP_FOR_KIND[String(kind || 'note')] || 'notes';
  return normalizeNotificationPreferences(preferences).categories[group] !== false;
}

export function vibrationPattern(choice) {
  if (choice === 'off') return [];
  if (choice === 'pulse') return [180, 90, 180];
  return [90, 70, 90];
}

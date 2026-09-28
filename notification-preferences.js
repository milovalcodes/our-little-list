import { normalizeNotificationPreferences, notificationKindEnabled } from './notification-policy.js';

const STORAGE_KEY = 'our-little-list-notification-preferences-v1';

export function readNotificationPreferences() {
  try {
    return normalizeNotificationPreferences(JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || '{}'));
  } catch (_) {
    return normalizeNotificationPreferences();
  }
}

export function saveNotificationPreferences(value) {
  const preferences = normalizeNotificationPreferences(value);
  try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch (_) {}
  return preferences;
}

export function shouldShowNotification(kind) {
  return notificationKindEnabled(kind, readNotificationPreferences());
}

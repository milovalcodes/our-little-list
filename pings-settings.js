// Little pings: which notifications get through and how they sound. This was
// its own page next to phone check, and both showed whether notifications were
// allowed and both had a "send a test". It is a section of phone check now;
// the permission row up there is the one place that says whether pings work.

import { setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { isApplePhone } from './device-mode.js';
import { ensurePushSubscription, pushState } from './push-client.js';
import { NOTIFICATION_GROUPS, normalizeNotificationPreferences, vibrationPattern } from './notification-policy.js';
import { readNotificationPreferences, saveNotificationPreferences } from './notification-preferences.js';

export function startPingSettings({ data, viewer, onChange = () => {} }) {
const $ = id => document.getElementById(id);
const isApple = isApplePhone();
const isAndroid = /Android/i.test(navigator.userAgent);
let preferences = readNotificationPreferences();
renderForm();

function renderForm() {
  document.querySelector(`input[name="background-sound"][value="${preferences.backgroundSound}"]`).checked = true;
  document.querySelector(`input[name="vibration"][value="${preferences.vibration}"]`).checked = true;
  $('in-app-sound').value = preferences.inAppSound;
  $('quiet-enabled').checked = preferences.quietHours.enabled;
  $('quiet-from').value = preferences.quietHours.from;
  $('quiet-to').value = preferences.quietHours.to;
  $('notification-categories').innerHTML = NOTIFICATION_GROUPS.map(group => `
    <label class="notification-toggle-row">
      <span>${group.label}</span>
      <input type="checkbox" data-category="${group.id}" ${preferences.categories[group.id] ? 'checked' : ''}>
      <i aria-hidden="true"></i>
    </label>`).join('');
  updateSoundDependencies();
  $('device-note').textContent = isApple
    ? 'iPhone picks the background sound and vibration itself. the open-app sound and ping choices still work.'
    : isAndroid
      ? 'Android should use these unless its system notification settings say otherwise.'
      : 'background alerts use this device’s notification settings.';
}


function valuesFromForm() {
  return normalizeNotificationPreferences({
    backgroundSound: document.querySelector('input[name="background-sound"]:checked')?.value,
    vibration: document.querySelector('input[name="vibration"]:checked')?.value,
    inAppSound: $('in-app-sound').value,
    quietHours: { enabled: $('quiet-enabled').checked, from: $('quiet-from').value, to: $('quiet-to').value },
    categories: Object.fromEntries([...document.querySelectorAll('[data-category]')].map(input => [input.dataset.category, input.checked]))
  });
}

function updateSoundDependencies() {
  const silent = document.querySelector('input[name="background-sound"]:checked')?.value === 'silent';
  $('vibration-fieldset').classList.toggle('is-muted', silent);
  $('vibration-fieldset').setAttribute('aria-disabled', silent ? 'true' : 'false');
}

document.querySelectorAll('input[name="background-sound"]').forEach(input => input.addEventListener('change', updateSoundDependencies));
$('in-app-sound').addEventListener('change', () => window.playLittleSound?.($('in-app-sound').value));

// Switches save the moment they change, like the phone's own Settings. The
// old "save it" button looked optional, and leaving the page dropped the change.
// Every choice is kept on this phone at once; the copy filed beside the push
// registration (so the sender can respect it) is refreshed shortly after.
let autoSave = null;
let savedNote = null;
$('notification-settings-form').addEventListener('change', () => {
  preferences = saveNotificationPreferences(valuesFromForm());
  window.clearTimeout(autoSave);
  autoSave = window.setTimeout(() => $('notification-settings-form').requestSubmit(), 600);
});

$('notification-settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  window.clearTimeout(autoSave);
  window.clearTimeout(savedNote);
  const button = $('save-notifications');
  setButtonBusy(button, true, 'saving…');
  $('save-state').textContent = 'saving…';
  preferences = saveNotificationPreferences(valuesFromForm());
  try {
    const state = await pushState();
    if (state === 'ready' || state === 'needs-subscribe') {
      const result = await ensurePushSubscription(data, viewer);
      if (result.state === 'failed') throw result.problem || new Error('registration failed');
    }
    $('save-state').textContent = 'saved ✓';
    savedNote = window.setTimeout(() => { $('save-state').textContent = 'changes save by themselves'; }, 2500);
  } catch (_) {
    showFailure('those settings stayed on this phone only.', 'check the internet, then save once more.');
  } finally {
    setButtonBusy(button, false);
    onChange();
  }
});

$('test-notification').addEventListener('click', async event => {
  const button = event.currentTarget;
  preferences = saveNotificationPreferences(valuesFromForm());
  setButtonBusy(button, true, 'sending…');
  try {
    let state = await pushState();
    if (state === 'needs-permission') {
      await Notification.requestPermission();
      state = await pushState();
    }
    if (state === 'ready' || state === 'needs-subscribe') {
      const result = await ensurePushSubscription(data, viewer);
      if (result.state === 'failed') throw result.problem || new Error('registration failed');
    }
    // An iPhone that has not been added to the Home Screen has no Notification
    // at all, and touching it threw instead of pointing the way.
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      // The row that fixes this is right above on the same page now.
      document.getElementById('notification-symbol')?.closest('.status-row')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast('allow notifications first ↑');
      return;
    }
    window.playLittleSound?.(preferences.inAppSound);
    const registration = await navigator.serviceWorker.ready;
    const silent = preferences.backgroundSound === 'silent';
    const artwork = globalThis.LittleSeasonAssets.forSeason(globalThis.LittleSeasonAssets.seasonForDate());
    const options = {
      body: silent ? 'quiet mode. very sneaky.' : 'the sun and moon have entered the notification bar.',
      icon: './' + artwork.notification,
      badge: './' + artwork.badge,
      silent,
      tag: 'our-little-list-settings-test',
      renotify: true,
      data: { url: new URL('./phone-check.html#pings', location.href).href }
    };
    // Chrome throws on a silent notification that names any vibration pattern,
    // even an empty one — so testing quiet mode always "failed".
    if (!silent) options.vibrate = vibrationPattern(preferences.vibration);
    await registration.showNotification('tiny ping check ✦', options);
  } catch (_) {
    showFailure('the test ping did not happen.', 'check Settings, Focus mode, and this app’s notification settings.');
  } finally {
    setButtonBusy(button, false);
    onChange();
  }
});
}

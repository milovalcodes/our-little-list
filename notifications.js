import { sharedLayer, onAuthChange } from './data-hub.js';
import { awaitViewer, showNotAMember } from './viewer.js';
import { setupAuthUI, applyViewerTheme, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { ensurePushSubscription, pushState } from './push-client.js';
import { NOTIFICATION_GROUPS, normalizeNotificationPreferences, vibrationPattern } from './notification-policy.js';
import { readNotificationPreferences, saveNotificationPreferences } from './notification-preferences.js';

const $ = id => document.getElementById(id);
const isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
let preferences = readNotificationPreferences();

const data = await sharedLayer();
onAuthChange(user => setupAuthUI(data, user));
if (data.mode === 'local') setupAuthUI(data, { local: true });
const viewer = await awaitViewer();
if (!viewer) { showNotAMember(); await new Promise(() => {}); }
applyViewerTheme(viewer);
document.querySelector('.back-to-side').href = `${viewer}.html`;

renderForm();
void renderPermission();

function renderForm() {
  document.querySelector(`input[name="background-sound"][value="${preferences.backgroundSound}"]`).checked = true;
  document.querySelector(`input[name="vibration"][value="${preferences.vibration}"]`).checked = true;
  $('in-app-sound').value = preferences.inAppSound;
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

async function renderPermission() {
  const state = await pushState();
  const ready = state === 'ready';
  $('permission-dot').classList.toggle('is-ready', ready);
  $('permission-copy').textContent = ready ? 'background pings are on' : state === 'blocked' ? 'notifications are blocked on this phone' : 'finish setup in phone check';
}

function valuesFromForm() {
  return normalizeNotificationPreferences({
    backgroundSound: document.querySelector('input[name="background-sound"]:checked')?.value,
    vibration: document.querySelector('input[name="vibration"]:checked')?.value,
    inAppSound: $('in-app-sound').value,
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

$('notification-settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('save-notifications');
  setButtonBusy(button, true, 'saving…');
  preferences = saveNotificationPreferences(valuesFromForm());
  try {
    const state = await pushState();
    if (state === 'ready' || state === 'needs-subscribe') {
      const result = await ensurePushSubscription(data, viewer);
      if (result.state === 'failed') throw result.problem || new Error('registration failed');
    }
    $('save-state').textContent = 'saved ✓';
    window.setTimeout(() => { $('save-state').textContent = ''; }, 3500);
    toast('phone lore updated');
  } catch (_) {
    showFailure('those settings stayed on this phone only.', 'check the internet, then save once more.');
  } finally {
    setButtonBusy(button, false);
    void renderPermission();
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
    if (Notification.permission !== 'granted') {
      location.href = `phone-check.html`;
      return;
    }
    window.playLittleSound?.(preferences.inAppSound);
    const registration = await navigator.serviceWorker.ready;
    const silent = preferences.backgroundSound === 'silent';
    await registration.showNotification('tiny ping check ✦', {
      body: silent ? 'quiet mode. very sneaky.' : 'the sun and moon have entered the notification bar.',
      icon: './notification-icon.png',
      badge: './notification-badge.png',
      silent,
      vibrate: silent ? [] : vibrationPattern(preferences.vibration),
      tag: 'our-little-list-settings-test',
      renotify: true,
      data: { url: new URL('./notifications.html', location.href).href }
    });
  } catch (_) {
    showFailure('the test ping did not happen.', 'check phone check, Focus mode, and this app’s notification settings.');
  } finally {
    setButtonBusy(button, false);
    void renderPermission();
  }
});

import { sharedLayer } from './data-hub.js';
import { awaitViewer } from './viewer.js';
import { locationSnapshot } from './auto-location.js';
import { PLACE_PRESETS, placeDisplay, arrivalMessage, announcesArrival } from './place-presets.js';
import { personName } from './profile-store.js';
import { escapeHtml, setButtonBusy, showFailure, toast } from './ui-helpers.js';
import { deleteWithUndo, isPendingDelete } from './undo-delete.js';

const root = document.getElementById('saved-places');
if (root) void boot();

async function boot() {
  const data = await sharedLayer();
  const viewer = await awaitViewer();
  if (!viewer) return;
  let places = [];
  let preset = 'home';

  const label = document.getElementById('place-label');
  const customStatus = document.getElementById('place-status');
  const customWrap = document.getElementById('place-status-wrap');
  const preview = document.getElementById('place-preview');

  const selectPreset = value => {
    preset = PLACE_PRESETS[value] ? value : 'custom';
    document.querySelectorAll('[data-place-preset]').forEach(button => button.classList.toggle('active', button.dataset.placePreset === preset));
    const info = PLACE_PRESETS[preset];
    customWrap.hidden = preset !== 'custom';
    if (!label.value.trim() || Object.values(PLACE_PRESETS).some(item => item.label === label.value.trim())) label.value = info.label;
    paintPreview();
  };

  const paintPreview = () => {
    const info = placeDisplay({ preset, label:label.value, statusText:customStatus.value });
    preview.className = `place-preview place-${info.animation}`;
    const ping = arrivalMessage({ preset, label:label.value, statusText:customStatus.value }, personName(viewer)).title;
    const pinging = document.getElementById('place-notify').checked;
    preview.innerHTML = `<span>${escapeHtml(info.emoji)}</span><div><small>automatic status</small><strong>${escapeHtml(info.status)}</strong><small>${pinging ? `they get: “${escapeHtml(ping)}”` : 'no ping when you arrive'}</small></div>`;
  };

  document.getElementById('place-presets').addEventListener('click', event => {
    const button = event.target.closest('[data-place-preset]');
    if (button) selectPreset(button.dataset.placePreset);
  });
  label.addEventListener('input', paintPreview);
  document.getElementById('place-notify').addEventListener('change', paintPreview);
  customStatus.addEventListener('input', paintPreview);

  data.listenTo('places', items => {
    places = items.filter(item => item.person === viewer).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    renderPlaces();
  });

  document.getElementById('saved-place-form').addEventListener('submit', async event => {
    event.preventDefault();
    // Held before the await: event.currentTarget is null once the write comes
    // back, and reset() on it threw after the spot had saved — so saving a
    // spot always ended in "that spot did not save".
    const form = event.currentTarget;
    const point = locationSnapshot();
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || !['live', 'starting'].includes(point.phase)) {
      showFailure('this phone does not have a fresh spot yet.', 'turn location on, wait for the green dot, then try again.');
      return;
    }
    const display = placeDisplay({ preset, label:label.value, statusText:customStatus.value });
    if (!display.label) { label.focus(); return; }
    const button = document.getElementById('place-save');
    setButtonBusy(button, true, 'saving here…');
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : `${viewer}-${Date.now()}`;
      await data.setTo('places', id, {
        person:viewer, label:display.label, preset, statusText:display.status, emoji:display.emoji,
        animation:display.animation, lat:point.lat, lng:point.lng,
        radius:Number(document.getElementById('place-radius').value) || 150,
        announce:document.getElementById('place-notify').checked,
        createdAt:Date.now(), updatedAt:Date.now()
      });
      toast(`${display.label} saved`);
      form.reset();
      document.getElementById('place-notify').checked = true;
      customStatus.value = '';
      selectPreset('home');
    } catch (_) { showFailure('that spot did not save.', 'check the internet and try again while you are still there.'); }
    finally { setButtonBusy(button, false); }
  });

  document.getElementById('saved-place-list').addEventListener('click', async event => {
    const bell = event.target.closest('[data-toggle-ping]');
    if (bell) {
      const place = places.find(item => item.id === bell.dataset.togglePing);
      if (!place) return;
      bell.disabled = true;
      try { await data.updateIn('places', place.id, { announce: !announcesArrival(place), updatedAt: Date.now() }); toast(announcesArrival(place) ? 'no more arrival pings here' : 'they will get a ping when you arrive'); }
      catch (_) { showFailure('that did not change.', 'check the internet and try again.'); bell.disabled = false; }
      return;
    }
    const button = event.target.closest('[data-delete-place]');
    if (!button) return;
    deleteWithUndo(data, 'places', button.dataset.deletePlace, { label: 'saved spot removed', onChange: renderPlaces });
  });

  function renderPlaces() {
    const list = document.getElementById('saved-place-list');
    const shown = places.filter(place => !isPendingDelete('places', place.id));
    document.getElementById('saved-place-empty').hidden = shown.length > 0;
    list.innerHTML = shown.map(place => {
      const display = placeDisplay(place);
      return `<article class="saved-place-row place-${escapeHtml(display.animation)}"><span>${escapeHtml(display.emoji)}</span><div><strong>${escapeHtml(display.label)}</strong><small>${escapeHtml(display.status)} · ${Number(place.radius) || 150} m</small></div><button type="button" data-toggle-ping="${escapeHtml(place.id)}" aria-label="${announcesArrival(place) ? 'Stop arrival pings for' : 'Send arrival pings for'} ${escapeHtml(display.label)}" aria-pressed="${announcesArrival(place)}">${announcesArrival(place) ? '🔔' : '🔕'}</button><button type="button" data-delete-place="${escapeHtml(place.id)}" aria-label="Delete ${escapeHtml(display.label)}">×</button></article>`;
    }).join('');
  }

  selectPreset('home');
}

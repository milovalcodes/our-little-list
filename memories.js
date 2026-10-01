import { escapeHtml, toast, setButtonBusy, showFailure } from './ui-helpers.js';
import { bootPage } from './page-boot.js';
import { personName } from './profile-store.js';
import { timeAgo } from './time-format.js';
import { deleteWithUndo, isPendingDelete } from './undo-delete.js';

const $ = id => document.getElementById(id);
let memories = [];
let photo = null;
let photoPending = Promise.resolve();
let featuredId = '';
let migrating = false;
const fullPhotos = new Map();
const loadingPhotos = new Set();

const { data, viewer, other } = await bootPage();

data.listenTo('memories', items => {
  memories = items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  render();
  void migrateOldPhotos();
});

$('memory-photo').addEventListener('change', event => {
  const file = event.target.files?.[0];
  photo = null;
  $('photo-name').textContent = '';
  if (!file) return;
  $('photo-name').textContent = 'shrinking…';
  photoPending = makePhotoPair(file).then(result => {
    photo = result;
    $('photo-name').textContent = file.name;
  }).catch(() => {
    photo = null;
    event.target.value = '';
    $('photo-name').textContent = '';
    showFailure('that photo is too mighty.', 'try a smaller photo or a screenshot.');
  });
});

$('memory-form').addEventListener('submit', async event => {
  event.preventDefault();
  const text = $('memory-text').value.trim();
  const button = $('memory-save');
  setButtonBusy(button, true, 'jarring…');
  await photoPending;
  try {
    const createdAt = Date.now();
    const saved = await data.addTo('memories', {
      text, thumb: photo?.thumb || '', hasPhoto: false, addedBy: viewer, createdAt
    });
    if (photo) {
      try {
        await data.setTo('memoryPhotos', saved.id, { photo: photo.full, addedBy: viewer, createdAt });
        await data.updateIn('memories', saved.id, { hasPhoto: true });
        fullPhotos.set(saved.id, photo.full);
      } catch (_) {
        showFailure('the words saved, but the photo did not.', 'check the internet, then add it again if you want the photo.');
      }
    }
    void data.notify(other, { title: `${personName(viewer)} added to the memory jar`, body: text.slice(0, 120), url: `memories.html#memory-${saved.id}`, kind: 'memory' });
    event.target.reset();
    photo = null;
    photoPending = Promise.resolve();
    $('photo-name').textContent = '';
    toast('secured for the historians');
    document.querySelector('#sheet-memory-form [data-close-sheet]')?.click();
  } catch (_) {
    showFailure('the jar did not take it.', 'check the internet and try again.');
  } finally { setButtonBusy(button, false); }
});

$('memory-list').addEventListener('click', event => {
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) {
    const id = deleteButton.dataset.delete;
    deleteWithUndo(data, 'memories', id, {
      label: 'memory deleted', onChange: render,
      onCommitted: () => data.removeFrom('memoryPhotos', id).catch(() => {
        showFailure('the memory is gone, but its photo may still be stored.', 'try again when the internet is back.');
      })
    });
    return;
  }
  const openButton = event.target.closest('[data-open]');
  if (openButton) feature(openButton.dataset.open);
});

$('memory-pick').addEventListener('click', () => {
  const visible = visibleMemories();
  if (visible.length) feature(visible[Math.floor(Math.random() * visible.length)].id);
});

function feature(id) {
  featuredId = id;
  render();
  document.body.classList.add('memory-open');
  void loadFullPhoto(id);
}
$('memory-random').addEventListener('click', event => {
  if (event.target === event.currentTarget || event.target.closest('[data-close-memory]')) closeMemory();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && featuredId) closeMemory(); });
function closeMemory() { featuredId=''; document.body.classList.remove('memory-open'); render(); }

function visibleMemories() { return memories.filter(item => !isPendingDelete('memories', item.id)); }

function render() {
  const visible = visibleMemories();
  $('memory-empty').hidden = visible.length > 0;
  $('memory-pick').hidden = visible.length === 0;
  $('memory-list').innerHTML = visible.map(item => memoryMarkup(item)).join('');
  const featured = featuredId && visible.find(item => item.id === featuredId);
  $('memory-random').hidden = !featured;
  $('memory-random').innerHTML = featured ? `<div class="memory-full"><button type="button" data-close-memory aria-label="Close memory">×</button>${memoryMarkup(featured, true)}</div>` : '';
  if (featuredId && !featured) featuredId = '';
}

function memoryMarkup(item, featured = false) {
  const image = safePhoto(featured ? fullPhotos.get(item.id) || item.thumb || item.photo : item.thumb || item.photo);
  return `<article class="memory-card${featured ? ' featured' : ''}${image ? ' has-photo' : ' text-only'}" data-id="${escapeHtml(item.id)}">
    ${featured ? '' : `<button class="memory-open" type="button" data-open="${escapeHtml(item.id)}" aria-label="Open memory">`}
    ${image ? `<img src="${image}" alt="">` : ''}
    <div><p>${escapeHtml(item.text || '')}</p><small>${escapeHtml(personName(item.addedBy))} · ${timeAgo(item.createdAt)}</small></div>
    ${featured ? '' : '</button>'}
    ${featured ? '' : `<button class="memory-delete" type="button" data-delete="${escapeHtml(item.id)}" aria-label="Delete memory">×</button>`}
  </article>`;
}

async function loadFullPhoto(id) {
  const item = memories.find(memory => memory.id === id);
  if (!item?.hasPhoto || fullPhotos.has(id) || loadingPhotos.has(id)) return;
  loadingPhotos.add(id);
  try {
    const record = await data.readDoc('memoryPhotos', id);
    const image = safePhoto(record?.photo);
    if (image) { fullPhotos.set(id, image); if (featuredId === id) render(); }
  } catch (_) { /* The thumbnail still works offline. */ }
  finally { loadingPhotos.delete(id); }
}

async function migrateOldPhotos() {
  if (migrating) return;
  migrating = true;
  try {
    for (const item of memories.filter(value => value.addedBy === viewer && safePhoto(value.photo))) {
      const existing = await data.readDoc('memoryPhotos', item.id);
      if (!existing) await data.setTo('memoryPhotos', item.id, { photo: item.photo, addedBy: viewer, createdAt: item.createdAt });
      const thumb = await thumbnailFromData(item.photo);
      await data.updateIn('memories', item.id, { photo: '', thumb, hasPhoto: true });
    }
  } catch (_) { /* Keep the old photo until this phone can finish moving it. */ }
  finally { migrating = false; }
}

function safePhoto(value) { return /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value || '') ? value : ''; }

async function makePhotoPair(file) {
  if (!file.type.startsWith('image/')) throw new Error('not an image');
  const bitmap = await loadPhoto(file);
  try { return { full: jpeg(bitmap, 1200, 620000, .78), thumb: jpeg(bitmap, 240, 30000, .6) }; }
  finally { bitmap.close?.(); }
}

async function thumbnailFromData(dataUrl) {
  const image = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image failed'));
    image.src = dataUrl;
  });
  return jpeg(image, 240, 30000, .6);
}

function jpeg(image, maxDimension, maxLength, startQuality) {
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = startQuality;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > maxLength && quality > .3) {
    quality -= .08;
    result = canvas.toDataURL('image/jpeg', quality);
  }
  if (result.length > maxLength) throw new Error('too large');
  return result;
}

async function loadPhoto(file) {
  if ('createImageBitmap' in window) return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image failed')); };
    image.src = url;
  });
}

window.addEventListener('littlelist:profile', render);
